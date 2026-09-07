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
  return {
    ...image,
    src: result.src,
    width: result.width,
    height: result.height,
  };
}
