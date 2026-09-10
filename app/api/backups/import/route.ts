import { rateLimit } from "@/server/rate-limit";
import { z } from "zod";
import { requireSession } from "@/server/session";
import { beginImport } from "@/server/storage/backup";
import { json, failure, sameOrigin, readJson } from "@/server/http";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { account } = await requireSession();
    await rateLimit(`backup-import:${account._id}`, 30, 3600);
    const input = z
      .object({
        manifest: z.unknown(),
        revision: z.number().int().nonnegative(),
        requestId: z.string().uuid(),
      })
      .parse(await readJson(request, 3 * 1024 * 1024 + 1024));
    return json(
      await beginImport(
        account,
        input.manifest,
        input.revision,
        input.requestId,
      ),
    );
  } catch (e) {
    return failure(e);
  }
}

export async function GET() {
  try {
    const { account } = await requireSession();
    const { database } = await import("@/server/database");
    const job = await (
      await database()
    ).backupJobs.findOne(
      {
        userId: account._id,
        status: "pending",
        expiresAt: { $gt: new Date() },
      },
      { projection: { _id: 1 } },
    );
    return json({ activeId: job?._id ?? null });
  } catch (e) {
    return failure(e);
  }
}
