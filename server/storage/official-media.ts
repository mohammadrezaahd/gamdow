import "server-only";
import { createHash } from "node:crypto";
import { database, type AccountDocument } from "../database";
import { HttpError, readBytes } from "../http";
import { getSteamMetadata } from "../steam/metadata";
import { libraryView, commitLibrary } from "../library-storage";
import { storeMedia, removeUnreferencedMedia } from "../media";
import { isSteamImage } from "@/lib/steam-images";
export async function saveOfficialImage(
  account: AccountDocument,
  input: {
    gameId: string;
    kind: "cover" | "background" | "screenshot";
    screenshotId?: number;
    revision: number;
    requestId: string;
  },
) {
  if (account.lastMutationId === input.requestId) return { saved: true };
  if (input.revision !== account.revision)
    throw new HttpError(
      409,
      "Your library changed. Reload and retry.",
      "REVISION_CONFLICT",
    );
  const snapshot = await libraryView(account),
    game = snapshot.games.find((g) => g.id === input.gameId);
  if (!game?.steamAppId || game.source !== "STEAM")
    throw new HttpError(400, "Choose a Steam-linked game.");
  const galleryId = createHash("sha256")
    .update(`${game.id}:steam:${game.steamAppId}:${input.screenshotId}`)
    .digest("hex")
    .slice(0, 32);
  if (
    (input.kind === "cover" && game.savedCoverImage) ||
    (input.kind === "background" && game.savedHeroImage) ||
    (input.kind === "screenshot" &&
      snapshot.gallery.some((p) => p.id === galleryId))
  )
    return { saved: true };
  const { metadata } = await getSteamMetadata(game.steamAppId);
  const chosen =
    input.kind === "screenshot"
      ? metadata.screenshots.find((s) => s.id === input.screenshotId)?.full
      : input.kind === "cover"
        ? metadata.images.cover
        : metadata.images.background;
  if (input.kind === "screenshot" && !chosen)
    throw new HttpError(
      400,
      "This screenshot is no longer available in the Steam catalog.",
    );
  // Never accept arbitrary URLs: only catalog-selected assets on Valve-owned HTTPS hosts.
  const candidates = [
    ...new Set(
      [
        chosen,
        ...(input.kind === "screenshot" ? [] : [metadata.images.header]),
      ].filter((s): s is string => !!s && isSteamImage(s)),
    ),
  ];
  let bytes: Uint8Array | undefined;
  for (const url of candidates) {
    try {
      const response = await fetch(url, {
        redirect: "error",
        signal: AbortSignal.timeout(12000),
        cache: "no-store",
      });
      if (!response.ok) {
        await response.body?.cancel();
        continue;
      }
      bytes = await readBytes(response, 15 * 1024 * 1024);
      break;
    } catch (e) {
      if (e instanceof HttpError) throw e;
    }
  }
  if (!bytes)
    throw new HttpError(
      502,
      "Steam artwork is temporarily unavailable. Try again later.",
      "ARTWORK_UNAVAILABLE",
    );
  const media = await storeMedia(account._id, bytes);
  try {
    if (input.kind === "cover") game.savedCoverImage = media.src;
    else if (input.kind === "background") game.savedHeroImage = media.src;
    else
      snapshot.gallery.unshift({
        id: galleryId,
        gameId: game.id,
        image: media.src,
        caption: `${game.title} · Official Steam screenshot`,
        capturedAt: new Date().toISOString().slice(0, 10),
        favorite: false,
        spoiler: true,
      });
    await commitLibrary(account, snapshot, input.requestId);
  } catch (e) {
    // An ambiguous commit response must never delete an attached file.
    const latest = await (
      await database()
    ).accounts.findOne({ _id: account._id });
    if (latest?.lastMutationId === input.requestId) return { saved: true };
    try {
      await removeUnreferencedMedia(account._id, media.id);
    } catch {
      /* Cleanup retries pending files. */
    }
    throw e;
  }
  return { saved: true };
}
