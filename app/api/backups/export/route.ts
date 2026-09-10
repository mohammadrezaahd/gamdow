import { requireSession } from "@/server/session";
import { exportManifest } from "@/server/storage/backup";
import { json, failure } from "@/server/http";
export const runtime = "nodejs";
export async function GET() {
  try {
    const { account } = await requireSession();
    return json(await exportManifest(account));
  } catch (e) {
    return failure(e);
  }
}
