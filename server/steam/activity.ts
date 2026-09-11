import "server-only";
import { database } from "../database";
import { HttpError } from "../http";
import { ownedSnapshot, connected } from "./owned-library";
import { withSteamLock } from "./locks";
import { fresh } from "./client";
import { libraryView } from "../library-storage";
import { reconcileSteamPlaytime } from "./playtime-sync";

/** Refreshes provider stats and applies only high-confidence tracking signals. */
export async function refreshActivity(userId: string) {
  return withSteamLock(`user:${userId}`, async () => {
    const db = await database(),
      c = await connected(userId);
    if (fresh(c.lastActivitySyncAt, 1 / 12))
      return {
        updated: 0,
        lastSyncAt: c.lastActivitySyncAt,
        cached: true,
        archiveChanged: false,
      };
    const snapshot = await ownedSnapshot(c, true);
    const account = await db.accounts.findOne({ _id: userId });
    if (!account)
      throw new HttpError(401, "Please log in again.", "UNAUTHENTICATED");
    const library = await libraryView(account);
    const imported = new Set(
      library.games.flatMap((g) => (g.steamAppId ? [g.steamAppId] : [])),
    );
    const games = snapshot.games.filter((g) => imported.has(g.appid));
    const reconciled = await reconcileSteamPlaytime(
      account,
      library,
      c,
      games,
      {
        eventNamespace: `steam-activity:${c.generation}:${snapshot.snapshotId}`,
        observedAt: snapshot.fetchedAt,
      },
    );
    await db.steamConnections.updateOne(
      { _id: userId, generation: c.generation },
      { $set: { lastActivitySyncAt: snapshot.fetchedAt } },
    );
    return {
      updated: reconciled.updated,
      lastSyncAt: snapshot.fetchedAt,
      cached: false,
      archiveChanged: reconciled.archiveChanged,
    };
  });
}
