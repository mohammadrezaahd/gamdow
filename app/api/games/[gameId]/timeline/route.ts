import { gameTimeline } from "@/server/game-activity/timeline";
import { failure, json } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { requireSession } from "@/server/session";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ gameId: string }> },
) {
  try {
    const { account } = await requireSession();
    await rateLimit(`game-timeline:${account._id}`, 120, 60);
    const { gameId } = await context.params;
    const cursor = new URL(request.url).searchParams.get("cursor") || undefined;
    if (cursor && cursor.length > 18_000)
      return json(
        { error: "Invalid timeline cursor.", code: "INVALID_CURSOR" },
        400,
      );
    return json(await gameTimeline(account, gameId, cursor));
  } catch (error) {
    return failure(error);
  }
}
