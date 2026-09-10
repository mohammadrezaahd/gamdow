import { apiRequest } from "./http-client";
import type { EpicConnection } from "@/types/epic";
export const epicRepository = {
  status: () => apiRequest<EpicConnection>("/api/epic/connection"),
  connect: () =>
    apiRequest<{ url: string }>("/api/epic/connect", { method: "POST" }),
  disconnect: () => apiRequest("/api/epic/connection", { method: "DELETE" }),
};
