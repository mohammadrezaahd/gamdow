import { activityStatistics } from "@/server/statistics";
import { failure, json } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { requireSession } from "@/server/session";
import type { ActivityStatisticsQuery } from "@/types/game-activity";
import type { GameStatus } from "@/types/game";
import type { GameActivitySource } from "@/types/game-activity";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { account } = await requireSession();
    await rateLimit(`statistics:${account._id}`, 60, 60);
    const params = new URL(request.url).searchParams;
    const value = (key: string) => {
      const item = params.get(key)?.trim();
      return item && item.length <= 200 ? item : undefined;
    };
    const favorite = value("favorite");
    const query: ActivityStatisticsQuery = {
      genre: value("genre"),
      platform: value("platform"),
      status: value("status") as GameStatus | undefined,
      source: value("source") as GameActivitySource | undefined,
      ...(favorite === "true" || favorite === "false"
        ? { favorite: favorite === "true" }
        : {}),
    };
    return json(await activityStatistics(account, query));
  } catch (error) {
    return failure(error);
  }
}
