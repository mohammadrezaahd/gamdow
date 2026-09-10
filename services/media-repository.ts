import type { UploadedImage } from "@/lib/image";
import type { MediaUploadResponse } from "@/types/api";
import { apiRequest } from "./http-client";
export async function uploadImage(
  image: UploadedImage,
): Promise<UploadedImage> {
  const blob = await (await fetch(image.src)).blob();
  if (blob.size > 3 * 1024 * 1024)
    throw new Error("The cropped image is too large. Choose a smaller image.");
  const result = await apiRequest<MediaUploadResponse>("/api/media", {
    method: "POST",
    headers: { "Content-Type": blob.type },
    body: blob,
  });
  window.dispatchEvent(new Event("gamdow:storage-updated"));
  return {
    ...image,
    src: result.src,
    width: result.width,
    height: result.height,
  };
}

/** Detached draft images can be removed immediately; attached images wait for archive commit. */
export async function discardDraftImage(src?: string) {
  if (!src?.startsWith("/api/media/")) return;
  try {
    await apiRequest(src, { method: "DELETE", keepalive: true });
    window.dispatchEvent(new Event("gamdow:storage-updated"));
  } catch {
    /* Referenced/busy files are protected; expiry cleanup handles abandoned uploads. */
  }
}
