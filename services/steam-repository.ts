import { apiRequest } from "./http-client";
import type { LibraryResponse } from "@/types/api";
import type {
  SteamConnection,
  SteamGameDetails,
  SteamSearchResult,
  SteamSyncResult,
} from "@/types/steam";
const post = <T>(path: string, body?: unknown) =>
  apiRequest<T>(`/api/steam/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    signal: AbortSignal.timeout(60000),
  });
export const steamRepository = {
  connection: () => apiRequest<SteamConnection>("/api/steam/connection"),
  connect: () => post<{ url: string }>("connect"),
  disconnect: () =>
    apiRequest<{ disconnected: boolean }>("/api/steam/connection", {
      method: "DELETE",
    }),
  search: (query: string, offset = 0, signal?: AbortSignal) =>
    apiRequest<SteamSearchResult>(
      `/api/steam/search?q=${encodeURIComponent(query)}&offset=${offset}`,
      { signal },
    ),
  add: (steamAppId: number, revision: number, manualGameId?: string) =>
    post<LibraryResponse & { gameId: string }>("games", {
      steamAppId,
      revision,
      manualGameId,
    }),
  unlink: (gameId: string, revision: number) =>
    post<LibraryResponse>("unlink", { gameId, revision }),
  details: (appId: number, refresh = false) =>
    refresh
      ? post<SteamGameDetails>(`games/${appId}`)
      : apiRequest<SteamGameDetails>(`/api/steam/games/${appId}`, {
          signal: AbortSignal.timeout(60000),
        }),
  startSync: () => post<SteamSyncResult>("sync", { action: "start" }),
  continueSync: (jobId: string) =>
    post<SteamSyncResult>("sync", { action: "continue", jobId }),
  cancelSync: (jobId: string) =>
    post<{ cancelled: boolean }>("sync", { action: "cancel", jobId }),
};
