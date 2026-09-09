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
    // Steam public fields are a read projection. Do not repeatedly send them back
    // with personal edits (or let a large cached description consume the upload budget).
    const body = JSON.stringify({
      ...input,
      snapshot: {
        ...input.snapshot,
        games: input.snapshot.games.map((game) =>
          game.source === "STEAM"
            ? {
                ...game,
                title: `Steam app ${game.steamAppId}`,
                description: "",
                genres: [],
                coverImage: "",
                heroImage: undefined,
                releaseYear: undefined,
                releaseDate: undefined,
              }
            : game,
        ),
      },
    });
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
