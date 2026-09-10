import { rateLimit } from "@/server/rate-limit";
import { z } from "zod";
import { requireSession } from "@/server/session";
import { saveOfficialImage } from "@/server/storage/official-media";
import { failure, json, sameOrigin, readJson } from "@/server/http";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { account } = await requireSession();
    await rateLimit(`official-media:${account._id}`, 120, 3600);
    const input = z
      .object({
        gameId: z.string().min(1).max(100),
        kind: z.enum(["cover", "background", "screenshot"]),
        screenshotId: z.number().int().nonnegative().optional(),
        revision: z.number().int().nonnegative(),
        requestId: z.string().uuid(),
      })
      .parse(await readJson(request, 2048));
    return json(await saveOfficialImage(account, input));
  } catch (e) {
    return failure(e);
  }
}
