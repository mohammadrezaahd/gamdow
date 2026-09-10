import type { LibrarySnapshot } from "./game";
export interface BackupManifest {
  format: "gamdow-archive";
  version: 1;
  library: Pick<
    LibrarySnapshot,
    "games" | "collections" | "genres" | "series" | "gallery"
  >;
  assets: { id: string; path: string; size: number; sha256?: string }[];
}
export interface BackupImportSession {
  id: string;
  files: { originalId: string; mediaId: string; path: string }[];
}
