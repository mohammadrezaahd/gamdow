import { requireSession } from "@/server/session";
import { readMedia, removeUnreferencedMedia } from "@/server/media";
import { failure, sameOrigin, json } from "@/server/http";
export const runtime = "nodejs";
export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { account } = await requireSession();
    return await readMedia(account._id, (await context.params).id);
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(request);
    const { account } = await requireSession();
    await removeUnreferencedMedia(account._id, (await context.params).id);
    return json({ deleted: true });
  } catch (e) {
    return failure(e);
  }
}
