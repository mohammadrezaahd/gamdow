import { z } from "zod";
import { requireSession } from "@/server/session";
import { cancelImport } from "@/server/storage/backup";
import { json, failure, sameOrigin } from "@/server/http";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(request);
    const { account } = await requireSession();
    await cancelImport(
      account._id,
      z
        .string()
        .uuid()
        .parse((await context.params).id),
    );
    return json({ cancelled: true });
  } catch (e) {
    return failure(e);
  }
}
