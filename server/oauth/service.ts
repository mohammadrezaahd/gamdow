import "server-only";
import { cookies } from "next/headers";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";
import { database, type AuthFlowDocument } from "../database";
import {
  createSession,
  currentSession,
  requireSession,
  tokenHash,
} from "../session";
import { HttpError } from "../http";
import { createEmptyLibrary } from "@/lib/empty-library";
import {
  beginConnection,
  verifySteamAssertion,
  attachSteam,
} from "../steam/connection";
import { steamConfigured, steamOrigin } from "../steam/client";
import { withSteamLock } from "../steam/locks";
export const providerSchema = z.enum(["google", "steam"]);
type Provider = z.infer<typeof providerSchema>;
const random = () => randomBytes(32).toString("hex");
const secure = () =>
  process.env.VERCEL === "1" || steamOrigin().startsWith("https:");
const flowCookie = (provider: Provider) =>
  `${secure() ? "__Host-" : ""}gamdow_oauth_${provider}`;
const googleKeys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
  { timeoutDuration: 5000 },
);
export function providers() {
  return {
    google: !!(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ),
    steam: steamConfigured(),
  };
}
export async function beginLogin(
  provider: Provider,
  remember: boolean,
  link: boolean,
) {
  if (!providers()[provider])
    throw new HttpError(
      503,
      `${provider === "google" ? "Google" : "Steam"} sign-in is not configured yet.`,
      "OAUTH_NOT_CONFIGURED",
    );
  const session = link ? await requireSession() : await currentSession();
  if (!link && session)
    throw new HttpError(
      409,
      "You are already signed in. Connect login methods from Profile.",
      "ALREADY_SIGNED_IN",
    );
  if (link && provider !== "google")
    throw new HttpError(400, "Use the Steam connection panel to link Steam.");
  const browser = random(),
    browserHash = tokenHash(browser),
    nonce = random(),
    verifier = random();
  let state = random(),
    url: URL;
  if (provider === "steam") {
    const result = await beginConnection(
      "auth-login",
      browserHash,
      "/api/auth/steam/callback",
    );
    url = new URL(result.url);
    state = new URL(url.searchParams.get("openid.return_to")!).searchParams.get(
      "state",
    )!;
  } else {
    url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: `${steamOrigin()}/api/auth/google/callback`,
      response_type: "code",
      scope: "openid email profile",
      state,
      nonce,
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      code_challenge_method: "S256",
      prompt: "select_account",
    }).toString();
  }
  await (
    await database()
  ).authFlows.insertOne({
    _id: tokenHash(state),
    provider,
    browserHash,
    nonce,
    verifier,
    remember,
    expiresAt: new Date(Date.now() + 600000),
    ...(link && session
      ? { userId: session.account._id, sessionHash: session.sessionHash }
      : {}),
  });
  (await cookies()).set(flowCookie(provider), browser, {
    httpOnly: true,
    secure: secure(),
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return { url: url.href };
}
async function googleIdentity(request: Request, flow: AuthFlowDocument) {
  const code = new URL(request.url).searchParams.get("code");
  if (!code || code.length > 4096)
    throw new HttpError(
      400,
      "Google sign-in was cancelled or expired.",
      "OAUTH_VERIFICATION_FAILED",
    );
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: `${steamOrigin()}/api/auth/google/callback`,
      code_verifier: flow.verifier,
    }),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new HttpError(
      400,
      "Google could not verify this sign-in. Please try again.",
      "OAUTH_VERIFICATION_FAILED",
    );
  }
  const { steamText } = await import("../steam/client");
  const tokens = z
    .object({ id_token: z.string().max(20000) })
    .parse(JSON.parse(await steamText(response, 64000)));
  const { payload } = await jwtVerify(tokens.id_token, googleKeys, {
    algorithms: ["RS256"],
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: process.env.GOOGLE_CLIENT_ID,
    requiredClaims: ["sub", "iat", "exp", "nonce"],
    maxTokenAge: "10m",
    clockTolerance: 30,
  });
  if (
    payload.nonce !== flow.nonce ||
    (payload.azp && payload.azp !== process.env.GOOGLE_CLIENT_ID)
  )
    throw new HttpError(
      400,
      "Google verification failed.",
      "OAUTH_VERIFICATION_FAILED",
    );
  const identity = z
    .object({
      sub: z.string().min(1).max(255),
      email: z.string().email().max(254),
      email_verified: z.literal(true),
      name: z.string().max(500).optional(),
    })
    .parse(payload);
  return {
    subject: identity.sub,
    email: identity.email.toLowerCase(),
    name: identity.name?.slice(0, 80) || "Player",
  };
}
export async function finishLogin(provider: Provider, request: Request) {
  if (!providers()[provider])
    throw new HttpError(
      503,
      "Sign-in is not configured.",
      "OAUTH_NOT_CONFIGURED",
    );
  const params = new URL(request.url).searchParams;
  if ([...params.keys()].some((key) => params.getAll(key).length !== 1))
    throw new HttpError(
      400,
      "Invalid sign-in response.",
      "OAUTH_VERIFICATION_FAILED",
    );
  const state = params.get("state") || "",
    jar = await cookies(),
    browser = jar.get(flowCookie(provider))?.value;
  if (
    !/^[a-f0-9]{64}$/.test(state) ||
    !browser ||
    !/^[a-f0-9]{64}$/.test(browser)
  )
    throw new HttpError(
      400,
      "Sign-in expired. Please try again.",
      "OAUTH_VERIFICATION_FAILED",
    );
  const db = await database();
  const flow = await db.authFlows.findOneAndDelete({
    _id: tokenHash(state),
    provider,
    browserHash: tokenHash(browser),
    expiresAt: { $gt: new Date() },
  });
  jar.set(flowCookie(provider), "", {
    httpOnly: true,
    secure: secure(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  if (!flow)
    throw new HttpError(
      400,
      "Sign-in expired or already used.",
      "OAUTH_VERIFICATION_FAILED",
    );
  const session = await currentSession();
  if (
    flow.userId &&
    (session?.account._id !== flow.userId ||
      session.sessionHash !== flow.sessionHash)
  )
    throw new HttpError(
      401,
      "Sign in again before linking Google.",
      "OAUTH_VERIFICATION_FAILED",
    );
  if (!flow.userId && session)
    throw new HttpError(
      409,
      "Your login changed in another tab. Log out before switching accounts.",
      "OAUTH_VERIFICATION_FAILED",
    );
  const identity =
    provider === "google"
      ? await googleIdentity(request, flow)
      : {
          subject: await verifySteamAssertion(
            request,
            "auth-login",
            flow.browserHash,
          ),
          name: "Steam player",
          email: undefined,
        };
  return withSteamLock(`oauth:${provider}:${identity.subject}`, async () => {
    const key = provider === "google" ? "googleSubject" : "steamSubject";
    let account = await db.accounts.findOne({ [key]: identity.subject });
    if (provider === "steam") {
      const connected = await db.steamConnections.findOne({
        steamId: identity.subject,
      });
      if (connected) {
        if (account && account._id !== connected._id)
          throw new HttpError(
            409,
            "This Steam login is associated with another account.",
            "OAUTH_ACCOUNT_CONFLICT",
          );
        account = await db.accounts.findOne({ _id: connected._id });
      }
    }
    if (flow.userId) {
      if (account && account._id !== flow.userId)
        throw new HttpError(
          409,
          "This Google login belongs to another gamdow account.",
          "OAUTH_ACCOUNT_CONFLICT",
        );
      await db.accounts.updateOne(
        { _id: flow.userId },
        { $set: { [key]: identity.subject } },
      );
      return "/?page=profile&auth=connected";
    }
    if (!account) {
      if (
        identity.email &&
        (await db.accounts.findOne({ email: identity.email }))
      )
        throw new HttpError(
          409,
          "Log in with your existing password, then connect Google from Profile.",
          "OAUTH_EMAIL_EXISTS",
        );
      const now = new Date(),
        id = randomUUID();
      // Steam supplies no email. A non-email internal key preserves the existing unique-email index.
      // It cannot be entered through the email/password form and is never presented as a contact address.
      account = {
        _id: id,
        email: identity.email || `steam:${identity.subject}`,
        passwordHash: "",
        [key]: identity.subject,
        createdAt: now,
        revision: 0,
        snapshot: createEmptyLibrary(id, identity.name, now.toISOString()),
      };
      await db.accounts.insertOne(account);
    } else
      await db.accounts.updateOne(
        { _id: account._id },
        { $set: { [key]: identity.subject } },
      );
    if (provider === "steam")
      await attachSteam(account._id, identity.subject, true);
    await createSession(account._id, flow.remember);
    return "/";
  });
}
