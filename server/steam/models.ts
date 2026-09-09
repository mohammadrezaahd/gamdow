import type {
  SteamMetadata,
  SteamAchievementDefinition,
  SteamPlaytime,
  SteamSyncResult,
} from "@/types/steam";
export interface CatalogDocument {
  _id: number;
  name: string;
  searchName: string;
  searchTokens: string[];
  type: "game" | "excluded";
  lastModified?: number;
  priceChangeNumber?: number;
  metadata?: SteamMetadata;
  retryAfter?: Date;
}
export interface SteamConnectionDocument {
  _id: string; // gamdow user ID: at most one connection per user
  steamId: string;
  generation: string;
  connectedAt: string;
  lastLibrarySyncAt?: string;
}
export interface SteamUserGameDocument {
  _id: string; // generation:appid; disconnect revokes visibility immediately
  userId: string;
  generation: string;
  steamAppId: number;
  playtime?: SteamPlaytime;
  achievements?: {
    unlocks: { apiName: string; unlocked: boolean; unlockedAt?: string }[];
    lastSyncAt: string;
  };
  achievementState?: "available" | "unsupported" | "private" | "unavailable";
  achievementCheckedAt?: string;
}
export interface SteamSchemaDocument {
  _id: number;
  items: SteamAchievementDefinition[];
  lastSyncAt: string;
}
export interface OwnedGame {
  appid: number;
  name?: string;
  img_icon_url?: string;
  playtime_forever?: number;
  playtime_2weeks?: number;
  rtime_last_played?: number;
}
export interface SteamJobDocument extends SteamSyncResult {
  _id: string; // user ID, one resumable job per account
  generation: string;
  remaining: OwnedGame[];
  initialAppIds: number[];
  requestId?: string;
  achievementRemaining?: number[];
}
export interface SteamStateDocument {
  _id: string;
  owner?: string;
  expiresAt?: Date;
  userId?: string;
  returnTo?: string;
  sessionHash?: string;
  watermark?: number;
  runStartedAt?: number;
  cursor?: number;
  complete?: boolean;
  searchResult?: import("@/types/steam").SteamSearchResult;
}

export interface SteamOwnedLibraryDocument {
  _id: string;
  generation: string;
  snapshotId: string;
  fetchedAt: string;
  expiresAt: Date;
  games: OwnedGame[];
}
