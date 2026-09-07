import "server-only";
import { database } from "./database";
import { tokenHash } from "./session";
import { HttpError } from "./http";
export async function rateLimit(key: string, maximum: number, seconds: number) {
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const _id = tokenHash(`${key}:${bucket}`);
  const expiresAt = new Date((bucket + 1) * seconds * 1000);
  const { limits } = await database();
  let result;
  try {
    result = await limits.findOneAndUpdate(
      { _id },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
      { upsert: true, returnDocument: "after" },
    );
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    result = await limits.findOneAndUpdate(
      { _id },
      { $inc: { count: 1 } },
      { returnDocument: "after" },
    );
  }
  if (!result || result.count > maximum)
    throw new HttpError(
      429,
      "Too many attempts. Please try again later.",
      "RATE_LIMITED",
    );
}
export async function limitAuth(request: Request, email: string) {
  // Vercel overwrites this header; on local servers an address-wide bucket is used.
  const ip = process.env.VERCEL
    ? (request.headers.get("x-vercel-forwarded-for") ?? "unknown")
    : "local";
  await rateLimit(`auth-ip:${ip}`, 50, 900);
  await rateLimit(`auth-email:${email}`, 10, 900);
}
