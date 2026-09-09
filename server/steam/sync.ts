import "server-only";
import { randomUUID } from "node:crypto";
import { database } from "../database";
import { HttpError } from "../http";
import { libraryView, commitLibrary } from "../library-storage";
import { withSteamLock } from "./locks";
import { newSteamGame } from "./library";
import { getSteamMetadata } from "./metadata";
import { publicJob } from "./connection";
import { connected, ownedSnapshot, selectOwned } from "./owned-library";
import { getAchievements } from "./achievements";
import type { SteamJobDocument } from "./models";
import type { SteamSyncStart } from "@/types/steam";
import { fresh } from "./client";

export async function startLibrarySync(
  userId: string,
  input: SteamSyncStart = { mode: "sync", requestId: randomUUID() },
) {
  return withSteamLock(`user:${userId}`, async () => {
    const db = await database();
    const c = await connected(userId);
    const previous = await db.steamJobs.findOne({
      _id: userId,
      generation: c.generation,
    });
    if (previous?.requestId === input.requestId) return publicJob(previous);
    if (previous && ["pending", "running"].includes(previous.status))
      throw new HttpError(
        409,
        "A Steam job is already saved. Resume or cancel it before starting a new import.",
        "STEAM_JOB_ACTIVE",
      );
    if (input.mode === "sync" && fresh(c.lastLibrarySyncAt, 1 / 12))
      throw new HttpError(
        429,
        "Your library was synced recently. Please wait five minutes before syncing again.",
        "STEAM_COOLDOWN",
      );
    const account = await db.accounts.findOne({ _id: userId });
    if (!account)
      throw new HttpError(401, "Please log in again.", "UNAUTHENTICATED");
    const initialAppIds = account.snapshot.games.flatMap((g) =>
      g.steamAppId ? [g.steamAppId] : [],
    );
    const initial = new Set(initialAppIds);
    let games;
    if (input.mode === "import") {
      const saved = await db.steamOwnedLibraries.findOne({
        _id: userId,
        generation: c.generation,
        snapshotId: input.snapshotId,
        expiresAt: { $gt: new Date() },
      });
      if (!saved || account.revision !== input.revision)
        throw new HttpError(
          409,
          "The library preview changed or expired. Reload it and select your games again.",
          "STEAM_PREVIEW_CHANGED",
        );
      games = selectOwned(saved.games, initial, input.selection);
      if (!games.length)
        throw new HttpError(
          400,
          "Select at least one game to import.",
          "STEAM_EMPTY_SELECTION",
        );
    } else {
      // Sync never opts the user into new games. Only Import creates new associations.
      games = (await ownedSnapshot(c, true)).games.filter((g) =>
        initial.has(g.appid),
      );
    }
    const job: SteamJobDocument = {
      _id: userId,
      generation: c.generation,
      id: randomUUID(),
      requestId: input.requestId,
      mode: input.mode,
      phase: "library",
      status: games.length ? "pending" : "completed",
      total: games.length,
      processed: 0,
      added: 0,
      existing: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      achievementTotal: 0,
      achievementProcessed: 0,
      achievementSynced: 0,
      achievementUnavailable: 0,
      achievementUnsupported: 0,
      startedAt: new Date().toISOString(),
      remaining: games,
      initialAppIds,
      achievementRemaining: [],
    };
    if (!games.length) {
      job.completedAt = job.startedAt;
      job.outcome = "success";
    }
    await db.steamJobs.replaceOne({ _id: userId }, job, { upsert: true });
    return publicJob(job);
  });
}
const throttled = (e: unknown) =>
  e instanceof HttpError && (e.status === 429 || e.code === "STEAM_BUSY");
function recordFailure(
  job: SteamJobDocument,
  appId: number,
  message: string,
  stage: "library" | "achievements",
) {
  if (job.errors.length < 50)
    job.errors.push({ steamAppId: appId, message, stage });
}
/** Client-driven bounded steps: no work continues after a Vercel invocation returns. */
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
    // Optional fields allow existing saved jobs to resume without a destructive migration.
    job.achievementRemaining ??= [];
    job.achievementTotal ??= 0;
    job.achievementProcessed ??= 0;
    job.achievementSynced ??= 0;
    job.achievementUnavailable ??= 0;
    job.achievementUnsupported ??= 0;
    const initial = new Set(job.initialAppIds);
    if (job.phase === "achievements") {
      // At most one schema + one player stats request per invocation.
      const appId = job.achievementRemaining[0];
      if (appId !== undefined) {
        if (account.snapshot.games.some((g) => g.steamAppId === appId)) {
          const result = await getAchievements(c, appId, true, true);
          if (result.state === "available" && !result.stale)
            job.achievementSynced++;
          else if (result.state === "unsupported") job.achievementUnsupported++;
          else {
            job.achievementUnavailable++;
            recordFailure(
              job,
              appId,
              result.message || "Steam achievements are currently unavailable.",
              "achievements",
            );
          }
        } else {
          job.achievementUnavailable++;
          recordFailure(
            job,
            appId,
            "Game was removed from your collection; stats were not fetched.",
            "achievements",
          );
        }
        job.achievementRemaining.shift();
        job.achievementProcessed++;
      }
    } else {
      const snapshot = await libraryView(account);
      const existing = new Map(
        snapshot.games
          .filter((g) => g.steamAppId)
          .map((g) => [g.steamAppId!, g]),
      );
      let consumed = 0,
        detailRequests = 0,
        changed = false;
      const start = Date.now();
      const rows = await db.catalog
        .find(
          { _id: { $in: job.remaining.slice(0, 40).map((g) => g.appid) } },
          {
            projection: {
              _id: 1,
              name: 1,
              type: 1,
              lastModified: 1,
              "metadata.name": 1,
            },
          },
        )
        .toArray();
      const catalog = new Map(rows.map((row) => [row._id, row]));
      for (const owned of job.remaining.slice(0, 40)) {
        if (Date.now() - start > 18000) break;
        // A game deleted during a paused sync is not silently re-added.
        if (
          (job.mode === "sync" || initial.has(owned.appid)) &&
          !existing.has(owned.appid)
        ) {
          job.skipped++;
          consumed++;
          continue;
        }
        if (!existing.has(owned.appid)) {
          let row = catalog.get(owned.appid);
          // Catalog membership certifies type; full metadata is fetched lazily on game details.
          if (
            (!row || (!row.metadata && row.lastModified === undefined)) &&
            row?.type !== "excluded"
          ) {
            if (detailRequests >= 2) break;
            detailRequests++;
            try {
              await getSteamMetadata(owned.appid);
              row =
                (await db.catalog.findOne({ _id: owned.appid })) ?? undefined;
            } catch (e) {
              if (throttled(e)) {
                if (!consumed) throw e;
                break;
              }
              if (!(e instanceof HttpError)) throw e; // Database/programming failures must not be misclassified as Steam failures.
              if (e.code === "STEAM_NOT_GAME") job.skipped++;
              else {
                job.failed++;
                recordFailure(job, owned.appid, e.message, "library");
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
          const game = newSteamGame(owned.appid, row.name);
          snapshot.games.push(game);
          existing.set(owned.appid, game);
          changed = true;
        }
        if (initial.has(owned.appid)) job.existing++;
        else job.added++;
        await db.steamUserGames.updateOne(
          { _id: `${c.generation}:${owned.appid}` },
          {
            $set: {
              userId,
              generation: c.generation,
              steamAppId: owned.appid,
              playtime: {
                totalMinutes: owned.playtime_forever,
                recentMinutes: owned.playtime_2weeks,
                lastPlayedAt: owned.rtime_last_played
                  ? new Date(owned.rtime_last_played * 1000).toISOString()
                  : undefined,
                lastSyncAt: new Date().toISOString(),
              },
            },
          },
          { upsert: true },
        );
        job.achievementRemaining.push(owned.appid);
        job.achievementTotal++;
        consumed++;
      }
      if (changed) await commitLibrary(account, snapshot); // CAS preserves other-tab edits; retry is AppID-idempotent.
      job.remaining = job.remaining.slice(consumed);
      job.processed += consumed;
      if (!job.remaining.length) job.phase = "achievements";
    }
    job.status =
      job.remaining.length || job.achievementRemaining.length
        ? "running"
        : "completed";
    if (job.status === "completed") {
      job.completedAt = new Date().toISOString();
      job.outcome =
        job.failed && !job.added && !job.existing
          ? "failed"
          : job.failed || job.achievementUnavailable
            ? "partial_success"
            : "success";
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
          achievementRemaining: [],
          completedAt: new Date().toISOString(),
        },
      },
    );
  });
}
