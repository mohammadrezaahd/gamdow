import "server-only";
import { cookies } from "next/headers";
import { randomBytes, createHash } from "node:crypto";
import { database } from "./database";
import { HttpError } from "./http";
const secure = () =>
  process.env.VERCEL === "1" ||
  process.env.APP_URL?.startsWith("https://") === true;
const cookieName = () =>
  secure() ? "__Host-gamdow_session" : "gamdow_session";
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function currentSession() {
  const token = (await cookies()).get(cookieName())?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const db = await database();
  const session = await db.sessions.findOne({
    _id: tokenHash(token),
    expiresAt: { $gt: new Date() },
  });
  if (!session) return null;
  const account = await db.accounts.findOne({ _id: session.userId });
  return account ? { account, expiresAt: session.expiresAt } : null;
}
export async function requireSession() {
  const session = await currentSession();
  if (!session)
    throw new HttpError(401, "Please log in to continue.", "UNAUTHENTICATED");
  return session;
}
export async function createSession(userId: string, remember: boolean) {
  const db = await database();
  const jar = await cookies();
  const old = jar.get(cookieName())?.value;
  if (old) await db.sessions.deleteOne({ _id: tokenHash(old) });
  const token = randomBytes(32).toString("hex");
  const lifetime = (remember ? 30 : 1) * 86400;
  const expiresAt = new Date(Date.now() + lifetime * 1000);
  await db.sessions.insertOne({ _id: tokenHash(token), userId, expiresAt });
  jar.set(cookieName(), token, {
    httpOnly: true,
    secure: secure(),
    sameSite: "lax",
    path: "/",
    ...(remember ? { maxAge: lifetime } : {}),
  });
  return expiresAt;
}
export async function deleteSession() {
  const jar = await cookies();
  const token = jar.get(cookieName())?.value;
  if (token) {
    await (await database()).sessions.deleteOne({ _id: tokenHash(token) });
  }
  jar.set(cookieName(), "", {
    httpOnly: true,
    secure: secure(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
