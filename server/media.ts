import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { put, get, del } from "@vercel/blob";
import { config } from "./config";
import { database } from "./database";
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
  let storedPath = pathname;
  if (c.storage === "vercel-blob") {
    const blob = await put(pathname, data, {
      access: "private",
      contentType: "image/jpeg",
      addRandomSuffix: false,
    });
    storedPath = blob.pathname;
  } else {
    const target = path.resolve(c.localMediaDir, pathname);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data, { flag: "wx" });
  }
  try {
    await (
      await database()
    ).media.insertOne({
      _id: id,
      userId,
      storage: c.storage as "local" | "vercel-blob",
      pathname: storedPath,
      width: info.width,
      height: info.height,
      size: data.length,
      createdAt: new Date(),
    });
  } catch (error) {
    try {
      if (c.storage === "vercel-blob") await del(storedPath);
      else await unlink(path.resolve(c.localMediaDir, storedPath));
    } catch {}
    throw error;
  }
  return {
    id,
    src: `/api/media/${id}`,
    width: info.width,
    height: info.height,
  };
}
export async function readMedia(userId: string, id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new HttpError(404, "Image not found.");
  const media = await (await database()).media.findOne({ _id: id, userId });
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
