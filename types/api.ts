import type { LibrarySnapshot } from "./game";
export interface LibraryResponse {
  snapshot: LibrarySnapshot;
  revision: number;
}
export interface SaveLibraryInput extends LibraryResponse {
  mutationId: string;
}
export interface SaveLibraryResponse {
  revision: number;
}
export interface ApiErrorResponse {
  error: string;
  code: string;
}
export interface MediaUploadResponse {
  id: string;
  src: string;
  width: number;
  height: number;
}
