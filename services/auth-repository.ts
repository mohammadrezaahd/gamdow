import type { AuthRepository } from "@/types/auth";
import { apiRequest } from "./http-client";
const post = <T>(path: string, body: unknown) =>
  apiRequest<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
export const authRepository: AuthRepository = {
  login: (input) => post("/api/auth/login", input),
  register: (input) => post("/api/auth/register", input),
  logout: async () => {
    await post("/api/auth/logout", {});
  },
  getSession: () => apiRequest("/api/auth/session"),
};
