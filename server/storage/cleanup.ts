import "server-only";
import { database } from "../database";
import { cleanupMediaUnderLock } from "../media";
import { withStorageLock } from "./service";
/** Bounded scheduler pass; account requests also drain their deletion queue. */
export async function cleanupStorage() {
  const db = await database();
  const candidates = await db.media
    .aggregate<{ _id: string }>([
      {
        $match: {
          $or: [
            { state: "deleting" },
            { deleteAfter: { $lte: new Date() } },
            {
              state: { $exists: false },
              createdAt: { $lt: new Date(Date.now() - 86400000) },
            },
          ],
        },
      },
      { $group: { _id: "$userId" } },
      { $limit: 10 },
    ])
    .toArray();
  let deleted = 0;
  for (const candidate of candidates) {
    try {
      deleted += await withStorageLock(candidate._id, () =>
        cleanupMediaUnderLock(candidate._id, 5),
      );
    } catch {
      /* Busy account or temporary storage failure: next pass retries. */
    }
  }
  return { deleted };
}
