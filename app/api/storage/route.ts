import { requireSession } from "@/server/session";
import { failure, json, sameOrigin } from "@/server/http";
import { storageUsage, withStorageLock } from "@/server/storage/service";
import { cleanupMediaUnderLock } from "@/server/media";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET() {
  try {
    const { account } = await requireSession();
    return json(await storageUsage(account._id));
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { account } = await requireSession();
    await withStorageLock(account._id, () =>
      cleanupMediaUnderLock(account._id),
    );
    return json(await storageUsage(account._id));
  } catch (e) {
    return failure(e);
  }
}
