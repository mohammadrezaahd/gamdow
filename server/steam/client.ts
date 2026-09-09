import "server-only";
import { z } from "zod";
import { HttpError } from "../http";
import { rateLimit } from "../rate-limit";
export const appIdSchema = z.coerce.number().int().positive().max(4294967295);
export const steamIdSchema = z
  .string()
  .regex(/^\d{17,20}$/)
  .refine(
    (v) =>
      /^\d{17,20}$/.test(v) &&
      BigInt(v) > BigInt(0) &&
      BigInt(v) <= BigInt("18446744073709551615"),
    "Invalid Steam ID",
  );
export function steamConfigured() {
  return Boolean(process.env.STEAM_API_KEY?.trim());
}
export function steamKey() {
  const key = process.env.STEAM_API_KEY?.trim();
  if (!key)
    throw new HttpError(
      503,
      "Steam integration is not configured on this server.",
      "STEAM_NOT_CONFIGURED",
    );
  return key;
}
export function steamOrigin() {
  const value = process.env.APP_URL;
  if (!value)
    throw new HttpError(
      503,
      "Set APP_URL before connecting Steam.",
      "STEAM_NOT_CONFIGURED",
    );
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    (url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      ))
  )
    throw new HttpError(
      503,
      "APP_URL must use HTTPS (HTTP is allowed on localhost).",
      "STEAM_NOT_CONFIGURED",
    );
  return url.origin;
}
export function ttlHours(name: string, fallback: number) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 1 && n <= 720 ? n : fallback;
}
export function fresh(timestamp: string | undefined, hours: number) {
  return !!timestamp && Date.now() - Date.parse(timestamp) < hours * 3600000;
}
export const unavailable = () =>
  new HttpError(
    503,
    "Steam is temporarily unavailable. Your saved gamdow data is safe; please try again later.",
    "STEAM_UNAVAILABLE",
  );
/** Fixed destinations only; raw URLs, upstream bodies and keys are never logged or returned. */
export async function steamFetch(
  url: URL,
  init: RequestInit = {},
): Promise<Response> {
  if (
    url.protocol !== "https:" ||
    ![
      "api.steampowered.com",
      "store.steampowered.com",
      "steamcommunity.com",
    ].includes(url.hostname)
  )
    throw unavailable();
  for (let attempt = 0; attempt < 2; attempt++) {
    await rateLimit("steam:daily", 90000, 86400);
    await rateLimit(
      `steam:${url.hostname}`,
      url.hostname === "store.steampowered.com" ? 35 : 90,
      60,
    );
    try {
      const response = await fetch(url, {
        ...init,
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) return response;
      if ([401, 403].includes(response.status)) {
        await response.body?.cancel();
        throw new HttpError(
          403,
          "Steam did not make this information accessible. Check Profile / Game Details privacy and the server API key.",
          "STEAM_ACCESS_DENIED",
        );
      }
      const retry = response.status === 429 || response.status >= 500;
      const delay = Math.min(
        2000,
        Math.max(400, Number(response.headers.get("retry-after") || 0) * 1000),
      );
      await response.body?.cancel();
      if (!retry || attempt) throw unavailable();
      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if (attempt) throw unavailable();
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw unavailable();
}
export async function steamText(
  response: Response,
  max = 8 * 1024 * 1024,
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw unavailable();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        throw unavailable();
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString("utf8");
  } catch {
    throw unavailable();
  }
}
export async function steamJson<T>(url: URL, schema: z.ZodType<T>): Promise<T> {
  const response = await steamFetch(url);
  try {
    return schema.parse(JSON.parse(await steamText(response)));
  } catch {
    throw unavailable();
  }
}
export function webApi(
  path: string,
  params: Record<string, unknown>,
  service = false,
) {
  const url = new URL(path, "https://api.steampowered.com");
  url.searchParams.set("key", steamKey());
  if (service) url.searchParams.set("input_json", JSON.stringify(params));
  else
    for (const [k, v] of Object.entries(params))
      url.searchParams.set(k, String(v));
  return url;
}
