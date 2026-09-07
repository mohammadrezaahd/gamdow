import { requireSession } from "@/server/session";
import { readMedia } from "@/server/media";
import { failure } from "@/server/http";
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
