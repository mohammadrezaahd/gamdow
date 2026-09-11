import type { LibrarySnapshot } from "./game";
import type { GameActivityEvent } from "./game-activity";
export interface BackupManifest {
  format: "gamdow-archive";
  version: 1;
  library: Pick<
    LibrarySnapshot,
    "games" | "collections" | "genres" | "series" | "gallery"
  >;
  /** Personal game history only; account identities and provider credentials are excluded. */
  timeline?: GameActivityEvent[];
  assets: { id: string; path: string; size: number; sha256?: string }[];
}
export interface BackupImportSession {
  id: string;
  files: { originalId: string; mediaId: string; path: string }[];
}
