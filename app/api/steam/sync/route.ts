import { z } from "zod";
import { appIdSchema } from "@/server/steam/client";
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
        z.object({
          action: z.literal("start"),
          mode: z.literal("sync").default("sync"),
          requestId: z.string().uuid().optional(),
        }),
        z.object({
          action: z.literal("import"),
          requestId: z.string().uuid(),
          snapshotId: z.string().uuid(),
          revision: z.number().int().nonnegative(),
          selection: z.discriminatedUnion("kind", [
            z.object({
              kind: z.literal("selected"),
              appIds: z.array(appIdSchema).min(1).max(50000),
            }),
            z.object({
              kind: z.literal("all"),
              query: z.string().trim().max(100),
              filter: z.enum(["all", "imported", "new"]),
              excludedAppIds: z.array(appIdSchema).max(50000),
            }),
          ]),
        }),
        z.object({
          action: z.enum(["continue", "cancel"]),
          jobId: z.string().uuid(),
        }),
      ])
      .parse(await readJson(request, 800000));
    if (input.action === "import")
      return json(
        await startLibrarySync(account._id, { ...input, mode: "import" }),
      );
    if (input.action === "start")
      return json(
        await startLibrarySync(
          account._id,
          input.requestId
            ? { mode: "sync", requestId: input.requestId }
            : undefined,
        ),
      );
    if (input.action === "cancel") {
      await cancelLibrarySync(account._id, input.jobId);
      return json({ cancelled: true });
    }
    return json(await continueLibrarySync(account._id, input.jobId));
  } catch (e) {
    return failure(e);
  }
}
