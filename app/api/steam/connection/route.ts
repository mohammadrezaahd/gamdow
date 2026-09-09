import { requireSession } from "@/server/session";
import { failure, json, sameOrigin } from "@/server/http";
import { connectionStatus, disconnectSteam } from "@/server/steam/connection";
export const runtime = "nodejs";
export async function GET() {
  try {
    const { account } = await requireSession();
    return json(await connectionStatus(account._id));
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    const { account } = await requireSession();
    await disconnectSteam(account._id);
    return json({ disconnected: true });
  } catch (e) {
    return failure(e);
  }
}
