import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { put, get, del } from "@vercel/blob";
import { config } from "./config";
import { database } from "./database";
import {
  withStorageLock,
  ensureCapacity,
  storedMediaReferences,
} from "./storage/service";
import type { MediaDocument } from "./database";
import { HttpError } from "./http";
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export async function storeMedia(userId: string, bytes: Uint8Array) {
  const c = config();
  const id = randomUUID();
  const pathname = `users/${userId}/${id}.jpg`;
  let metadata;
  try {
    metadata = await sharp(bytes, { limitInputPixels: 40000000 }).metadata();
  } catch {
    throw new HttpError(400, "This is not a supported image.");
  }
  if (
    !["jpeg", "png", "webp"].includes(metadata.format ?? "") ||
    (metadata.pages ?? 1) > 1
  )
    throw new HttpError(400, "Upload a single JPEG, PNG or WebP image.");
  const { data, info } = await sharp(bytes, { limitInputPixels: 40000000 })
    .rotate()
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 88 })
    .toBuffer({ resolveWithObject: true });
  if (data.length > MAX_IMAGE_BYTES)
    throw new HttpError(
      413,
      "The cropped image is too large. Choose a smaller image.",
    );
  return withStorageLock(userId, async () => {
    await ensureCapacity(userId, data.length);
    const media: MediaDocument = {
      _id: id,
      userId,
      storage: c.storage as "local" | "vercel-blob",
      pathname,
      width: info.width,
      height: info.height,
      size: data.length,
      createdAt: new Date(),
      state: "pending",
      deleteAfter: new Date(Date.now() + 86400000),
    };
    await (await database()).media.insertOne(media);
    try {
      await writeMediaFile(media, data);
      await (
        await database()
      ).media.updateOne({ _id: id, userId }, { $set: { state: "ready" } });
    } catch (error) {
      await (
        await database()
      ).media.updateOne(
        { _id: id, userId },
        { $set: { state: "deleting", deleteAfter: new Date() } },
      );
      try {
        await deleteMediaFile(media);
      } catch {
        /* Retain the charged record for cleanup retry. */
      }
      throw error;
    }
    return {
      id,
      src: `/api/media/${id}`,
      width: info.width,
      height: info.height,
      size: data.length,
    };
  });
}
export async function writeMediaFile(media: MediaDocument, bytes: Uint8Array) {
  if (media.storage === "vercel-blob")
    await put(media.pathname, Buffer.from(bytes), {
      access: "private",
      contentType: "image/jpeg",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  else {
    const target = path.resolve(config().localMediaDir, media.pathname);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }
}
/** The record is removed only after physical deletion succeeds. Caller holds the storage lease. */
export async function deleteMediaFile(media: MediaDocument) {
  if (media.storage === "vercel-blob") await del(media.pathname);
  else {
    try {
      await unlink(path.resolve(config().localMediaDir, media.pathname));
    } catch (e) {
      if ((e as { code?: string }).code !== "ENOENT") throw e;
    }
  }
  await (
    await database()
  ).media.deleteOne({ _id: media._id, userId: media.userId });
}
export async function cleanupMediaUnderLock(userId: string, limit = 20) {
  const db = await database(),
    account = await db.accounts.findOne({ _id: userId });
  if (!account) return 0;
  const refs = storedMediaReferences(account.snapshot);
  const files = await db.media
    .find({
      userId,
      _id: { $nin: refs },
      $or: [
        { state: "deleting" },
        { deleteAfter: { $lte: new Date() } },
        {
          state: { $exists: false },
          createdAt: { $lt: new Date(Date.now() - 86400000) },
        },
      ],
    })
    .limit(limit)
    .toArray();
  // Defer referenced candidates so a cron page is never starved by retained files.
  await db.media.updateMany(
    {
      userId,
      _id: { $in: refs },
      $or: [
        { deleteAfter: { $lte: new Date() } },
        { state: { $exists: false } },
      ],
    },
    { $set: { state: "ready", deleteAfter: new Date(Date.now() + 86400000) } },
  );
  let deleted = 0;
  for (const file of files) {
    try {
      await deleteMediaFile(file);
      deleted++;
    } catch {
      await db.media.updateOne(
        { _id: file._id, userId },
        { $set: { state: "deleting", deleteAfter: new Date() } },
      );
    }
  }
  return deleted;
}
export async function removeUnreferencedMedia(userId: string, id: string) {
  return withStorageLock(userId, async () => {
    const db = await database(),
      account = await db.accounts.findOne({ _id: userId });
    if (!account) throw new HttpError(401, "Please sign in again.");
    if (storedMediaReferences(account.snapshot).includes(id))
      throw new HttpError(
        409,
        "Remove this image from your game or gallery before deleting the file.",
        "MEDIA_IN_USE",
      );
    const file = await db.media.findOne({ _id: id, userId });
    if (!file) return;
    if (file.importId) {
      const job = await db.backupJobs.findOne({
        _id: file.importId,
        userId,
        status: "pending",
        expiresAt: { $gt: new Date() },
      });
      if (job)
        throw new HttpError(
          409,
          "Cancel the active backup import before removing its files.",
          "MEDIA_IN_USE",
        );
    }
    await db.media.updateOne(
      { _id: id, userId },
      { $set: { state: "deleting", deleteAfter: new Date() } },
    );
    await deleteMediaFile(file);
  });
}

export async function readMedia(userId: string, id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new HttpError(404, "Image not found.");
  const media = await (
    await database()
  ).media.findOne({
    _id: id,
    userId,
    state: { $nin: ["pending", "deleting"] },
  });
  if (!media) throw new HttpError(404, "Image not found.");
  const headers = {
    "Content-Type": "image/jpeg",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (media.storage === "vercel-blob") {
    const result = await get(media.pathname, { access: "private" });
    if (result?.statusCode !== 200)
      throw new HttpError(404, "Image not found.");
    return new Response(result.stream, { headers });
  }
  try {
    return new Response(
      new Uint8Array(
        await readFile(path.resolve(config().localMediaDir, media.pathname)),
      ),
      { headers },
    );
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT")
      throw new HttpError(404, "Image not found.");
    throw error;
  }
}
