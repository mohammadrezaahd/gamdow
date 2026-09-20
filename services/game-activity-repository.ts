import { apiRequest } from "./http-client";
import type { GameActivityEvent, GameTimelinePage } from "@/types/game-activity";

export const gameActivityRepository = {
  history: (gameId: string, signal?: AbortSignal) =>
    apiRequest<GameActivityEvent[]>(
      `/api/games/${encodeURIComponent(gameId)}/activity`,
      { signal },
    ),
  timeline: (gameId: string, cursor?: string, signal?: AbortSignal) =>
    apiRequest<GameTimelinePage>(
      `/api/games/${encodeURIComponent(gameId)}/timeline${
        cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""
      }`,
      { signal },
    ),
};
