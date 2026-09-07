export interface ImagePreset {
  label: string;
  width: number;
  height: number;
}
export interface CropPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface UploadedImage {
  src: string;
  name: string;
  width: number;
  height: number;
  mimeType: "image/jpeg";
}
export const imagePresets = {
  avatar: { label: "Avatar · 1:1", width: 512, height: 512 },
  cover: { label: "Cover · 2:3", width: 600, height: 900 },
  banner: { label: "Banner · 16:9", width: 1600, height: 900 },
  screenshot: { label: "Screenshot · 16:9", width: 1600, height: 900 },
} satisfies Record<string, ImagePreset>;
export const acceptedImages = "image/jpeg,image/png,image/webp";
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(
        new Error(
          "This image could not be opened. Try a JPEG, PNG or WebP file.",
        ),
      );
    image.src = src;
  });
}
export async function validateImage(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPEG, PNG or WebP image.");
  if (file.size > 20 * 1024 * 1024)
    throw new Error("Choose an image smaller than 20 MB.");
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    if (img.width * img.height > 40000000)
      throw new Error(
        "This image is too large. Resize it below 40 megapixels first.",
      );
    return url;
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}
export async function cropImage(
  src: string,
  pixels: CropPixels,
  preset: ImagePreset,
  name: string,
): Promise<UploadedImage> {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = preset.width;
  canvas.height = preset.height;
  const context = canvas.getContext("2d");
  if (!context)
    throw new Error("Your browser could not create the cropped image.");
  context.fillStyle = "#111311";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    pixels.x,
    pixels.y,
    pixels.width,
    pixels.height,
    0,
    0,
    preset.width,
    preset.height,
  );
  return {
    src: canvas.toDataURL("image/jpeg", 0.88),
    width: preset.width,
    height: preset.height,
    mimeType: "image/jpeg",
    name,
  };
}
