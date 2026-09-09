import { refreshActivity } from "@/server/steam/activity";
import { requireSession } from "@/server/session";
import { failure, json, sameOrigin } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { account } = await requireSession();
    await rateLimit(`steam-activity:${account._id}`, 20, 60);
    return json(await refreshActivity(account._id));
  } catch (e) {
    return failure(e);
  }
}
