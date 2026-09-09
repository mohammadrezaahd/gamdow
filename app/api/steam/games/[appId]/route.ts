import { requireSession } from "@/server/session";
import { failure, json, sameOrigin } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { steamGameDetails } from "@/server/steam/game-details";
import { appIdSchema } from "@/server/steam/client";
export const runtime = "nodejs";
export const maxDuration = 60;
type Context = { params: Promise<{ appId: string }> };
async function details(context: Context, force: boolean) {
  try {
    const { account } = await requireSession();
    await rateLimit(`steam-details:${account._id}`, 20, 60);
    const id = appIdSchema.parse((await context.params).appId);
    return json(await steamGameDetails(account, id, force));
  } catch (e) {
    return failure(e);
  }
}
export async function GET(_request: Request, context: Context) {
  return details(context, false);
}
export async function POST(request: Request, context: Context) {
  try {
    sameOrigin(request);
    return details(context, true);
  } catch (e) {
    return failure(e);
  }
}
