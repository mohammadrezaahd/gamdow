import { beginEpicConnection } from "@/server/epic/connection";
import { requireSession } from "@/server/session";
import { sameOrigin, json, failure } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { account } = await requireSession();
    await rateLimit(`epic-connect:${account._id}`, 10, 600);
    return json(await beginEpicConnection());
  } catch (e) {
    return failure(e);
  }
}
