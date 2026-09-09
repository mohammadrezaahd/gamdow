import { z } from "zod";
import { requireSession } from "@/server/session";
import { failure, json, sameOrigin } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { previewLibrary } from "@/server/steam/owned-library";
export const runtime = "nodejs";
export const maxDuration = 60;
async function handle(request: Request, refresh: boolean) {
  try {
    if (refresh) sameOrigin(request);
    const { account } = await requireSession();
    await rateLimit(`steam-preview:${account._id}`, 60, 60);
    const p = new URL(request.url).searchParams;
    const options = z
      .object({
        query: z.string().trim().max(100),
        filter: z.enum(["all", "imported", "new"]),
        offset: z.coerce.number().int().min(0).max(50000),
      })
      .parse({
        query: p.get("q") || "",
        filter: p.get("filter") || "all",
        offset: p.get("offset") || 0,
      });
    return json(await previewLibrary(account._id, options, refresh));
  } catch (e) {
    return failure(e);
  }
}
export const GET = (request: Request) => handle(request, false);
export const POST = (request: Request) => handle(request, true);
