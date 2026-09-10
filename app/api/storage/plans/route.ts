import { requireSession } from "@/server/session";
import { storagePlans } from "@/server/storage/billing";
import { failure, json } from "@/server/http";
export const runtime = "nodejs";
export async function GET() {
  try {
    await requireSession();
    return json(await storagePlans());
  } catch (e) {
    return failure(e);
  }
}
