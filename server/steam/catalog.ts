import "server-only";
import { z } from "zod";
import { database } from "../database";
import { steamJson, webApi, appIdSchema } from "./client";
import { withSteamLock } from "./locks";
import { getSteamMetadata, searchName, searchTokens } from "./metadata";
import { isSteamImage } from "@/lib/steam-images";
import type { SteamSearchResult } from "@/types/steam";
const appListSchema = z.object({
  response: z.object({
    apps: z
      .array(
        z.object({
          appid: appIdSchema,
          name: z.string().max(2000),
          last_modified: z.number().int().nonnegative(),
          price_change_number: z.number().int().optional(),
        }),
      )
      .max(5000),
    have_more_results: z.boolean().optional(),
    last_appid: appIdSchema.optional(),
  }),
});
/** One bounded page per invocation. Watermark advances only after a whole pass. */
export async function syncCatalogPage() {
  return withSteamLock("catalog", async () => {
    const db = await database();
    const state = await db.steamState.findOne({ _id: "catalog" });
    const runStartedAt = state?.runStartedAt ?? Math.floor(Date.now() / 1000);
    const since = Math.max(0, (state?.watermark ?? 0) - 300); // overlap avoids boundary races
    const cursor = state?.cursor ?? 0;
    const { response } = await steamJson(
      webApi(
        "/IStoreService/GetAppList/v1/",
        {
          include_games: true,
          include_dlc: false,
          include_software: false,
          include_videos: false,
          include_hardware: false,
          if_modified_since: since,
          last_appid: cursor,
          max_results: 5000,
        },
        true,
      ),
      appListSchema,
    );
    const apps = response.apps.filter((a) => a.appid > cursor);
    if (apps.length)
      await db.catalog.bulkWrite(
        apps.map((a) => ({
          updateOne: {
            filter: { _id: a.appid },
            update: {
              $set: {
                name: a.name.slice(0, 500),
                searchName: searchName(a.name),
                searchTokens: searchTokens(a.name),
                lastModified: a.last_modified,
                priceChangeNumber: a.price_change_number,
              },
              $setOnInsert: { type: "game" as const },
            },
            upsert: true,
          },
        })),
        { ordered: false },
      );
    const next = apps.length ? Math.max(...apps.map((a) => a.appid)) : cursor;
    const more = response.have_more_results ?? response.apps.length === 5000;
    if (more && next <= cursor)
      throw new Error("Steam catalog cursor did not advance");
    await db.steamState.updateOne(
      { _id: "catalog" },
      {
        $set: more
          ? {
              cursor: next,
              runStartedAt,
              watermark: state?.watermark ?? 0,
              complete: state?.complete ?? false,
            }
          : { cursor: 0, watermark: runStartedAt, complete: true },
        ...(!more ? { $unset: { runStartedAt: "" as const } } : {}),
      },
      { upsert: true },
    );
    return {
      imported: apps.length,
      hasMore: more,
      cursor: more ? next : 0,
      initialImportComplete: !more || Boolean(state?.complete),
    };
  });
}
export async function searchCatalog(
  query: string,
  offset = 0,
): Promise<SteamSearchResult> {
  const db = await database();
  const state = await db.steamState.findOne({ _id: "catalog" });
  const q = searchName(query);
  if (/^\d+$/.test(q)) {
    const appId = appIdSchema.parse(q);
    const { metadata, stale } = await getSteamMetadata(appId);
    return {
      items: [
        {
          steamAppId: appId,
          name: metadata.name,
          image: metadata.images.cover,
          releaseYear: metadata.release.year,
          cached: true,
        },
      ],
      hasMore: false,
      catalogReady: !!state?.complete,
      warning: stale
        ? "Steam is unavailable; showing cached metadata."
        : undefined,
    };
  }
  const tokens = searchTokens(q);
  const filter =
    tokens.length > 1
      ? {
          type: "game" as const,
          searchTokens: {
            $all: [
              ...tokens.slice(0, -1),
              new RegExp(`^${tokens[tokens.length - 1]}`),
            ],
          },
        }
      : {
          type: "game" as const,
          searchTokens: {
            $regex: `^${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
          },
        };
  const rows = await db.catalog
    .find(filter, {
      projection: {
        _id: 1,
        name: 1,
        "metadata.images.cover": 1,
        "metadata.release.year": 1,
      },
    })
    .sort({ _id: 1 })
    .skip(offset)
    .limit(21)
    .maxTimeMS(2000)
    .toArray();
  if (rows.length || offset)
    return {
      items: rows.slice(0, 20).map((r) => ({
        steamAppId: r._id,
        name: r.name,
        image:
          r.metadata?.images.cover ||
          `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${r._id}/header.jpg`,
        releaseYear: r.metadata?.release.year,
        cached: !!r.metadata,
      })),
      hasMore: rows.length > 20,
      catalogReady: !!state?.complete,
    };
  // Small discovery fallback, cached by query. Store results are candidates; add always verifies type=game.
  const key = `search:${q}`;
  const cached = await db.steamState.findOne({
    _id: key,
    expiresAt: { $gt: new Date() },
  });
  if (cached?.searchResult) return cached.searchResult;
  try {
    const url = new URL("https://store.steampowered.com/api/storesearch/");
    url.searchParams.set("term", query);
    url.searchParams.set("l", "english");
    url.searchParams.set("cc", "us");
    const result = await steamJson(
      url,
      z.object({
        items: z
          .array(
            z.object({
              id: appIdSchema,
              name: z.string().max(500),
              tiny_image: z.string().max(2000).optional(),
              type: z.string().optional(),
            }),
          )
          .max(100),
      }),
    );
    const searchResult: SteamSearchResult = {
      items: result.items
        .filter((i) => !i.type || i.type === "app")
        .slice(0, 20)
        .map((i) => ({
          steamAppId: i.id,
          name: i.name,
          image: i.tiny_image && isSteamImage(i.tiny_image) ? i.tiny_image : "",
          cached: false,
        })),
      hasMore: false,
      catalogReady: !!state?.complete,
      warning:
        "Store suggestions are verified as games when added. You can also search by Steam App ID.",
    };
    await db.steamState.updateOne(
      { _id: key },
      { $set: { searchResult, expiresAt: new Date(Date.now() + 15 * 60000) } },
      { upsert: true },
    );
    return searchResult;
  } catch {
    return {
      items: [],
      hasMore: false,
      catalogReady: !!state?.complete,
      warning:
        "Steam search is unavailable. Try an App ID, retry later, or add your game manually.",
    };
  }
}
