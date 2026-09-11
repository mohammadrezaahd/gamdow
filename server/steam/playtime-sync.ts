import "server-only";
import type { AccountDocument } from "../database";
import { database } from "../database";
import { commitLibrary } from "../library-storage";
import { reconcileExternalGameActivity } from "@/lib/game-activity";
import type { LibrarySnapshot } from "@/types/game";
import type { ExternalGameActivity, GameActivityEvent } from "@/types/game-activity";
import type { OwnedGame, SteamConnectionDocument } from "./models";

interface ReconcileSteamPlaytimeOptions {
  archiveChanged?: boolean;
  eventNamespace: string;
  observedAt: string;
}

/**
 * Joins provider activity to personal Game records. Steam minutes remain in
 * steam_user_games; only tracking invariants (start date/status) enter the
 * user's archive. This is the single boundary used by imports and refreshes.
 */
export async function reconcileSteamPlaytime(
  account: AccountDocument,
  snapshot: LibrarySnapshot,
  connection: SteamConnectionDocument,
  ownedGames: OwnedGame[],
  options: ReconcileSteamPlaytimeOptions,
) {
  const db = await database();
  const appIds = ownedGames.map((game) => game.appid);
  const previousRows = appIds.length
    ? await db.steamUserGames
        .find({
          userId: account._id,
          generation: connection.generation,
          steamAppId: { $in: appIds },
        })
        .toArray()
    : [];
  const previousByAppId = new Map(
    previousRows.map((row) => [row.steamAppId, row]),
  );
  const gameByAppId = new Map(
    snapshot.games.flatMap((game) =>
      game.steamAppId ? [[game.steamAppId, game] as const] : [],
    ),
  );
  const timelineEvents: GameActivityEvent[] = [];
  let trackingChanged = false;

  const updates = ownedGames.flatMap((owned) => {
    const game = gameByAppId.get(owned.appid);
    if (!game) return [];
    const previousRow = previousByAppId.get(owned.appid);
    const previous: ExternalGameActivity | undefined = previousRow?.playtime
      ? {
          source: "STEAM",
          totalMinutes: previousRow.playtime.totalMinutes,
          recentMinutes: previousRow.playtime.recentMinutes,
          lastPlayedAt: previousRow.playtime.lastPlayedAt,
          observedAt: previousRow.playtime.lastSyncAt,
        }
      : undefined;
    const current: ExternalGameActivity = {
      source: "STEAM",
      totalMinutes: owned.playtime_forever,
      recentMinutes: owned.playtime_2weeks,
      lastPlayedAt: owned.rtime_last_played
        ? new Date(owned.rtime_last_played * 1000).toISOString()
        : undefined,
      observedAt: options.observedAt,
    };
    const result = reconcileExternalGameActivity(
      game,
      previous,
      current,
      `${options.eventNamespace}:${game.id}:activity`,
    );
    if (
      result.game.status !== game.status ||
      result.game.startedAt !== game.startedAt
    ) {
      trackingChanged = true;
      Object.assign(game, result.game);
    }
    if (result.event) timelineEvents.push(result.event);

    return [
      {
        updateOne: {
          filter: { _id: `${connection.generation}:${owned.appid}` },
          upsert: true,
          update: {
            $set: {
              userId: account._id,
              generation: connection.generation,
              steamAppId: owned.appid,
              playtime: {
                totalMinutes: owned.playtime_forever,
                recentMinutes: owned.playtime_2weeks,
                lastPlayedAt: current.lastPlayedAt,
                lastSyncAt: options.observedAt,
              },
              ...(result.suggestion
                ? { statusSuggestion: result.suggestion }
                : {}),
            },
            ...(!result.suggestion
              ? { $unset: { statusSuggestion: "" as const } }
              : {}),
          },
        },
      },
    ];
  });

  const archiveChanged =
    !!options.archiveChanged || trackingChanged || timelineEvents.length > 0;
  if (archiveChanged)
    await commitLibrary(account, snapshot, options.eventNamespace, {
      source: "STEAM",
      inferred: true,
      occurredAt: options.observedAt,
      extraEvents: timelineEvents,
    });

  for (let offset = 0; offset < updates.length; offset += 500)
    await db.steamUserGames.bulkWrite(updates.slice(offset, offset + 500), {
      ordered: false,
    });

  return {
    archiveChanged,
    updated: updates.length,
    timelineEvents: timelineEvents.length,
  };
}
