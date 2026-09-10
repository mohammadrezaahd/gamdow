import { timingSafeEqual } from "node:crypto";
import { failure, json, HttpError } from "@/server/http";
import { syncCatalogPage } from "@/server/steam/catalog";
export const runtime = "nodejs";
export const maxDuration = 60;
/** Callable by a scheduler or the bounded bootstrap script; never by ordinary clients. */
export async function POST(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    const received = request.headers.get("authorization") || "";
    const expected = `Bearer ${secret}`;
    if (
      !secret ||
      Buffer.byteLength(received) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(received), Buffer.from(expected))
    )
      throw new HttpError(401, "Unauthorized scheduler.", "UNAUTHENTICATED");
    const { cleanupStorage } = await import("@/server/storage/cleanup");
    const [catalog, storage] = await Promise.allSettled([
      syncCatalogPage(),
      cleanupStorage(),
    ]);
    if (catalog.status === "rejected") throw catalog.reason;
    return json({
      ...catalog.value,
      storage:
        storage.status === "fulfilled" ? storage.value : { deferred: true },
    });
  } catch (e) {
    return failure(e);
  }
}
export const GET = POST;
