import "server-only";
import { database } from "../database";
import { HttpError } from "../http";
import { ownedSnapshot, connected } from "./owned-library";
import { withSteamLock } from "./locks";
import { fresh } from "./client";
/** Refreshes only Steam stats, with no archive writes or new associations. */
export async function refreshActivity(userId: string) {
  return withSteamLock(`user:${userId}`, async () => {
    const db = await database(),
      c = await connected(userId);
    if (fresh(c.lastActivitySyncAt, 1 / 12))
      return { updated: 0, lastSyncAt: c.lastActivitySyncAt, cached: true };
    const snapshot = await ownedSnapshot(c, true);
    const account = await db.accounts.findOne({ _id: userId });
    if (!account)
      throw new HttpError(401, "Please log in again.", "UNAUTHENTICATED");
    const imported = new Set(
      account.snapshot.games.flatMap((g) =>
        g.steamAppId ? [g.steamAppId] : [],
      ),
    );
    const games = snapshot.games.filter((g) => imported.has(g.appid));
    for (let offset = 0; offset < games.length; offset += 500) {
      await db.steamUserGames.bulkWrite(
        games.slice(offset, offset + 500).map((g) => ({
          updateOne: {
            filter: { _id: `${c.generation}:${g.appid}` },
            upsert: true,
            update: {
              $set: {
                userId,
                generation: c.generation,
                steamAppId: g.appid,
                playtime: {
                  totalMinutes: g.playtime_forever,
                  recentMinutes: g.playtime_2weeks,
                  lastPlayedAt: g.rtime_last_played
                    ? new Date(g.rtime_last_played * 1000).toISOString()
                    : undefined,
                  lastSyncAt: snapshot.fetchedAt,
                },
              },
            },
          },
        })),
        { ordered: false },
      );
    }
    await db.steamConnections.updateOne(
      { _id: userId, generation: c.generation },
      { $set: { lastActivitySyncAt: snapshot.fetchedAt } },
    );
    return {
      updated: games.length,
      lastSyncAt: snapshot.fetchedAt,
      cached: false,
    };
  });
}
