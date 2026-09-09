import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { database } from "../database";
import { HttpError } from "../http";
import { tokenHash } from "../session";
import {
  steamConfigured,
  steamIdSchema,
  steamOrigin,
  steamFetch,
  steamText,
  steamKey,
} from "./client";
import { withSteamLock } from "./locks";
import type { SteamConnection } from "@/types/steam";
const provider = "https://steamcommunity.com/openid/login";
const ns = "http://specs.openid.net/auth/2.0";
export async function connectionStatus(
  userId: string,
): Promise<SteamConnection> {
  const db = await database();
  const connection = await db.steamConnections.findOne({ _id: userId });
  const job = connection
    ? await db.steamJobs.findOne({
        _id: userId,
        generation: connection.generation,
      })
    : null;
  return {
    configured: steamConfigured(),
    connected: !!connection,
    steamId: connection?.steamId,
    connectedAt: connection?.connectedAt,
    lastLibrarySyncAt: connection?.lastLibrarySyncAt,
    sync: job ? publicJob(job) : undefined,
  };
}
export function publicJob(
  job: import("./models").SteamJobDocument,
): import("@/types/steam").SteamSyncResult {
  const {
    id,
    status,
    total,
    processed,
    added,
    existing,
    skipped,
    failed,
    errors,
    startedAt,
    completedAt,
    mode,
    phase,
    outcome,
    achievementTotal,
    achievementProcessed,
    achievementSynced,
    achievementUnavailable,
    achievementUnsupported,
  } = job;
  return {
    id,
    status,
    total,
    processed,
    added,
    existing,
    skipped,
    failed,
    errors,
    startedAt,
    completedAt,
    mode,
    phase,
    outcome,
    achievementTotal,
    achievementProcessed,
    achievementSynced,
    achievementUnavailable,
    achievementUnsupported,
  };
}
export async function beginConnection(userId: string, sessionHash: string) {
  steamKey();
  const state = randomBytes(32).toString("hex");
  const origin = steamOrigin();
  const returnTo = `${origin}/api/steam/callback?state=${state}`;
  await (
    await database()
  ).steamState.insertOne({
    _id: `openid:${tokenHash(state)}`,
    userId,
    sessionHash,
    returnTo,
    expiresAt: new Date(Date.now() + 600000),
  });
  const url = new URL(provider);
  url.search = new URLSearchParams({
    "openid.ns": ns,
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": origin + "/",
    "openid.identity": `${ns}/identifier_select`,
    "openid.claimed_id": `${ns}/identifier_select`,
  }).toString();
  return { url: url.href };
}
export async function finishConnection(
  request: Request,
  userId: string,
  sessionHash: string,
) {
  const url = new URL(request.url);
  const p = url.searchParams;
  const invalid = () =>
    new HttpError(
      400,
      "Steam verification expired or could not be verified. Please connect again.",
      "STEAM_VERIFICATION_FAILED",
    );
  if (
    url.href.length > 12000 ||
    [...p.keys()].some((k) => p.getAll(k).length !== 1)
  )
    throw invalid();
  const state = p.get("state") || "";
  if (!/^[a-f0-9]{64}$/.test(state)) throw invalid();
  const db = await database();
  const saved = await db.steamState.findOne({
    _id: `openid:${tokenHash(state)}`,
    userId,
    sessionHash,
    expiresAt: { $gt: new Date() },
  });
  if (
    !saved ||
    p.get("openid.mode") !== "id_res" ||
    p.get("openid.ns") !== ns ||
    p.get("openid.op_endpoint") !== provider ||
    p.get("openid.return_to") !== saved.returnTo
  )
    throw invalid();
  // Provider and claimed-ID namespace are pinned to Steam; no attacker-directed discovery or redirects.
  const claimed = p.get("openid.claimed_id") || "";
  const match = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17,20})$/.exec(
    claimed,
  );
  if (!match || p.get("openid.identity") !== claimed) throw invalid();
  const steamId = steamIdSchema.parse(match[1]);
  const signed = new Set((p.get("openid.signed") || "").split(","));
  if (
    [
      "op_endpoint",
      "claimed_id",
      "identity",
      "return_to",
      "response_nonce",
      "assoc_handle",
    ].some((k) => !signed.has(k) || !p.get(`openid.${k}`))
  )
    throw invalid();
  const nonce = p.get("openid.response_nonce") || "";
  const time = Date.parse(nonce.slice(0, 20));
  if (!Number.isFinite(time) || Math.abs(Date.now() - time) > 600000)
    throw invalid();
  const body = new URLSearchParams();
  p.forEach((v, k) => {
    if (k.startsWith("openid.")) body.set(k, v);
  });
  body.set("openid.mode", "check_authentication");
  const checked = await steamText(
    await steamFetch(new URL(provider), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }),
    10000,
  );
  if (!/^is_valid:true\r?$/m.test(checked)) throw invalid();
  try {
    await db.steamState.insertOne({
      _id: `nonce:${tokenHash(nonce)}`,
      expiresAt: new Date(Date.now() + 86400000),
    });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === 11000)
      throw invalid();
    throw e;
  }
  const used = await db.steamState.deleteOne({
    _id: saved._id,
    userId,
    sessionHash,
  });
  if (!used.deletedCount) throw invalid();
  await withSteamLock(`user:${userId}`, async () => {
    const current = await db.steamConnections.findOne({ _id: userId });
    if (current?.steamId === steamId) return;
    if (current)
      throw new HttpError(
        409,
        "Disconnect your current Steam account before connecting another.",
        "STEAM_ALREADY_CONNECTED",
      );
    try {
      await db.steamConnections.insertOne({
        _id: userId,
        steamId,
        generation: randomUUID(),
        connectedAt: new Date().toISOString(),
      });
    } catch (e) {
      if (e && typeof e === "object" && "code" in e && e.code === 11000)
        throw new HttpError(
          409,
          "This Steam account is already connected to a gamdow account.",
          "STEAM_ALREADY_CONNECTED",
        );
      throw e;
    }
  });
}
export async function disconnectSteam(userId: string) {
  await withSteamLock(`user:${userId}`, async () => {
    const db = await database();
    const connection = await db.steamConnections.findOne({ _id: userId });
    await db.steamConnections.deleteOne({ _id: userId });
    if (connection) {
      await db.steamUserGames.deleteMany({
        userId,
        generation: connection.generation,
      });
      await db.steamJobs.deleteOne({
        _id: userId,
        generation: connection.generation,
      });
    }
    await db.steamOwnedLibraries.deleteOne({ _id: userId });
    await db.steamState.deleteMany({ userId });
  });
}
