import "server-only";
import { withSteamLock } from "../steam/locks";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { database } from "../database";
import { requireSession, tokenHash } from "../session";
import { HttpError, readBytes } from "../http";
import type { EpicConnection } from "@/types/epic";
export interface EpicConnectionDocument {
  _id: string;
  accountId: string;
  displayName: string;
  connectedAt: string;
}
const configured = () =>
  !!(
    process.env.EPIC_CLIENT_ID?.trim() && process.env.EPIC_CLIENT_SECRET?.trim()
  );
const capabilities = {
  libraryImport: false,
  playtime: false,
  achievements: false,
};
export function epicOrigin() {
  if (!process.env.APP_URL)
    throw new HttpError(
      503,
      "Configure APP_URL before connecting Epic.",
      "EPIC_NOT_CONFIGURED",
    );
  const url = new URL(process.env.APP_URL);
  if (
    url.username ||
    url.password ||
    (url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      ))
  )
    throw new HttpError(
      503,
      "Configure a valid APP_URL before connecting Epic.",
      "EPIC_NOT_CONFIGURED",
    );
  return url.origin;
}
const secure = () =>
  process.env.VERCEL === "1" || epicOrigin().startsWith("https:");
const cookieName = () => `${secure() ? "__Host-" : ""}gamdow_epic_link`;
const cookieOptions = () => ({
  httpOnly: true,
  secure: secure(),
  sameSite: "lax" as const,
  path: "/",
});
const invalid = () =>
  new HttpError(
    400,
    "Epic connection was cancelled, expired or could not be verified. Please try again.",
    "EPIC_VERIFICATION_FAILED",
  );
export async function epicStatus(userId: string): Promise<EpicConnection> {
  const c = await (await database()).epicConnections.findOne({ _id: userId });
  return {
    configured: configured(),
    connected: !!c,
    capabilities,
    ...(c
      ? {
          accountId: c.accountId,
          displayName: c.displayName,
          connectedAt: c.connectedAt,
        }
      : {}),
  };
}
export async function beginEpicConnection() {
  if (!configured())
    throw new HttpError(
      503,
      "Epic connection is not configured yet.",
      "EPIC_NOT_CONFIGURED",
    );
  const session = await requireSession();
  const state = randomBytes(32).toString("hex"),
    browser = randomBytes(32).toString("hex");
  await (
    await database()
  ).authFlows.insertOne({
    _id: tokenHash(state),
    provider: "epic",
    browserHash: tokenHash(browser),
    userId: session.account._id,
    sessionHash: session.sessionHash,
    expiresAt: new Date(Date.now() + 600000),
    nonce: "",
    verifier: "",
    remember: false,
  });
  (await cookies()).set(cookieName(), browser, {
    ...cookieOptions(),
    maxAge: 600,
  });
  const url = new URL("https://www.epicgames.com/id/authorize");
  url.search = new URLSearchParams({
    client_id: process.env.EPIC_CLIENT_ID!,
    response_type: "code",
    scope: "basic_profile",
    redirect_uri: `${epicOrigin()}/api/epic/callback`,
    state,
  }).toString();
  return { url: url.href };
}
async function epicJson(path: "token" | "userInfo", init: RequestInit) {
  try {
    const response = await fetch(
      `https://api.epicgames.dev/epic/oauth/v2/${path}`,
      {
        ...init,
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) {
      await response.body?.cancel();
      throw invalid();
    }
    // Reuse the bounded reader without ever exposing upstream error bodies or tokens.
    const bytes = await readBytes(response, 64000);
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw invalid();
  }
}
export async function finishEpicConnection(request: Request) {
  if (!configured())
    throw new HttpError(
      503,
      "Epic connection is not configured.",
      "EPIC_NOT_CONFIGURED",
    );
  const session = await requireSession(),
    params = new URL(request.url).searchParams,
    jar = await cookies();
  if ([...params.keys()].some((key) => params.getAll(key).length !== 1))
    throw invalid();
  const state = params.get("state") || "",
    browser = jar.get(cookieName())?.value || "";
  if (!/^[a-f0-9]{64}$/.test(state) || !/^[a-f0-9]{64}$/.test(browser))
    throw invalid();
  return withEpicLock(`epic:${session.account._id}`, async () => {
    const db = await database();
    const flow = await db.authFlows.findOneAndDelete({
      _id: tokenHash(state),
      provider: "epic",
      browserHash: tokenHash(browser),
      userId: session.account._id,
      sessionHash: session.sessionHash,
      expiresAt: { $gt: new Date() },
    });
    jar.set(cookieName(), "", { ...cookieOptions(), maxAge: 0 });
    const code = params.get("code");
    if (!flow || params.has("error") || !code || code.length > 4096)
      throw invalid();
    const tokens = z
      .object({ access_token: z.string().min(1).max(20000) })
      .parse(
        await epicJson("token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${process.env.EPIC_CLIENT_ID}:${process.env.EPIC_CLIENT_SECRET}`).toString("base64")}`,
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: `${epicOrigin()}/api/epic/callback`,
          }),
        }),
      );
    const identity = z
      .object({
        sub: z.string().regex(/^[a-f0-9]{32}$/i),
        preferred_username: z.string().max(500).optional(),
        name: z.string().max(500).optional(),
      })
      .parse(
        await epicJson("userInfo", {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        }),
      );
    const active = await requireSession();
    if (active.sessionHash !== session.sessionHash) throw invalid();
    // Only verified identity is retained. Access/refresh tokens are neither stored nor returned.
    try {
      await db.epicConnections.updateOne(
        { _id: session.account._id },
        {
          $set: {
            accountId: identity.sub.toLowerCase(),
            displayName: (
              identity.preferred_username ||
              identity.name ||
              "Epic player"
            ).slice(0, 80),
            connectedAt: new Date().toISOString(),
          },
        },
        { upsert: true },
      );
    } catch (e) {
      if ((e as { code?: number }).code === 11000)
        throw new HttpError(
          409,
          "This Epic account is already connected to another gamdow account.",
          "EPIC_ALREADY_CONNECTED",
        );
      throw e;
    }
  });
}
export async function disconnectEpic(userId: string) {
  return withEpicLock(`epic:${userId}`, async () => {
    const db = await database();
    await db.authFlows.deleteMany({ provider: "epic", userId });
    await db.epicConnections.deleteOne({ _id: userId });
  });
}

async function withEpicLock<T>(
  key: string,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await withSteamLock(key, operation);
  } catch (e) {
    if (e instanceof HttpError && e.code === "STEAM_BUSY")
      throw new HttpError(
        409,
        "An Epic connection operation is already running. Please try again shortly.",
        "EPIC_BUSY",
      );
    throw e;
  }
}
