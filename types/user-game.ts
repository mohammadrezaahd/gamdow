import type { Game, LibrarySnapshot } from "./game";
/** Manual metadata is private; Steam metadata lives once in the public catalog. */
export type ManualGameMetadata = Pick<
  Game,
  | "title"
  | "description"
  | "coverImage"
  | "heroImage"
  | "releaseYear"
  | "releaseDate"
  | "genres"
>;
export type PersonalGameData = Omit<
  Game,
  | keyof ManualGameMetadata
  | "id"
  | "source"
  | "steamAppId"
  | "originalManualMetadata"
>;
export interface UserGame {
  id: string;
  source: "MANUAL" | "STEAM";
  steamAppId?: number;
  personal: PersonalGameData;
  /** For a linked manual game this preserves the original metadata for unlink. */
  manualMetadata?: ManualGameMetadata;
}
export interface StoredLibrarySnapshot extends Omit<
  LibrarySnapshot,
  "version" | "games"
> {
  version: 2;
  games: UserGame[];
}
