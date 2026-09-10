import "server-only";
import { steamArtwork } from "@/lib/steam-artwork";
import type { AccountDocument } from "./database";
import { database } from "./database";
import { HttpError } from "./http";
import type { Game, LibrarySnapshot } from "@/types/game";
import type {
  ManualGameMetadata,
  StoredLibrarySnapshot,
  UserGame,
} from "@/types/user-game";
import type { SteamMetadata } from "@/types/steam";
import { normalizeTaxonomies } from "@/lib/taxonomy";
export function splitGame(game: Game): UserGame {
  const {
    id,
    source = "MANUAL",
    steamAppId,
    originalManualMetadata,
    title,
    description,
    coverImage,
    heroImage,
    releaseYear,
    releaseDate,
    genres,
    ...personal
  } = game;
  return {
    id,
    source,
    steamAppId,
    personal,
    ...(source === "MANUAL"
      ? {
          manualMetadata: {
            title,
            description,
            coverImage,
            heroImage,
            releaseYear,
            releaseDate,
            genres,
          },
        }
      : originalManualMetadata
        ? { manualMetadata: originalManualMetadata }
        : {}),
  };
}
export function metadataView(metadata: SteamMetadata): ManualGameMetadata {
  return {
    title: metadata.name,
    description: metadata.description,
    coverImage: steamArtwork(metadata.steamAppId).cover,
    heroImage: steamArtwork(metadata.steamAppId).hero,
    releaseYear: metadata.release.year,
    genres: metadata.genres.map((g) => g.name),
  };
}
export function storedSnapshot(
  snapshot: LibrarySnapshot,
  previous?: AccountDocument["snapshot"],
): StoredLibrarySnapshot {
  const originals = new Map(
    previous?.version === 2
      ? previous.games.map((g) => [g.id, g.manualMetadata])
      : previous?.games.map((g) => [g.id, splitGame(g).manualMetadata]),
  );
  return {
    ...snapshot,
    version: 2,
    games: snapshot.games.map((game) => {
      const record = splitGame(game);
      if (game.source === "STEAM" && originals.get(game.id))
        record.manualMetadata = originals.get(game.id);
      return record;
    }),
  };
}
/** Archive reads only join MongoDB; they never wait for Steam. v1 remains readable. */
export async function libraryView(
  account: Pick<AccountDocument, "snapshot">,
): Promise<LibrarySnapshot> {
  const s = account.snapshot;
  if (s.version === 1)
    return {
      ...s,
      games: s.games.map((g) => ({ ...g, source: g.source ?? "MANUAL" })),
    };
  const appIds = s.games.flatMap((g) =>
    g.source === "STEAM" && g.steamAppId ? [g.steamAppId] : [],
  );
  const rows = appIds.length
    ? await (
        await database()
      ).catalog
        .find(
          { _id: { $in: appIds } },
          {
            projection: {
              _id: 1,
              name: 1,
              type: 1,
              "metadata.steamAppId": 1,
              "metadata.name": 1,
              "metadata.description": 1,
              "metadata.images": 1,
              "metadata.release": 1,
              "metadata.genres": 1,
            },
          },
        )
        .toArray()
    : [];
  const catalog = new Map(rows.map((r) => [r._id, r]));
  const games: Game[] = s.games.map((g) => {
    const row = g.steamAppId ? catalog.get(g.steamAppId) : undefined;
    const metadata =
      g.source === "STEAM" && row?.metadata
        ? metadataView(row.metadata)
        : (g.manualMetadata ?? {
            title: row?.name || `Steam app ${g.steamAppId}`,
            description: "",
            coverImage:
              row?.type === "game" ? steamArtwork(g.steamAppId!).cover : "",
            genres: [],
          });
    return {
      ...g.personal,
      ...metadata,
      id: g.id,
      source: g.source,
      steamAppId: g.steamAppId,
      ...(g.source === "STEAM" && g.manualMetadata
        ? { originalManualMetadata: g.manualMetadata }
        : {}),
    };
  });
  return normalizeTaxonomies({ ...s, version: 1, games });
}
export async function validateSteamReferences(
  snapshot: LibrarySnapshot,
  previous?: AccountDocument["snapshot"],
) {
  const retained = new Set(
    previous?.games
      .filter((g) => g.source === "STEAM")
      .map((g) => g.steamAppId),
  );
  const ids = snapshot.games
    .filter((g) => g.source === "STEAM" && !retained.has(g.steamAppId))
    .map((g) => g.steamAppId!);
  if (!ids.length) return;
  const count = await (
    await database()
  ).catalog.countDocuments({
    _id: { $in: ids },
    type: "game",
    $or: [{ metadata: { $exists: true } }, { lastModified: { $exists: true } }],
  });
  if (count !== ids.length)
    throw new HttpError(
      400,
      "Some Steam games are not in the local catalog. Add them using Steam search first.",
      "INVALID_STEAM_REFERENCE",
    );
}
export async function commitLibrary(
  account: AccountDocument,
  snapshot: LibrarySnapshot,
  mutationId?: string,
) {
  const stored = storedSnapshot(snapshot, account.snapshot);
  if (Buffer.byteLength(JSON.stringify(stored)) > 3 * 1024 * 1024)
    throw new HttpError(
      413,
      "Your archive has reached its current size limit. Export a backup before removing entries.",
      "ARCHIVE_TOO_LARGE",
    );
  const { accounts } = await database();
  const result = await accounts.updateOne(
    { _id: account._id, revision: account.revision },
    {
      $set: {
        snapshot: stored,
        ...(mutationId ? { lastMutationId: mutationId } : {}),
        ...(account.snapshot.version === 1 && !account.legacySnapshot
          ? { legacySnapshot: account.snapshot }
          : {}),
      },
      $inc: { revision: 1 },
      ...(!mutationId ? { $unset: { lastMutationId: "" as const } } : {}),
    },
  );
  if (!result.modifiedCount)
    throw new HttpError(
      409,
      "Your archive changed in another tab or device. Reload before continuing.",
      "REVISION_CONFLICT",
    );
  return { snapshot, revision: account.revision + 1 };
}
