import { apiRequest } from "./http-client";
import type {
  ActivityStatistics,
  ActivityStatisticsQuery,
} from "@/types/game-activity";

export const statisticsRepository = {
  load: (query: ActivityStatisticsQuery = {}, signal?: AbortSignal) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query))
      if (value !== undefined && value !== "") params.set(key, String(value));
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return apiRequest<ActivityStatistics>(`/api/statistics${suffix}`, { signal });
  },
};
