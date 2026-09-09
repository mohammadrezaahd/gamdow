import "server-only";
import { z } from "zod";
import { database } from "../database";
import { HttpError } from "../http";
import { isSteamImage } from "@/lib/steam-images";
import type { SteamAchievementProgress } from "@/types/steam";
import type {
  SteamConnectionDocument,
  SteamSchemaDocument,
  SteamUserGameDocument,
} from "./models";
import { fresh, steamJson, webApi, ttlHours } from "./client";
import { withSteamLock } from "./locks";
const schemaResponse = z.object({
  game: z.object({
    availableGameStats: z
      .object({
        achievements: z
          .array(
            z.object({
              name: z.string().max(500),
              displayName: z.string().max(1000).optional(),
              description: z.string().max(10000).optional(),
              icon: z.string().max(2000).optional(),
              icongray: z.string().max(2000).optional(),
              hidden: z.union([z.number(), z.boolean()]).optional(),
            }),
          )
          .max(10000)
          .optional(),
      })
      .optional(),
  }),
});
async function achievementSchema(appId: number): Promise<SteamSchemaDocument> {
  const db = await database();
  const cached = await db.steamSchemas.findOne({ _id: appId });
  if (cached && fresh(cached.lastSyncAt, 168)) return cached;
  try {
    return await withSteamLock(`schema:${appId}`, async () => {
      const { game } = await steamJson(
        webApi("/ISteamUserStats/GetSchemaForGame/v2/", {
          appid: appId,
          l: "english",
        }),
        schemaResponse,
      );
      const schema: SteamSchemaDocument = {
        _id: appId,
        lastSyncAt: new Date().toISOString(),
        items: (game.availableGameStats?.achievements ?? []).map((a) => ({
          apiName: a.name,
          name: a.displayName || a.name,
          description: a.description || "",
          icon:
            a.icon && isSteamImage(a.icon.replace(/^http:/, "https:"))
              ? a.icon.replace(/^http:/, "https:")
              : "",
          iconLocked:
            a.icongray && isSteamImage(a.icongray.replace(/^http:/, "https:"))
              ? a.icongray.replace(/^http:/, "https:")
              : "",
          hidden: Boolean(a.hidden),
        })),
      };
      await db.steamSchemas.replaceOne({ _id: appId }, schema, {
        upsert: true,
      });
      return schema;
    });
  } catch (e) {
    if (cached) return cached;
    throw e;
  }
}
function project(
  schema: SteamSchemaDocument | null,
  user: SteamUserGameDocument | null,
  stale = false,
  message?: string,
): SteamAchievementProgress {
  const state = user?.achievementState ?? "not_synced";
  if (
    !schema ||
    !user?.achievements ||
    state === "private" ||
    state === "unsupported"
  )
    return {
      state,
      items: [],
      message,
      lastSyncAt: user?.achievementCheckedAt,
    };
  const unlocks = new Map(user.achievements.unlocks.map((a) => [a.apiName, a]));
  const items = schema.items.map((a) => ({
    ...a,
    unlocked: unlocks.get(a.apiName)?.unlocked ?? false,
    unlockedAt: unlocks.get(a.apiName)?.unlockedAt,
  }));
  const unlocked = items.filter((a) => a.unlocked).length;
  return {
    state: "available",
    items,
    total: items.length,
    unlocked,
    percentage: items.length ? Math.round((unlocked / items.length) * 100) : 0,
    lastSyncAt: user.achievements.lastSyncAt,
    stale: stale || state === "unavailable",
    message,
  };
}
export async function getAchievements(
  c: SteamConnectionDocument,
  appId: number,
  force = false,
  throwOnThrottle = false,
): Promise<SteamAchievementProgress> {
  const db = await database();
  const id = `${c.generation}:${appId}`;
  const cached = await db.steamUserGames.findOne({ _id: id, userId: c._id });
  const oldSchema = await db.steamSchemas.findOne({ _id: appId });
  if (
    cached &&
    fresh(
      cached.achievementCheckedAt,
      force ? 1 / 12 : ttlHours("STEAM_ACHIEVEMENT_TTL_HOURS", 1),
    )
  )
    return project(
      oldSchema,
      cached,
      false,
      cached.achievementState === "private"
        ? "Steam achievements are not accessible. Check your Game Details privacy."
        : undefined,
    );
  try {
    return await withSteamLock(`achievements:${id}`, async () => {
      const schema = await achievementSchema(appId);
      const now = new Date().toISOString();
      const base = {
        userId: c._id,
        generation: c.generation,
        steamAppId: appId,
        achievementCheckedAt: now,
      };
      if (!schema.items.length) {
        await db.steamUserGames.updateOne(
          { _id: id },
          { $set: { ...base, achievementState: "unsupported" } },
          { upsert: true },
        );
        return {
          state: "unsupported",
          items: [],
          lastSyncAt: now,
          message: "Steam does not provide achievements for this game.",
        };
      }
      const { playerstats } = await steamJson(
        webApi("/ISteamUserStats/GetPlayerAchievements/v1/", {
          appid: appId,
          steamid: c.steamId,
          l: "english",
        }),
        z.object({
          playerstats: z.object({
            success: z.boolean(),
            achievements: z
              .array(
                z.object({
                  apiname: z.string().max(500),
                  achieved: z.number().int().min(0).max(1),
                  unlocktime: z
                    .number()
                    .int()
                    .nonnegative()
                    .max(253402300799)
                    .optional(),
                }),
              )
              .max(10000)
              .optional(),
          }),
        }),
      );
      if (!playerstats.success || !playerstats.achievements)
        throw new HttpError(
          403,
          "Steam achievements are unavailable for this profile/game. Game Details may be private, or the game has no user stats yet.",
          "STEAM_PRIVATE",
        );
      const achievements = {
        lastSyncAt: now,
        unlocks: playerstats.achievements.map((a) => ({
          apiName: a.apiname,
          unlocked: a.achieved === 1,
          unlockedAt:
            a.achieved && a.unlocktime
              ? new Date(a.unlocktime * 1000).toISOString()
              : undefined,
        })),
      };
      await db.steamUserGames.updateOne(
        { _id: id },
        { $set: { ...base, achievements, achievementState: "available" } },
        { upsert: true },
      );
      return project(schema, {
        _id: id,
        ...base,
        achievements,
        achievementState: "available",
      });
    });
  } catch (error) {
    if (
      throwOnThrottle &&
      error instanceof HttpError &&
      (error.status === 429 || error.code === "STEAM_BUSY")
    )
      throw error;
    if (error instanceof HttpError && error.code === "STEAM_BUSY")
      return project(
        oldSchema,
        cached,
        true,
        "An achievement refresh is already running.",
      );
    const denied =
      error instanceof HttpError &&
      ["STEAM_PRIVATE", "STEAM_ACCESS_DENIED"].includes(error.code);
    const state = denied ? ("private" as const) : ("unavailable" as const);
    await db.steamUserGames.updateOne(
      { _id: id },
      {
        $set: {
          userId: c._id,
          generation: c.generation,
          steamAppId: appId,
          achievementState: state,
          achievementCheckedAt: new Date().toISOString(),
        },
      },
      { upsert: true },
    );
    return project(
      oldSchema,
      {
        ...cached,
        _id: id,
        userId: c._id,
        generation: c.generation,
        steamAppId: appId,
        achievementState: state,
      },
      true,
      denied
        ? "Steam achievements are not accessible. Check Profile / Game Details privacy; this game may also have no user stats yet."
        : "Steam achievements could not be refreshed. Showing the last saved result when available.",
    );
  }
}
