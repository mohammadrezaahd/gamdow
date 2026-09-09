import "server-only";
import { randomUUID } from "node:crypto";
import { database } from "../database";
import { HttpError } from "../http";
export async function withSteamLock<T>(
  key: string,
  operation: () => Promise<T>,
  seconds = 55,
): Promise<T> {
  const { steamState } = await database();
  const owner = randomUUID();
  try {
    await steamState.updateOne(
      { _id: `lock:${key}`, expiresAt: { $lte: new Date() } },
      { $set: { owner, expiresAt: new Date(Date.now() + seconds * 1000) } },
      { upsert: true },
    );
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === 11000)
      throw new HttpError(
        409,
        "A Steam operation is already running. Please try again shortly.",
        "STEAM_BUSY",
      );
    throw e;
  }
  try {
    return await operation();
  } finally {
    await steamState.deleteOne({ _id: `lock:${key}`, owner });
  }
}
