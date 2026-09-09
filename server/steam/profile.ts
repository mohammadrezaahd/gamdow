import "server-only";
import { z } from "zod";
import { database } from "../database";
import { steamJson, webApi, fresh } from "./client";
import { withSteamLock } from "./locks";
import { isSteamImage } from "@/lib/steam-images";
import type { SteamProfileStats, SteamProfileSummary } from "@/types/steam";
export async function profileStats(
  userId: string,
  offset = 0,
  refresh = false,
): Promise<SteamProfileStats> {
  return withSteamLock(`profile:${userId}`, async () => {
    const db = await database(),
      c = await db.steamConnections.findOne({ _id: userId });
    const empty: SteamProfileStats = {
      connected: !!c,
      imported: 0,
      totalMinutes: 0,
      playtimeKnown: 0,
      achievementsKnown: 0,
      totalAchievements: 0,
      unlockedAchievements: 0,
      items: [],
      hasMore: false,
    };
    if (!c) return empty;
    let profile = c.profile,
      warning: string | undefined;
    if (!profile || !fresh(profile.lastSyncAt, refresh ? 1 / 12 : 1)) {
      try {
        const { response } = await steamJson(
          webApi("/ISteamUser/GetPlayerSummaries/v2/", { steamids: c.steamId }),
          z.object({
            response: z.object({
              players: z
                .array(
                  z.object({
                    steamid: z.string(),
                    personaname: z.string().max(1000),
                    avatarfull: z.string().max(2000).optional(),
                    communityvisibilitystate: z.number().optional(),
                  }),
                )
                .max(100),
            }),
          }),
        );
        const player = response.players.find((p) => p.steamid === c.steamId);
        if (player) {
          profile = {
            steamId: c.steamId,
            name: player.personaname,
            avatar:
              player.avatarfull && isSteamImage(player.avatarfull)
                ? player.avatarfull
                : "",
            profileUrl: `https://steamcommunity.com/profiles/${c.steamId}`,
            public: player.communityvisibilitystate === 3,
            lastSyncAt: new Date().toISOString(),
          } satisfies SteamProfileSummary;
          if (profile.public) {
            try {
              const badges = await steamJson(
                webApi(
                  "/IPlayerService/GetBadges/v1/",
                  { steamid: c.steamId },
                  true,
                ),
                z.object({
                  response: z.object({
                    player_level: z.number().int().nonnegative().optional(),
                    player_xp: z.number().int().nonnegative().optional(),
                    badges: z
                      .array(z.object({ badgeid: z.number() }))
                      .max(50000)
                      .optional(),
                  }),
                }),
              );
              profile.level = badges.response.player_level;
              profile.xp = badges.response.player_xp;
              profile.badges = badges.response.badges?.length;
            } catch {
              warning = "Steam level / badges could not be refreshed.";
            }
          }
          await db.steamConnections.updateOne(
            { _id: userId, generation: c.generation },
            { $set: { profile } },
          );
        } else warning = "Steam profile information is not accessible.";
      } catch {
        warning =
          "Steam profile could not be refreshed. Showing saved information where available.";
      }
    }
    const account = await db.accounts.findOne({ _id: userId });
    const games =
      account?.snapshot.games.filter(
        (g) => g.source === "STEAM" && g.steamAppId,
      ) ?? [];
    // Aggregate in Mongo: large definition/unlock arrays never reach the browser or this response.
    const stats = await db.steamUserGames
      .aggregate<{
        steamAppId: number;
        playtime?: import("@/types/steam").SteamPlaytime;
        state?: string;
        total: number;
        unlocked: number;
        lastSyncAt?: string;
      }>([
        {
          $match: {
            userId,
            generation: c.generation,
            steamAppId: { $in: games.map((g) => g.steamAppId!) },
          },
        },
        {
          $project: {
            steamAppId: 1,
            playtime: 1,
            state: "$achievementState",
            lastSyncAt: "$achievements.lastSyncAt",
            unlockedNames: {
              $map: {
                input: {
                  $filter: {
                    input: { $ifNull: ["$achievements.unlocks", []] },
                    as: "a",
                    cond: "$$a.unlocked",
                  },
                },
                as: "a",
                in: "$$a.apiName",
              },
            },
          },
        },
        {
          $lookup: {
            from: "steam_achievement_schemas",
            localField: "steamAppId",
            foreignField: "_id",
            pipeline: [{ $project: { names: "$items.apiName" } }],
            as: "schema",
          },
        },
        {
          $set: {
            names: { $ifNull: [{ $arrayElemAt: ["$schema.names", 0] }, []] },
          },
        },
        {
          $project: {
            steamAppId: 1,
            playtime: 1,
            state: 1,
            lastSyncAt: 1,
            total: { $size: "$names" },
            unlocked: {
              $size: { $setIntersection: ["$unlockedNames", "$names"] },
            },
          },
        },
      ])
      .toArray();
    const byId = new Map(stats.map((s) => [s.steamAppId, s]));
    const slice = games.slice(offset, offset + 20);
    const metadata = await db.catalog
      .find(
        { _id: { $in: slice.map((g) => g.steamAppId!) } },
        { projection: { name: 1 } },
      )
      .toArray();
    const names = new Map(metadata.map((g) => [g._id, g.name]));
    const known = stats.filter((s) => s.state === "available");
    // Disconnect/reconnect may happen while public Steam calls are in flight.
    if (
      !(await db.steamConnections.findOne({
        _id: userId,
        generation: c.generation,
      }))
    )
      return { ...empty, connected: false };
    return {
      ...empty,
      profile,
      warning,
      lastActivitySyncAt: c.lastActivitySyncAt,
      imported: games.length,
      totalMinutes: stats.reduce(
        (sum, s) => sum + (s.playtime?.totalMinutes ?? 0),
        0,
      ),
      playtimeKnown: stats.filter((s) => s.playtime?.totalMinutes !== undefined)
        .length,
      achievementsKnown: known.length,
      totalAchievements: known.reduce((sum, s) => sum + s.total, 0),
      unlockedAchievements: known.reduce((sum, s) => sum + s.unlocked, 0),
      items: slice.map((g) => {
        const s = byId.get(g.steamAppId!);
        const available = s?.state === "available";
        return {
          steamAppId: g.steamAppId!,
          gameId: g.id,
          name: names.get(g.steamAppId!) || `Steam App ${g.steamAppId}`,
          totalMinutes: s?.playtime?.totalMinutes,
          state: s?.state || "not_synced",
          total: available ? s.total : undefined,
          unlocked: available ? s.unlocked : undefined,
          percentage:
            available && s.total
              ? Math.round((100 * s.unlocked) / s.total)
              : undefined,
          lastSyncAt: s?.lastSyncAt,
        };
      }),
      hasMore: offset + 20 < games.length,
    };
  });
}
