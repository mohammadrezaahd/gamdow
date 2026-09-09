import "server-only";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import type { AccountDocument } from "../database";
import { database } from "../database";
import { HttpError } from "../http";
import { libraryView, commitLibrary, metadataView } from "../library-storage";
import type { Game } from "@/types/game";
import { getSteamMetadata } from "./metadata";
import { appIdSchema, steamJson, webApi } from "./client";
import type { OwnedGame } from "./models";
export async function ownedGames(steamId: string): Promise<OwnedGame[]> {
  const { response } = await steamJson(
    webApi(
      "/IPlayerService/GetOwnedGames/v1/",
      {
        steamid: steamId,
        include_appinfo: true,
        include_played_free_games: true,
      },
      true,
    ),
    z.object({
      response: z.object({
        game_count: z.number().int().nonnegative().optional(),
        games: z
          .array(
            z.object({
              appid: appIdSchema,
              name: z.string().max(2000).optional(),
              playtime_forever: z.number().int().nonnegative().optional(),
              playtime_2weeks: z.number().int().nonnegative().optional(),
              rtime_last_played: z.number().int().nonnegative().optional(),
            }),
          )
          .max(50000)
          .optional(),
      }),
    }),
  );
  if (
    response.game_count === undefined ||
    (response.game_count > 0 && !response.games)
  )
    throw new HttpError(
      403,
      "Steam library is not accessible. Set your Steam Profile and Game Details to Public, then try again. Hidden playtime may remain unavailable.",
      "STEAM_PRIVATE",
    );
  return [...new Map((response.games ?? []).map((g) => [g.appid, g])).values()];
}
export function newSteamGame(appId: number, title: string): Game {
  return {
    id: randomUUID(),
    source: "STEAM",
    steamAppId: appId,
    title,
    tags: [],
    genres: [],
    platform: "PC",
    status: "Not started",
    plan: "None",
    favorite: false,
    description: "",
    journalEntries: [],
    coverImage: "",
    edition: "Main game",
    updatedAt: new Date().toISOString(),
  };
}
export async function addSteamGame(
  account: AccountDocument,
  appId: number,
  manualGameId?: string,
) {
  const snapshot = await libraryView(account);
  const existing = snapshot.games.find((g) => g.steamAppId === appId);
  if (existing) {
    if (manualGameId && existing.id !== manualGameId)
      throw new HttpError(
        409,
        "This Steam game is already in your library. Your manual entry was kept unchanged.",
        "STEAM_DUPLICATE",
      );
    return { snapshot, revision: account.revision, gameId: existing.id };
  }
  const manual = manualGameId
    ? snapshot.games.find((g) => g.id === manualGameId)
    : undefined;
  if (manualGameId && (!manual || manual.source === "STEAM"))
    throw new HttpError(
      400,
      "Select an existing manual game to link.",
      "INVALID_MANUAL_GAME",
    );
  const { metadata } = await getSteamMetadata(appId);
  const game = {
    ...(manual ?? newSteamGame(appId, metadata.name)),
    ...metadataView(metadata),
    source: "STEAM" as const,
    steamAppId: appId,
    updatedAt: new Date().toISOString(),
  };
  snapshot.games = manual
    ? snapshot.games.map((g) => (g.id === manual.id ? game : g))
    : [game, ...snapshot.games];
  const result = await commitLibrary(account, snapshot);
  return { ...result, gameId: game.id };
}
export async function unlinkGame(account: AccountDocument, gameId: string) {
  const snapshot = await libraryView(account);
  const game = snapshot.games.find(
    (g) => g.id === gameId && g.source === "STEAM",
  );
  if (!game)
    throw new HttpError(404, "Steam-linked game not found.", "NOT_FOUND");
  const original =
    account.snapshot.version === 2
      ? account.snapshot.games.find((g) => g.id === gameId)?.manualMetadata
      : undefined;
  snapshot.games = snapshot.games.map((g) =>
    g.id === gameId
      ? {
          ...g,
          ...(original ?? { coverImage: "", heroImage: "" }),
          source: "MANUAL",
          steamAppId: undefined,
          originalManualMetadata: undefined,
        }
      : g,
  );
  return commitLibrary(account, snapshot);
}
