import { z } from "zod";
import { requireSession } from "@/server/session";
import { failure, json } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { searchCatalog } from "@/server/steam/catalog";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  try {
    const { account } = await requireSession();
    await rateLimit(`steam-search:${account._id}`, 60, 60);
    const p = new URL(request.url).searchParams;
    const q = z.string().trim().min(2).max(100).parse(p.get("q"));
    const offset = z.coerce
      .number()
      .int()
      .min(0)
      .max(1000)
      .parse(p.get("offset") || 0);
    return json(await searchCatalog(q, offset));
  } catch (error) {
    return failure(error);
  }
}
