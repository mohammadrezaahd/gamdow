import "server-only";
import { fresh } from "./client";
import { withSteamLock } from "./locks";
import type { AccountDocument } from "../database";
import { database } from "../database";
import { libraryView } from "../library-storage";
import { HttpError } from "../http";
import { getSteamMetadata } from "./metadata";
import { refreshActivity } from "./activity";
import { getAchievements } from "./achievements";
import type { SteamGameDetails } from "@/types/steam";
export async function steamGameDetails(
  account: AccountDocument,
  appId: number,
  force = false,
): Promise<SteamGameDetails> {
  if (!(await libraryView(account)).games.some((g) => g.steamAppId === appId))
    throw new HttpError(
      404,
      "This Steam game is not in your library.",
      "NOT_FOUND",
    );
  let activityWarning: string | undefined;
  if (await (await database()).steamConnections.findOne({ _id: account._id })) {
    try {
      await refreshActivity(account._id);
    } catch (e) {
      activityWarning =
        e instanceof HttpError
          ? e.message
          : "Steam playtime could not be refreshed; showing saved stats.";
    }
  }
  return withSteamLock(`user:${account._id}`, async () => {
    const db = await database();
    const c = await db.steamConnections.findOne({ _id: account._id });
    const result: SteamGameDetails = {
      metadata: null,
      metadataStale: false,
      connected: !!c,
      ownership: { state: "unknown" },
      playtime: null,
      warning: activityWarning,
      achievements: {
        state: "not_synced",
        items: [],
        message: "Connect Steam in your profile to sync achievements.",
      },
    };
    try {
      const m = await getSteamMetadata(appId, force);
      result.metadata = m.metadata;
      result.metadataStale = m.stale;
    } catch (e) {
      result.warning =
        e instanceof HttpError
          ? e.message
          : "Steam metadata is unavailable. Your personal data is unchanged.";
    }
    if (c) {
      const library = await db.steamOwnedLibraries.findOne({
        _id: account._id,
        generation: c.generation,
        expiresAt: { $gt: new Date() },
      });
      if (!activityWarning && library && fresh(library.fetchedAt, 1 / 12))
        result.ownership = {
          state: library.games.some((g) => g.appid === appId)
            ? "owned"
            : "not_owned",
          checkedAt: library.fetchedAt,
        };
      const saved = await db.steamUserGames.findOne({
        _id: `${c.generation}:${appId}`,
      });
      const playedSinceCheck =
        !!saved?.playtime?.lastPlayedAt &&
        (!saved.achievementCheckedAt ||
          Date.parse(saved.playtime.lastPlayedAt) >
            Date.parse(saved.achievementCheckedAt));
      result.achievements = await getAchievements(
        c,
        appId,
        force || playedSinceCheck,
      );
      const current = await db.steamConnections.findOne({
        _id: account._id,
        generation: c.generation,
      });
      if (current)
        result.playtime =
          (
            await db.steamUserGames.findOne({
              _id: `${c.generation}:${appId}`,
              userId: account._id,
            })
          )?.playtime ?? null;
      else {
        result.connected = false;
        result.ownership = { state: "unknown" };
        result.achievements = { state: "not_synced", items: [] };
      }
    }
    return result;
  });
}
