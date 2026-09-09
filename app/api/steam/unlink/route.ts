import { z } from "zod";
import { requireSession } from "@/server/session";
import { failure, json, sameOrigin, readJson, HttpError } from "@/server/http";
import { unlinkGame } from "@/server/steam/library";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { account } = await requireSession();
    const input = z
      .object({
        gameId: z.string().min(1).max(5000),
        revision: z.number().int().nonnegative(),
      })
      .parse(await readJson(request, 10000));
    if (input.revision !== account.revision)
      throw new HttpError(
        409,
        "Your archive changed. Reload before unlinking.",
        "REVISION_CONFLICT",
      );
    return json(await unlinkGame(account, input.gameId));
  } catch (e) {
    return failure(e);
  }
}
