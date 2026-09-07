import type {
  LibraryResponse,
  SaveLibraryInput,
  SaveLibraryResponse,
} from "@/types/api";
import { apiRequest, ApiError } from "./http-client";
export { parseLibrary, statuses, plans } from "@/lib/library-schema";
export const libraryRepository = {
  load: () => apiRequest<LibraryResponse>("/api/library"),
  save: (input: SaveLibraryInput) => {
    const body = JSON.stringify(input);
    if (new TextEncoder().encode(body).length > 3 * 1024 * 1024)
      return Promise.reject(
        new ApiError(
          413,
          "This archive exceeds the 3 MB metadata limit. Export a backup and reduce long text entries before saving.",
          "PAYLOAD_TOO_LARGE",
        ),
      );
    return apiRequest<SaveLibraryResponse>("/api/library", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    });
  },
};
