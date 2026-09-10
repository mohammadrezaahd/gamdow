import "server-only";
import { MongoClient } from "mongodb";
import type { LibrarySnapshot } from "@/types/game";
import type { StoredLibrarySnapshot } from "@/types/user-game";
import type {
  CatalogDocument,
  SteamConnectionDocument,
  SteamUserGameDocument,
  SteamSchemaDocument,
  SteamJobDocument,
  SteamStateDocument,
  SteamOwnedLibraryDocument,
} from "./steam/models";
import type { EpicConnectionDocument } from "./epic/connection";
import { config } from "./config";
export interface AccountDocument {
  _id: string;
  email: string;
  passwordHash: string;
  googleSubject?: string;
  steamSubject?: string;
  createdAt: Date;
  snapshot: LibrarySnapshot | StoredLibrarySnapshot;
  legacySnapshot?: LibrarySnapshot;
  revision: number;
  lastMutationId?: string;
}
export interface SessionDocument {
  remember?: boolean;
  createdAt?: Date;
  _id: string;
  userId: string;
  expiresAt: Date;
}
export interface MediaDocument {
  state?: "pending" | "ready" | "deleting";
  deleteAfter?: Date;
  importId?: string;
  expectedHash?: string;
  importPath?: string;
  _id: string;
  userId: string;
  storage: "local" | "vercel-blob";
  pathname: string;
  width: number;
  height: number;
  size: number;
  createdAt: Date;
}
export interface AuthFlowDocument {
  _id: string;
  provider: "google" | "steam" | "epic";
  browserHash: string;
  nonce: string;
  verifier: string;
  expiresAt: Date;
  remember: boolean;
  userId?: string;
  sessionHash?: string;
}
interface RateDocument {
  _id: string;
  count: number;
  expiresAt: Date;
}
const state = globalThis as typeof globalThis & {
  gamdowMongo?: Promise<MongoClient>;
  gamdowIndexes?: Promise<void>;
};
export async function database() {
  const c = config();
  state.gamdowMongo ??= new MongoClient(c.mongodbUri, {
    maxPoolSize: 5,
    ignoreUndefined: true,
    minPoolSize: 0,
    maxIdleTimeMS: 60000,
    serverSelectionTimeoutMS: 10000,
  })
    .connect()
    .catch((error) => {
      state.gamdowMongo = undefined;
      throw error;
    });
  const db = (await state.gamdowMongo).db(c.dbName);
  const storageLocks = db.collection<{
    _id: string;
    owner: string;
    expiresAt: Date;
  }>("storage_locks");
  const storageGrants = db.collection<{
    _id: string;
    userId: string;
    bytes: number;
    createdAt: Date;
  }>("storage_grants");
  const backupJobs =
    db.collection<import("./storage/backup").BackupJob>("backup_jobs");
  const epicConnections =
    db.collection<EpicConnectionDocument>("epic_connections");
  const authFlows = db.collection<AuthFlowDocument>("auth_flows");
  const accounts = db.collection<AccountDocument>("accounts");
  const sessions = db.collection<SessionDocument>("sessions");
  const media = db.collection<MediaDocument>("media");
  const limits = db.collection<RateDocument>("rate_limits");
  const catalog = db.collection<CatalogDocument>("steam_catalog");
  const steamConnections =
    db.collection<SteamConnectionDocument>("steam_connections");
  const steamUserGames =
    db.collection<SteamUserGameDocument>("steam_user_games");
  const steamSchemas = db.collection<SteamSchemaDocument>(
    "steam_achievement_schemas",
  );
  const steamJobs = db.collection<SteamJobDocument>("steam_sync_jobs");
  const steamOwnedLibraries = db.collection<SteamOwnedLibraryDocument>(
    "steam_owned_libraries",
  );
  const steamState = db.collection<SteamStateDocument>("steam_state");
  state.gamdowIndexes ??= Promise.all([
    storageLocks.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    storageGrants.createIndex({ userId: 1 }),
    backupJobs.createIndex({ userId: 1, expiresAt: 1 }),
    backupJobs.createIndex({ purgeAt: 1 }, { expireAfterSeconds: 0 }),
    media.createIndex({ userId: 1, state: 1 }),
    media.createIndex({ deleteAfter: 1 }),
    epicConnections.createIndex({ accountId: 1 }, { unique: true }),
    authFlows.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    catalog.createIndex({ type: 1, searchName: 1 }),
    catalog.createIndex({ type: 1, searchTokens: 1, _id: 1 }),
    steamConnections.createIndex({ steamId: 1 }, { unique: true }),
    steamUserGames.createIndex(
      { userId: 1, generation: 1, steamAppId: 1 },
      { unique: true },
    ),
    steamOwnedLibraries.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 },
    ),
    steamState.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    accounts.createIndex({ email: 1 }, { unique: true }),
    accounts.createIndex({ googleSubject: 1 }, { unique: true, sparse: true }),
    accounts.createIndex({ steamSubject: 1 }, { unique: true, sparse: true }),
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    sessions.createIndex({ userId: 1 }),
    limits.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    media.createIndex({ userId: 1, createdAt: 1 }),
  ])
    .then(() => {})
    .catch((error) => {
      state.gamdowIndexes = undefined;
      throw error;
    });
  await state.gamdowIndexes;
  return {
    storageLocks,
    storageGrants,
    backupJobs,
    epicConnections,
    authFlows,
    accounts,
    sessions,
    media,
    limits,
    catalog,
    steamConnections,
    steamUserGames,
    steamSchemas,
    steamJobs,
    steamState,
    steamOwnedLibraries,
  };
}
