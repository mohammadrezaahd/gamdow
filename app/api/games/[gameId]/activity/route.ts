import { gameProgressActivity } from "@/server/game-activity/timeline";
import { failure, json } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { requireSession } from "@/server/session";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ gameId: string }> },
) {
  try {
    const { account } = await requireSession();
    await rateLimit(`game-activity:${account._id}`, 120, 60);
    const { gameId } = await context.params;
    return json(await gameProgressActivity(account, gameId));
  } catch (error) {
    return failure(error);
  }
}
