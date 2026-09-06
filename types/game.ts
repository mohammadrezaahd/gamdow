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
  title: string;
  releaseYear?: number;
  genres: string[];
  series?: string;
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
  gallery: GalleryItem[];
  preferences: UserPreferences;
}
export type GameInput = Omit<Game, "id" | "updatedAt">;
export interface LibraryRepository {
  load(): Promise<LibrarySnapshot>;
  save(snapshot: LibrarySnapshot): Promise<void>;
}
