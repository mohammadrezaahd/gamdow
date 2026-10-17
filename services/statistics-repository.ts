import { apiRequest } from "./http-client";
import type {
  ActivityLogPage,
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
  log: (
    query: ActivityStatisticsQuery = {},
    cursor?: string,
    signal?: AbortSignal,
    limit = 50,
    includeTotal = true,
  ) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query))
      if (value !== undefined && value !== "") params.set(key, String(value));
    if (cursor) params.set("cursor", cursor);
    params.set("includeTotal", String(includeTotal));
    params.set("limit", String(limit));
    return apiRequest<ActivityLogPage>(`/api/statistics/log?${params}`, { signal });
  },
};
