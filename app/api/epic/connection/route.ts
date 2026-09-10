import { epicStatus, disconnectEpic } from "@/server/epic/connection";
import { requireSession } from "@/server/session";
import { sameOrigin, json, failure } from "@/server/http";
export const runtime = "nodejs";
export async function GET() {
  try {
    const { account } = await requireSession();
    return json(await epicStatus(account._id));
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    const { account } = await requireSession();
    await disconnectEpic(account._id);
    return json({ disconnected: true });
  } catch (e) {
    return failure(e);
  }
}
