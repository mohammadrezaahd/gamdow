import { activityStatistics } from "@/server/statistics";
import { failure, json } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { requireSession } from "@/server/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { account } = await requireSession();
    await rateLimit(`statistics:${account._id}`, 60, 60);
    return json(await activityStatistics(account));
  } catch (error) {
    return failure(error);
  }
}
