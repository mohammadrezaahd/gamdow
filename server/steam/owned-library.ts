import "server-only";
import { randomUUID } from "node:crypto";
import { database } from "../database";
import { HttpError } from "../http";
import { withSteamLock } from "./locks";
import { ownedGames } from "./library";
import { fresh } from "./client";
import type {
  OwnedGame,
  SteamConnectionDocument,
  SteamOwnedLibraryDocument,
} from "./models";
import type {
  SteamImportSelection,
  SteamLibraryFilter,
  SteamLibraryPage,
} from "@/types/steam";

export async function connected(
  userId: string,
): Promise<SteamConnectionDocument> {
  const c = await (await database()).steamConnections.findOne({ _id: userId });
  if (!c)
    throw new HttpError(
      409,
      "Connect your Steam account first.",
      "STEAM_NOT_CONNECTED",
    );
  return c;
}
/** Called under the user lease. Preview never creates public Games or personal associations. */
export async function ownedSnapshot(
  c: SteamConnectionDocument,
  refresh = false,
): Promise<SteamOwnedLibraryDocument> {
  const db = await database();
  const cached = await db.steamOwnedLibraries.findOne({
    _id: c._id,
    generation: c.generation,
    expiresAt: { $gt: new Date() },
  });
  if (cached && (!refresh || fresh(cached.fetchedAt, 1 / 12))) return cached;
  const games = await ownedGames(c.steamId); // A denied/private response never replaces a cache with an empty library.
  games.sort(
    (a, b) => (a.name || "").localeCompare(b.name || "") || a.appid - b.appid,
  );
  const snapshot: SteamOwnedLibraryDocument = {
    _id: c._id,
    generation: c.generation,
    snapshotId: randomUUID(),
    fetchedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000),
    games,
  };
  await db.steamOwnedLibraries.replaceOne({ _id: c._id }, snapshot, {
    upsert: true,
  });
  return snapshot;
}
const searchText = (value: string) =>
  value.normalize("NFKC").toLocaleLowerCase("en").trim();
export function filterOwned(
  games: OwnedGame[],
  imported: Set<number>,
  query: string,
  filter: SteamLibraryFilter,
) {
  const q = searchText(query);
  return games.filter(
    (g) =>
      (!q || searchText(g.name || "").includes(q) || String(g.appid) === q) &&
      (filter === "all" ||
        (filter === "imported"
          ? imported.has(g.appid)
          : !imported.has(g.appid))),
  );
}
export function selectOwned(
  games: OwnedGame[],
  imported: Set<number>,
  selection: SteamImportSelection,
) {
  const owned = new Set(games.map((g) => g.appid));
  const ids =
    selection.kind === "selected" ? selection.appIds : selection.excludedAppIds;
  if (ids.some((id) => !owned.has(id)))
    throw new HttpError(
      400,
      "Selection contains a game outside your Steam library. Refresh the preview.",
      "STEAM_INVALID_SELECTION",
    );
  const chosen = new Set(ids);
  return selection.kind === "selected"
    ? games.filter((g) => chosen.has(g.appid))
    : filterOwned(games, imported, selection.query, selection.filter).filter(
        (g) => !chosen.has(g.appid),
      );
}
export async function previewLibrary(
  userId: string,
  options: { query: string; filter: SteamLibraryFilter; offset: number },
  refresh = false,
): Promise<SteamLibraryPage> {
  return withSteamLock(`user:${userId}`, async () => {
    const db = await database();
    const c = await connected(userId);
    const cached = await ownedSnapshot(c, refresh);
    const account = await db.accounts.findOne({ _id: userId });
    if (!account)
      throw new HttpError(401, "Please log in again.", "UNAUTHENTICATED");
    const associations = new Map(
      account.snapshot.games.flatMap((g) =>
        g.steamAppId ? [[g.steamAppId, g.id] as const] : [],
      ),
    );
    const matching = filterOwned(
      cached.games,
      new Set(associations.keys()),
      options.query,
      options.filter,
    );
    const page = matching.slice(options.offset, options.offset + 40);
    const catalog = await db.catalog
      .find(
        { _id: { $in: page.map((g) => g.appid) } },
        {
          projection: {
            _id: 1,
            "metadata.images.capsule": 1,
            "metadata.images.header": 1,
          },
        },
      )
      .toArray();
    const images = new Map(
      catalog.map((g) => [
        g._id,
        g.metadata?.images.capsule || g.metadata?.images.header,
      ]),
    );
    return {
      snapshotId: cached.snapshotId,
      revision: account.revision,
      fetchedAt: cached.fetchedAt,
      stale: !fresh(cached.fetchedAt, 1 / 12),
      total: cached.games.length,
      matching: matching.length,
      offset: options.offset,
      hasMore: options.offset + page.length < matching.length,
      items: page.map((g) => ({
        steamAppId: g.appid,
        name: g.name || `Steam App ${g.appid}`,
        image:
          images.get(g.appid) ||
          (g.img_icon_url
            ? `https://cdn.steamstatic.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`
            : ""),
        totalMinutes: g.playtime_forever,
        recentMinutes: g.playtime_2weeks,
        lastPlayedAt: g.rtime_last_played
          ? new Date(g.rtime_last_played * 1000).toISOString()
          : undefined,
        imported: associations.has(g.appid),
        gameId: associations.get(g.appid),
      })),
    };
  });
}
