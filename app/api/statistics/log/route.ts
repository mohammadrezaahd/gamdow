import { activityLog } from "@/server/statistics";
import { failure, HttpError, json } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { requireSession } from "@/server/session";
import type { GameStatus } from "@/types/game";
import type {
  ActivityStatisticsQuery,
  GameActivitySource,
} from "@/types/game-activity";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { account } = await requireSession();
    await rateLimit(`statistics-log:${account._id}`, 120, 60);
    const params = new URL(request.url).searchParams;
    const value = (key: string) => {
      const item = params.get(key)?.trim();
      return item && item.length <= 200 ? item : undefined;
    };
    const cursor = params.get("cursor") || undefined;
    if (cursor && cursor.length > 16_384)
      throw new HttpError(400, "Invalid activity log cursor.", "INVALID_CURSOR");
    const rawLimit = value("limit");
    const rawIncludeTotal = value("includeTotal");
    const includeTotal = rawIncludeTotal !== "false";
    const parsedLimit = rawLimit === undefined ? 50 : Number(rawLimit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100)
      throw new HttpError(400, "Invalid page size.", "INVALID_LIMIT");
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
    return json(await activityLog(account, query, cursor, parsedLimit, includeTotal));
  } catch (error) {
    return failure(error);
  }
}
