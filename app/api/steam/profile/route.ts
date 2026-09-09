import { z } from "zod";
import { requireSession } from "@/server/session";
import { failure, json, sameOrigin } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { profileStats } from "@/server/steam/profile";
export const runtime = "nodejs";
export const maxDuration = 60;
async function handle(request: Request, refresh: boolean) {
  try {
    if (refresh) sameOrigin(request);
    const { account } = await requireSession();
    await rateLimit(`steam-profile:${account._id}`, 30, 60);
    const offset = z.coerce
      .number()
      .int()
      .min(0)
      .max(50000)
      .parse(new URL(request.url).searchParams.get("offset") || 0);
    return json(await profileStats(account._id, offset, refresh));
  } catch (e) {
    return failure(e);
  }
}
export const GET = (request: Request) => handle(request, false);
export const POST = (request: Request) => handle(request, true);
