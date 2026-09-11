import { apiRequest } from "./http-client";
import type { GameTimelinePage } from "@/types/game-activity";

export const gameActivityRepository = {
  timeline: (gameId: string, cursor?: string, signal?: AbortSignal) =>
    apiRequest<GameTimelinePage>(
      `/api/games/${encodeURIComponent(gameId)}/timeline${
        cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""
      }`,
      { signal },
    ),
};
