import "server-only";
import { randomUUID } from "node:crypto";
import { database } from "../database";
import { HttpError } from "../http";
import { libraryView, commitLibrary } from "../library-storage";
import { withSteamLock } from "./locks";
import { newSteamGame, ownedGames } from "./library";
import { getSteamMetadata } from "./metadata";
import { publicJob } from "./connection";
import type { SteamJobDocument, SteamConnectionDocument } from "./models";
import { fresh } from "./client";
async function connected(userId: string): Promise<SteamConnectionDocument> {
  const c = await (await database()).steamConnections.findOne({ _id: userId });
  if (!c)
    throw new HttpError(
      409,
      "Connect your Steam account first.",
      "STEAM_NOT_CONNECTED",
    );
  return c;
}
export async function startLibrarySync(userId: string) {
  return withSteamLock(`user:${userId}`, async () => {
    const db = await database();
    const c = await connected(userId);
    const previous = await db.steamJobs.findOne({
      _id: userId,
      generation: c.generation,
    });
    if (previous && ["pending", "running"].includes(previous.status))
      return publicJob(previous);
    if (fresh(c.lastLibrarySyncAt, 1 / 12))
      throw new HttpError(
        429,
        "Your Steam library was synced recently. Please wait five minutes before starting another sync.",
        "STEAM_COOLDOWN",
      );
    const games = await ownedGames(c.steamId);
    const account = await db.accounts.findOne({ _id: userId });
    if (!account)
      throw new HttpError(401, "Please log in again.", "UNAUTHENTICATED");
    const initialAppIds = (await libraryView(account)).games.flatMap((g) =>
      g.steamAppId ? [g.steamAppId] : [],
    );
    const job: SteamJobDocument = {
      _id: userId,
      generation: c.generation,
      id: randomUUID(),
      status: games.length ? "pending" : "completed",
      total: games.length,
      processed: 0,
      added: 0,
      existing: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      startedAt: new Date().toISOString(),
      remaining: games,
      initialAppIds,
    };
    if (!games.length) job.completedAt = job.startedAt;
    await db.steamJobs.replaceOne({ _id: userId }, job, { upsert: true });
    if (!games.length)
      await db.steamConnections.updateOne(
        { _id: userId, generation: c.generation },
        { $set: { lastLibrarySyncAt: job.startedAt } },
      );
    return publicJob(job);
  });
}
/** Sequential client-driven pages persist across Vercel invocations; no background work after response. */
export async function continueLibrarySync(userId: string, jobId: string) {
  return withSteamLock(`user:${userId}`, async () => {
    const db = await database();
    const c = await connected(userId);
    const job = await db.steamJobs.findOne({
      _id: userId,
      id: jobId,
      generation: c.generation,
    });
    if (!job) throw new HttpError(404, "Sync job not found.", "NOT_FOUND");
    if (["completed", "cancelled"].includes(job.status)) return publicJob(job);
    const account = await db.accounts.findOne({ _id: userId });
    if (!account)
      throw new HttpError(401, "Please log in again.", "UNAUTHENTICATED");
    const snapshot = await libraryView(account);
    const existing = new Map(
      snapshot.games.filter((g) => g.steamAppId).map((g) => [g.steamAppId!, g]),
    );
    let consumed = 0,
      detailRequests = 0,
      addedToArchive = false;
    const start = Date.now();
    for (const owned of job.remaining.slice(0, 40)) {
      if (Date.now() - start > 18000) break;
      let row = await db.catalog.findOne({ _id: owned.appid });
      // Catalog membership certifies type without fetching thousands of store detail pages.
      if (
        (!row || (!row.metadata && row.lastModified === undefined)) &&
        row?.type !== "excluded"
      ) {
        if (detailRequests >= 2) break;
        detailRequests++;
        try {
          await getSteamMetadata(owned.appid);
          row = await db.catalog.findOne({ _id: owned.appid });
        } catch (e) {
          if (e instanceof HttpError && [429, 409, 503].includes(e.status)) {
            // Pause at the current app on rate limits/outages, checkpoint earlier items, and resume later.
            if (!consumed) throw e;
            break;
          }
          if (e instanceof HttpError && e.code === "STEAM_NOT_GAME")
            job.skipped++;
          else {
            job.failed++;
            if (job.errors.length < 50)
              job.errors.push({
                steamAppId: owned.appid,
                message:
                  e instanceof HttpError
                    ? e.message
                    : "Steam metadata could not be read.",
              });
          }
          consumed++;
          continue;
        }
      }
      if (!row || row.type !== "game") {
        job.skipped++;
        consumed++;
        continue;
      }
      if (!existing.has(owned.appid)) {
        const game = newSteamGame(owned.appid, row.name);
        snapshot.games.push(game);
        existing.set(owned.appid, game);
        addedToArchive = true;
      }
      if (job.initialAppIds.includes(owned.appid)) job.existing++;
      else job.added++;
      const syncedAt = new Date().toISOString();
      // Absent playtime stays unknown: never replace it with an invented zero.
      const playtime = {
        totalMinutes: owned.playtime_forever,
        recentMinutes: owned.playtime_2weeks,
        lastPlayedAt: owned.rtime_last_played
          ? new Date(owned.rtime_last_played * 1000).toISOString()
          : undefined,
        lastSyncAt: syncedAt,
      };
      await db.steamUserGames.updateOne(
        { _id: `${c.generation}:${owned.appid}` },
        {
          $set: {
            userId,
            generation: c.generation,
            steamAppId: owned.appid,
            playtime,
          },
        },
        { upsert: true },
      );
      consumed++;
    }
    if (addedToArchive) await commitLibrary(account, snapshot); // CAS prevents overwriting edits in another tab
    job.remaining = job.remaining.slice(consumed);
    job.processed += consumed;
    job.status = job.remaining.length ? "running" : "completed";
    if (job.status === "completed") {
      job.completedAt = new Date().toISOString();
      await db.steamConnections.updateOne(
        { _id: userId, generation: c.generation },
        { $set: { lastLibrarySyncAt: job.completedAt } },
      );
    }
    await db.steamJobs.replaceOne(
      { _id: userId, id: jobId, generation: c.generation },
      job,
    );
    return publicJob(job);
  });
}
export async function cancelLibrarySync(userId: string, jobId: string) {
  return withSteamLock(`user:${userId}`, async () => {
    const db = await database();
    const c = await connected(userId);
    await db.steamJobs.updateOne(
      {
        _id: userId,
        id: jobId,
        generation: c.generation,
        status: { $in: ["pending", "running"] },
      },
      {
        $set: {
          status: "cancelled",
          remaining: [],
          completedAt: new Date().toISOString(),
        },
      },
    );
  });
}
