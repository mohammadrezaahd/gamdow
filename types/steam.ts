/** Shared, serializable DTOs. No API credentials are ever part of these types. */
export interface SteamMetadata {
  steamAppId: number;
  name: string;
  description: string;
  detailedDescription: string;
  images: {
    cover: string;
    capsule: string;
    header: string;
    background: string;
  };
  screenshots: { id: number; thumbnail: string; full: string }[];
  developers: string[];
  publishers: string[];
  genres: { id: string; name: string }[];
  categories: { id: number; name: string }[];
  platforms: { windows: boolean; mac: boolean; linux: boolean };
  release: { date: string; comingSoon: boolean; year?: number };
  metacritic?: { score: number; url?: string };
  isFree: boolean;
  controllerSupport?: string;
  supportedLanguages: string;
  website?: string;
  recommendations?: number;
  steamLastSyncAt: string;
  schemaVersion: 1;
}
export interface SteamSearchItem {
  steamAppId: number;
  name: string;
  image: string;
  releaseYear?: number;
  cached: boolean;
}
export interface SteamSearchResult {
  items: SteamSearchItem[];
  hasMore: boolean;
  catalogReady: boolean;
  warning?: string;
}
export interface SteamAchievementDefinition {
  apiName: string;
  name: string;
  description: string;
  icon: string;
  iconLocked: string;
  hidden: boolean;
}
export interface SteamAchievement extends SteamAchievementDefinition {
  unlocked: boolean;
  unlockedAt?: string;
}
export interface SteamAchievementProgress {
  state: "available" | "unsupported" | "private" | "unavailable" | "not_synced";
  total?: number;
  unlocked?: number;
  percentage?: number;
  items: SteamAchievement[];
  lastSyncAt?: string;
  stale?: boolean;
  message?: string;
}
export interface SteamPlaytime {
  totalMinutes?: number;
  recentMinutes?: number;
  lastPlayedAt?: string;
  lastSyncAt: string;
}
export interface SteamSyncResult {
  id: string;
  status: "pending" | "running" | "completed" | "cancelled";
  total: number;
  processed: number;
  added: number;
  existing: number;
  skipped: number;
  failed: number;
  errors: { steamAppId: number; message: string }[];
  startedAt: string;
  completedAt?: string;
}
export interface SteamConnection {
  configured: boolean;
  connected: boolean;
  steamId?: string;
  connectedAt?: string;
  lastLibrarySyncAt?: string;
  sync?: SteamSyncResult;
}
export interface SteamGameDetails {
  metadata: SteamMetadata | null;
  metadataStale: boolean;
  connected: boolean;
  playtime: SteamPlaytime | null;
  achievements: SteamAchievementProgress;
  warning?: string;
}
