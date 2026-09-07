import { requireSession } from "@/server/session";
import { sameOrigin, failure, json, readBytes, HttpError } from "@/server/http";
import { storeMedia, MAX_IMAGE_BYTES } from "@/server/media";
import { rateLimit } from "@/server/rate-limit";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { account } = await requireSession();
    await rateLimit(`upload:${account._id}`, 120, 3600);
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(
        request.headers.get("content-type") ?? "",
      )
    )
      throw new HttpError(415, "Upload a JPEG, PNG or WebP image.");
    return json(
      await storeMedia(account._id, await readBytes(request, MAX_IMAGE_BYTES)),
      201,
    );
  } catch (error) {
    return failure(error);
  }
}
