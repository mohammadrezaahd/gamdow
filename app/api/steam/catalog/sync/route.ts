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
    return json(await syncCatalogPage());
  } catch (e) {
    return failure(e);
  }
}
export const GET = POST;
