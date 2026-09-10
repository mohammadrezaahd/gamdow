import { rateLimit } from "@/server/rate-limit";
import { z } from "zod";
import { requireSession } from "@/server/session";
import { checkout } from "@/server/storage/billing";
import { failure, json, sameOrigin, readJson } from "@/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { account } = await requireSession();
    await rateLimit(`storage-checkout:${account._id}`, 20, 3600);
    const input = z
      .object({
        packId: z.enum(["1gb", "5gb", "20gb"]),
        requestId: z.string().uuid(),
      })
      .parse(await readJson(request, 1024));
    return json(await checkout(account._id, input.packId, input.requestId));
  } catch (e) {
    return failure(e);
  }
}
