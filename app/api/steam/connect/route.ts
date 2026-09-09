import { requireSession } from "@/server/session";
import { failure, json, sameOrigin } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { beginConnection } from "@/server/steam/connection";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { account, sessionHash } = await requireSession();
    await rateLimit(`steam-connect:${account._id}`, 10, 600);
    return json(await beginConnection(account._id, sessionHash));
  } catch (e) {
    return failure(e);
  }
}
