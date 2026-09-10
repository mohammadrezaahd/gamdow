import "server-only";
import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import type { BackupManifest, BackupImportSession } from "@/types/backup";
import { archiveOnly, validateBackup, restoreSnapshot } from "@/lib/backup";
import { mediaReferences } from "@/lib/library-schema";
import {
  database,
  type AccountDocument,
  type MediaDocument,
} from "../database";
import { config } from "../config";
import { HttpError } from "../http";
import {
  libraryView,
  commitLibraryUnderLock,
  validateSteamReferences,
} from "../library-storage";
import { writeMediaFile, cleanupMediaUnderLock } from "../media";
import {
  ensureCapacity,
  withStorageLock,
  storedMediaReferences,
} from "./service";
export interface BackupJob {
  _id: string;
  userId: string;
  revision: number;
  status: "pending" | "completed" | "cancelled";
  expiresAt: Date;
  purgeAt?: Date;
  manifest: BackupManifest;
  files: BackupImportSession["files"];
}
export async function exportManifest(
  account: AccountDocument,
): Promise<BackupManifest> {
  const snapshot = await libraryView(account),
    library = archiveOnly(snapshot);
  const refs = mediaReferences({
    ...snapshot,
    profile: { ...snapshot.profile, avatarImage: "" },
  });
  const files = await (
    await database()
  ).media
    .find({
      userId: account._id,
      _id: { $in: refs },
      state: { $nin: ["pending", "deleting"] },
    })
    .toArray();
  if (files.length !== refs.length)
    throw new HttpError(
      409,
      "Some images are missing. Fix or remove their references before exporting.",
      "BACKUP_MISSING_MEDIA",
    );
  const manifest: BackupManifest = {
    format: "gamdow-archive",
    version: 1,
    library,
    assets: files.map((f) => ({
      id: f._id,
      path: `media/${f._id}.jpg`,
      size: f.size,
    })),
  };
  if (Buffer.byteLength(JSON.stringify(manifest)) > 3 * 1024 * 1024)
    throw new HttpError(
      413,
      "This archive exceeds the metadata backup limit of 3 MB.",
    );
  return manifest;
}
export async function beginImport(
  account: AccountDocument,
  value: unknown,
  revision: number,
  requestId: string,
): Promise<BackupImportSession> {
  let manifest: BackupManifest;
  try {
    manifest = validateBackup(value, await libraryView(account));
  } catch (e) {
    throw new HttpError(
      400,
      e instanceof Error ? e.message : "Invalid backup.",
      "INVALID_BACKUP",
    );
  }
  if (manifest.assets.some((a) => !a.sha256))
    throw new HttpError(400, "Backup file checksums are missing.");
  const preview = restoreSnapshot(
    manifest,
    await libraryView(account),
    new Map(manifest.assets.map((a) => [a.id, a.id])),
  );
  await validateSteamReferences(preview, account.snapshot);
  return withStorageLock(account._id, async () => {
    const db = await database(),
      existing = await db.backupJobs.findOne({
        _id: requestId,
        userId: account._id,
      });
    if (existing) {
      if (JSON.stringify(existing.manifest) !== JSON.stringify(manifest))
        throw new HttpError(409, "This request belongs to a different backup.");
      if (existing.status === "pending" && existing.expiresAt > new Date())
        return { id: existing._id, files: existing.files };
      throw new HttpError(
        409,
        "This import request has already finished. Start a new import.",
      );
    }
    const latest = await db.accounts.findOne({ _id: account._id });
    if (latest?.revision !== revision)
      throw new HttpError(
        409,
        "Your collection changed. Reload before importing.",
        "REVISION_CONFLICT",
      );
    if (
      await db.backupJobs.findOne({
        userId: account._id,
        status: "pending",
        expiresAt: { $gt: new Date() },
      })
    )
      throw new HttpError(
        409,
        "Finish or cancel your active ZIP import first.",
        "IMPORT_ACTIVE",
      );
    await cleanupMediaUnderLock(account._id);
    await ensureCapacity(
      account._id,
      manifest.assets.reduce((n, a) => n + a.size, 0),
    );
    const c = config(),
      expiresAt = new Date(Date.now() + 86400000);
    const files = manifest.assets.map((a) => ({
      originalId: a.id,
      mediaId: randomUUID(),
      path: a.path,
    }));
    await db.backupJobs.insertOne({
      _id: requestId,
      userId: account._id,
      revision,
      status: "pending",
      expiresAt,
      purgeAt: new Date(expiresAt.getTime() + 7 * 86400000),
      manifest,
      files,
    });
    const reserved: MediaDocument[] = manifest.assets.map((a, i) => ({
      _id: files[i].mediaId,
      userId: account._id,
      storage: c.storage as "local" | "vercel-blob",
      pathname: `users/${account._id}/${files[i].mediaId}.jpg`,
      width: 0,
      height: 0,
      size: a.size,
      createdAt: new Date(),
      state: "pending",
      deleteAfter: expiresAt,
      importId: requestId,
      importPath: a.path,
      expectedHash: a.sha256,
    }));
    try {
      if (reserved.length) await db.media.insertMany(reserved);
    } catch (e) {
      await db.backupJobs.updateOne(
        { _id: requestId },
        { $set: { status: "cancelled" } },
      );
      await db.media.updateMany(
        { userId: account._id, importId: requestId },
        { $set: { state: "deleting", deleteAfter: new Date() } },
      );
      throw e;
    }
    return { id: requestId, files };
  });
}
export async function importFile(
  userId: string,
  id: string,
  mediaId: string,
  bytes: Uint8Array,
) {
  return withStorageLock(userId, async () => {
    const db = await database(),
      job = await db.backupJobs.findOne({
        _id: id,
        userId,
        status: "pending",
        expiresAt: { $gt: new Date() },
      });
    if (!job)
      throw new HttpError(
        409,
        "This import expired or was cancelled.",
        "IMPORT_EXPIRED",
      );
    const file = await db.media.findOne({
      _id: mediaId,
      userId,
      importId: id,
      state: { $in: ["pending", "ready"] },
    });
    if (
      !file ||
      file.size !== bytes.length ||
      createHash("sha256").update(bytes).digest("hex") !== file.expectedHash
    )
      throw new HttpError(
        400,
        "Backup image size or checksum does not match.",
        "BACKUP_INVALID_IMAGE",
      );
    if (file.state === "ready") return { uploaded: true };
    const image = sharp(bytes, { limitInputPixels: 40000000 }),
      meta = await image.metadata();
    if (
      meta.format !== "jpeg" ||
      (meta.pages ?? 1) !== 1 ||
      !meta.width ||
      !meta.height ||
      meta.width > 1600 ||
      meta.height > 1600
    )
      throw new HttpError(
        400,
        "Backup contains an unsupported image.",
        "BACKUP_INVALID_IMAGE",
      );
    await image.raw().toBuffer(); // Fully decode, then preserve exact exported JPEG bytes and byte accounting.
    await writeMediaFile(file, bytes);
    await db.media.updateOne(
      { _id: mediaId, userId },
      { $set: { state: "ready", width: meta.width, height: meta.height } },
    );
    return { uploaded: true };
  });
}
export async function finishImport(userId: string, id: string) {
  return withStorageLock(userId, async () => {
    const db = await database(),
      job = await db.backupJobs.findOne({ _id: id, userId }),
      account = await db.accounts.findOne({ _id: userId });
    if (!job || !account) throw new HttpError(404, "Import not found.");
    if (job.status === "completed" || account.lastMutationId === id) {
      await db.backupJobs.updateOne(
        { _id: id, userId },
        { $set: { status: "completed" } },
      );
      return { completed: true };
    }
    if (job.status !== "pending" || job.expiresAt <= new Date())
      throw new HttpError(409, "Import expired or was cancelled.");
    if (account.revision !== job.revision)
      throw new HttpError(
        409,
        "Your library changed during import. Cancel and retry after reloading.",
        "REVISION_CONFLICT",
      );
    if (
      (await db.media.countDocuments({
        userId,
        importId: id,
        state: "ready",
      })) !== job.files.length
    )
      throw new HttpError(
        409,
        "Some backup images have not finished uploading.",
        "IMPORT_INCOMPLETE",
      );
    const snapshot = restoreSnapshot(
      job.manifest,
      await libraryView(account),
      new Map(job.files.map((f) => [f.originalId, f.mediaId])),
    );
    await commitLibraryUnderLock(account, snapshot, id, true);
    await db.backupJobs.updateOne(
      { _id: id, userId },
      { $set: { status: "completed" } },
    );
    return { completed: true };
  });
}
export async function cancelImport(userId: string, id: string) {
  return withStorageLock(userId, async () => {
    const db = await database(),
      account = await db.accounts.findOne({ _id: userId });
    const job = await db.backupJobs.findOne({ _id: id, userId });
    if (!job || job.status === "completed") return;
    if (account?.lastMutationId === id) {
      await db.backupJobs.updateOne(
        { _id: id, userId },
        { $set: { status: "completed" } },
      );
      return;
    }
    await db.backupJobs.updateOne(
      { _id: id, userId },
      { $set: { status: "cancelled" } },
    );
    await db.media.updateMany(
      {
        userId,
        importId: id,
        _id: { $nin: account ? storedMediaReferences(account.snapshot) : [] },
      },
      { $set: { state: "deleting", deleteAfter: new Date() } },
    );
    await cleanupMediaUnderLock(userId);
  });
}
