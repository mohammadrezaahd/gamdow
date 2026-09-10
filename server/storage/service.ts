import "server-only";
import { randomUUID } from "node:crypto";
import { database, type AccountDocument } from "../database";
import { HttpError } from "../http";
import { FREE_STORAGE_BYTES } from "@/lib/storage";
import { mediaReferences } from "@/lib/library-schema";
import type { StorageUsage } from "@/types/storage";
/** Every quota reservation and reference mutation shares this cross-instance lease. */
export async function withStorageLock<T>(
  userId: string,
  operation: () => Promise<T>,
): Promise<T> {
  const { storageLocks } = await database(),
    owner = randomUUID();
  try {
    await storageLocks.updateOne(
      { _id: userId, expiresAt: { $lte: new Date() } },
      { $set: { owner, expiresAt: new Date(Date.now() + 300000) } },
      { upsert: true },
    );
  } catch (e) {
    if ((e as { code?: number }).code === 11000)
      throw new HttpError(
        409,
        "Your files are being updated. Please retry shortly.",
        "STORAGE_BUSY",
      );
    throw e;
  }
  try {
    return await operation();
  } finally {
    await storageLocks.deleteOne({ _id: userId, owner });
  }
}
export function storedMediaReferences(
  snapshot: AccountDocument["snapshot"],
): string[] {
  if (snapshot.version === 1) return mediaReferences(snapshot);
  return mediaReferences({
    ...snapshot,
    version: 1,
    games: snapshot.games.map((g) => ({
      ...g.personal,
      ...(g.manualMetadata ?? {
        title: "",
        description: "",
        coverImage: "",
        genres: [],
      }),
      id: g.id,
      source: g.source,
      steamAppId: g.steamAppId,
      originalManualMetadata: g.manualMetadata,
    })),
  });
}
export async function storageUsage(userId: string): Promise<StorageUsage> {
  const db = await database();
  const [files, grants] = await Promise.all([
    db.media
      .aggregate<{ used: number; reserved: number; count: number }>([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            used: { $sum: "$size" },
            reserved: {
              $sum: { $cond: [{ $eq: ["$state", "pending"] }, "$size", 0] },
            },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    db.storageGrants
      .aggregate<{ bytes: number }>([
        { $match: { userId } },
        { $group: { _id: null, bytes: { $sum: "$bytes" } } },
      ])
      .toArray(),
  ]);
  const usedBytes = files[0]?.used ?? 0,
    limitBytes = FREE_STORAGE_BYTES + (grants[0]?.bytes ?? 0);
  return {
    usedBytes,
    reservedBytes: files[0]?.reserved ?? 0,
    fileCount: files[0]?.count ?? 0,
    limitBytes,
    availableBytes: Math.max(0, limitBytes - usedBytes),
    freeBytes: FREE_STORAGE_BYTES,
  };
}
/** Call while holding the account storage lease; pending files count too. */
export async function ensureCapacity(userId: string, bytes: number) {
  if (!Number.isSafeInteger(bytes) || bytes < 0)
    throw new HttpError(400, "Invalid file size.");
  const usage = await storageUsage(userId);
  if (bytes > usage.availableBytes)
    throw new HttpError(
      413,
      "Not enough storage. Delete files or buy a storage pack before continuing.",
      "STORAGE_QUOTA_EXCEEDED",
    );
}
