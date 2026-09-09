import "server-only";
import { steamArtwork } from "@/lib/steam-artwork";
import { z } from "zod";
import { database } from "../database";
import { HttpError } from "../http";
import { isSteamImage } from "@/lib/steam-images";
import type { SteamMetadata } from "@/types/steam";
import { appIdSchema, fresh, steamJson, ttlHours } from "./client";
import { withSteamLock } from "./locks";
export const searchName = (name: string) =>
  name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export const searchTokens = (name: string) => [
  ...new Set(searchName(name).split(" ").filter(Boolean)),
];
const text = z.string().max(200000);
const asset = z
  .string()
  .max(2000)
  .optional()
  .transform((v) =>
    v && isSteamImage(v.replace(/^http:/, "https:"))
      ? v.replace(/^http:/, "https:")
      : "",
  );
const safeLink = (value?: string) => {
  try {
    const u = new URL(value || "");
    return u.protocol === "https:" && !u.username && !u.password
      ? u.href
      : undefined;
  } catch {
    return undefined;
  }
};
const plain = (value: string) =>
  value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
const detailsSchema = z.object({
  type: z.string(),
  steam_appid: appIdSchema,
  name: text,
  short_description: text.optional().default(""),
  detailed_description: text.optional().default(""),
  header_image: asset,
  capsule_image: asset,
  capsule_imagev5: asset,
  background: asset,
  background_raw: asset,
  screenshots: z
    .array(
      z.object({
        id: z.number().int(),
        path_thumbnail: asset,
        path_full: asset,
      }),
    )
    .max(200)
    .optional()
    .default([]),
  developers: z.array(text).max(100).optional().default([]),
  publishers: z.array(text).max(100).optional().default([]),
  genres: z
    .array(z.object({ id: z.string(), description: text }))
    .optional()
    .default([]),
  categories: z
    .array(z.object({ id: z.number().int(), description: text }))
    .optional()
    .default([]),
  platforms: z
    .object({
      windows: z.boolean().optional().default(false),
      mac: z.boolean().optional().default(false),
      linux: z.boolean().optional().default(false),
    })
    .optional(),
  release_date: z.object({ date: text, coming_soon: z.boolean() }).optional(),
  metacritic: z
    .object({ score: z.number().min(0).max(100), url: z.string().optional() })
    .optional(),
  is_free: z.boolean().optional().default(false),
  controller_support: text.optional(),
  supported_languages: text.optional().default(""),
  website: text.nullish(),
  recommendations: z.object({ total: z.number().nonnegative() }).optional(),
});
/** Storefront JSON is an undocumented Valve endpoint: isolated here, never a hard dependency for archive reads. */
export async function getSteamMetadata(
  appId: number,
  force = false,
): Promise<{ metadata: SteamMetadata; stale: boolean }> {
  appIdSchema.parse(appId);
  const db = await database();
  const cached = await db.catalog.findOne({ _id: appId });
  if (cached?.metadata)
    cached.metadata.images = {
      ...cached.metadata.images,
      cover: steamArtwork(appId).cover,
      background: steamArtwork(appId).hero,
    };
  if (cached?.type === "excluded")
    throw new HttpError(
      422,
      "This Steam app is not a game (DLC, software and videos are excluded).",
      "STEAM_NOT_GAME",
    );
  if (
    cached?.metadata &&
    fresh(
      cached.metadata.steamLastSyncAt,
      force ? 1 / 12 : ttlHours("STEAM_METADATA_TTL_HOURS", 168),
    ) &&
    (!cached.lastModified ||
      cached.lastModified * 1000 <= Date.parse(cached.metadata.steamLastSyncAt))
  )
    return { metadata: cached.metadata, stale: false };
  if (cached?.retryAfter && cached.retryAfter > new Date()) {
    if (cached.metadata) return { metadata: cached.metadata, stale: true };
    throw new HttpError(
      503,
      "Steam metadata is temporarily unavailable for this game. Try again later or add it manually.",
      "STEAM_UNAVAILABLE",
    );
  }
  try {
    return await withSteamLock(`metadata:${appId}`, async () => {
      const url = new URL("https://store.steampowered.com/api/appdetails");
      url.searchParams.set("appids", String(appId));
      url.searchParams.set("l", "english");
      url.searchParams.set("cc", "us");
      const response = await steamJson(
        url,
        z.record(
          z.string(),
          z.object({ success: z.boolean(), data: z.unknown().optional() }),
        ),
      );
      if (!response[appId]?.success)
        throw new HttpError(
          404,
          "Steam does not provide store metadata for this app. It may be delisted or unavailable in this region.",
          "STEAM_METADATA_MISSING",
        );
      const d = detailsSchema.safeParse(response[appId].data);
      if (!d.success || d.data.steam_appid !== appId)
        throw new HttpError(
          503,
          "Steam returned incomplete game metadata.",
          "STEAM_UNAVAILABLE",
        );
      const v = d.data;
      if (!plain(v.name))
        throw new HttpError(
          503,
          "Steam returned an empty game title.",
          "STEAM_UNAVAILABLE",
        );
      if (v.type !== "game") {
        await db.catalog.updateOne(
          { _id: appId },
          {
            $set: {
              type: "excluded",
              name: v.name,
              searchName: searchName(v.name),
              searchTokens: [],
            },
            $unset: { metadata: "" },
          },
          { upsert: true },
        );
        throw new HttpError(
          422,
          "This Steam app is not a game.",
          "STEAM_NOT_GAME",
        );
      }
      const year = v.release_date?.date.match(/\b(19\d{2}|20\d{2}|21\d{2})\b/);
      const metadata: SteamMetadata = {
        schemaVersion: 1,
        steamAppId: appId,
        name: plain(v.name).slice(0, 500),
        description: plain(v.short_description).slice(0, 100000),
        detailedDescription: plain(v.detailed_description).slice(0, 100000),
        images: {
          cover: steamArtwork(appId).cover,
          capsule: v.capsule_image || v.header_image,
          header: v.header_image,
          background: steamArtwork(appId).hero,
        },
        screenshots: v.screenshots
          .filter((s) => s.path_full)
          .map((s) => ({
            id: s.id,
            thumbnail: s.path_thumbnail,
            full: s.path_full,
          })),
        developers: v.developers.map(plain),
        publishers: v.publishers.map(plain),
        genres: v.genres
          .filter((g) => plain(g.description))
          .map((g) => ({
            id: g.id,
            name: plain(g.description).slice(0, 500),
          })),
        categories: v.categories.map((c) => ({
          id: c.id,
          name: plain(c.description),
        })),
        platforms: v.platforms ?? { windows: false, mac: false, linux: false },
        release: {
          date: v.release_date?.date ?? "",
          comingSoon: v.release_date?.coming_soon ?? false,
          year: year ? Number(year[1]) : undefined,
        },
        metacritic: v.metacritic
          ? { score: v.metacritic.score, url: safeLink(v.metacritic.url) }
          : undefined,
        isFree: v.is_free,
        controllerSupport: v.controller_support,
        supportedLanguages: plain(v.supported_languages),
        website: safeLink(v.website ?? undefined),
        recommendations: v.recommendations?.total,
        steamLastSyncAt: new Date().toISOString(),
      };
      await db.catalog.updateOne(
        { _id: appId },
        {
          $set: {
            type: "game",
            name: metadata.name,
            searchName: searchName(metadata.name),
            searchTokens: searchTokens(metadata.name),
            metadata,
          },
          $unset: { retryAfter: "" },
        },
        { upsert: true },
      );
      return { metadata, stale: false };
    });
  } catch (e) {
    if (e instanceof HttpError && e.code === "STEAM_NOT_GAME") throw e;
    if (!(
      e instanceof HttpError &&
      (e.code === "STEAM_BUSY" || e.status === 429)
    ))
      await db.catalog.updateOne(
        { _id: appId },
        {
          $set: { retryAfter: new Date(Date.now() + 15 * 60000) },
          $setOnInsert: {
            type: "game",
            name: `Steam app ${appId}`,
            searchName: "",
            searchTokens: [],
          },
        },
        { upsert: true },
      );
    if (cached?.metadata) return { metadata: cached.metadata, stale: true };
    throw e;
  }
}
