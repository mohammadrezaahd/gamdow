import { apiRequest } from "./http-client";
import type { ActivityStatistics } from "@/types/game-activity";

export const statisticsRepository = {
  load: (signal?: AbortSignal) =>
    apiRequest<ActivityStatistics>("/api/statistics", { signal }),
};
