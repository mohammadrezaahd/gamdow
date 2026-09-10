import { z } from "zod";
import { requireSession } from "@/server/session";
import { importFile } from "@/server/storage/backup";
import { json, failure, sameOrigin, readBytes } from "@/server/http";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; mediaId: string }> },
) {
  try {
    sameOrigin(request);
    const { account } = await requireSession();
    const { id, mediaId } = z
      .object({ id: z.string().uuid(), mediaId: z.string().uuid() })
      .parse(await context.params);
    return json(
      await importFile(
        account._id,
        id,
        mediaId,
        await readBytes(request, 3 * 1024 * 1024),
      ),
    );
  } catch (e) {
    return failure(e);
  }
}
