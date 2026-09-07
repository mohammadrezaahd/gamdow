import "server-only";
import { MongoClient } from "mongodb";
import type { LibrarySnapshot } from "@/types/game";
import { config } from "./config";
export interface AccountDocument {
  _id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  snapshot: LibrarySnapshot;
  revision: number;
  lastMutationId?: string;
}
export interface SessionDocument {
  _id: string;
  userId: string;
  expiresAt: Date;
}
export interface MediaDocument {
  _id: string;
  userId: string;
  storage: "local" | "vercel-blob";
  pathname: string;
  width: number;
  height: number;
  size: number;
  createdAt: Date;
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
  const accounts = db.collection<AccountDocument>("accounts");
  const sessions = db.collection<SessionDocument>("sessions");
  const media = db.collection<MediaDocument>("media");
  const limits = db.collection<RateDocument>("rate_limits");
  state.gamdowIndexes ??= Promise.all([
    accounts.createIndex({ email: 1 }, { unique: true }),
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
  return { accounts, sessions, media, limits };
}
