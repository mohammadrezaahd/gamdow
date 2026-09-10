import type { ManualGameMetadata } from "./user-game";
import type { UserProfile } from "./profile";
import type { Genre, GameSeries } from "./taxonomy";
export type GameStatus =
  "Not started" | "Playing" | "On hold" | "Completed" | "Dropped";
export type PlayPlan =
  "None" | "Up next" | "Soon" | "Someday" | "Not interested";
export interface ScoreBreakdown {
  gameplay?: number;
  story?: number;
  atmosphere?: number;
  visuals?: number;
  sound?: number;
}
export interface JournalEntry {
  id: string;
  date: string;
  text: string;
}
export interface Game {
  id: string;
  source?: "MANUAL" | "STEAM";
  steamAppId?: number;
  storefront?: "STEAM" | "EPIC" | "OTHER";
  savedCoverImage?: string;
  savedHeroImage?: string;
  originalManualMetadata?: ManualGameMetadata;
  manualProgress?: number;
  releaseDate?: string;
  title: string;
  tags: string[];
  releaseYear?: number;
  genres: string[];
  genreIds?: string[];
  series?: string;
  seriesId?: string;
  platform: string;
  status: GameStatus;
  plan: PlayPlan;
  rating?: number;
  hoursPlayed?: number;
  favorite: boolean;
  description: string;
  review?: string;
  scoreBreakdown?: ScoreBreakdown;
  journalEntries: JournalEntry[];
  coverImage: string;
  heroImage?: string;
  startedAt?: string;
  completedAt?: string;
  plannedAt?: string;
  planNote?: string;
  planOrder?: number;
  edition?: "Main game" | "DLC" | "Remake" | "Remaster";
  reviewSpoiler?: boolean;
  reviewPros?: string;
  reviewCons?: string;
  updatedAt: string;
}
export interface GameCollection {
  id: string;
  name: string;
  description: string;
  gameIds: string[];
}
export interface GalleryItem {
  id: string;
  gameId: string;
  image: string;
  caption: string;
  capturedAt: string;
  favorite: boolean;
  spoiler: boolean;
}
export interface UserPreferences {
  displayName: string;
  defaultLibraryView: "grid" | "list";
  hideSpoilers: boolean;
}

export interface LibrarySnapshot {
  version: 1;
  games: Game[];
  collections: GameCollection[];
  genres: Genre[];
  series: GameSeries[];
  gallery: GalleryItem[];
  preferences: UserPreferences;
  profile: UserProfile;
}
export type GameInput = Omit<Game, "id" | "updatedAt">;
