import { z } from "zod";
import { requireSession } from "@/server/session";
import { failure, json, sameOrigin, readJson } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import {
  startLibrarySync,
  continueLibrarySync,
  cancelLibrarySync,
} from "@/server/steam/sync";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { account } = await requireSession();
    await rateLimit(`steam-sync:${account._id}`, 120, 60);
    const input = z
      .discriminatedUnion("action", [
        z.object({ action: z.literal("start") }),
        z.object({
          action: z.enum(["continue", "cancel"]),
          jobId: z.string().uuid(),
        }),
      ])
      .parse(await readJson(request, 10000));
    if (input.action === "start")
      return json(await startLibrarySync(account._id));
    if (input.action === "cancel") {
      await cancelLibrarySync(account._id, input.jobId);
      return json({ cancelled: true });
    }
    return json(await continueLibrarySync(account._id, input.jobId));
  } catch (e) {
    return failure(e);
  }
}
