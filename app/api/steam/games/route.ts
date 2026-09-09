import { z } from "zod";
import { requireSession } from "@/server/session";
import { failure, json, sameOrigin, readJson, HttpError } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { addSteamGame } from "@/server/steam/library";
import { appIdSchema } from "@/server/steam/client";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { account } = await requireSession();
    await rateLimit(`steam-add:${account._id}`, 20, 60);
    const input = z
      .object({
        steamAppId: appIdSchema,
        manualGameId: z.string().min(1).max(5000).optional(),
        revision: z.number().int().nonnegative(),
      })
      .parse(await readJson(request, 10000));
    if (input.revision !== account.revision)
      throw new HttpError(
        409,
        "Your archive changed. Reload before adding this game.",
        "REVISION_CONFLICT",
      );
    return json(
      await addSteamGame(account, input.steamAppId, input.manualGameId),
    );
  } catch (e) {
    return failure(e);
  }
}
