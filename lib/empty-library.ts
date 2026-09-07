import type { LibrarySnapshot } from "@/types/game";
export function createEmptyLibrary(
  id: string,
  displayName: string,
  timestamp: string,
): LibrarySnapshot {
  return {
    version: 1,
    games: [],
    collections: [],
    genres: [],
    series: [],
    gallery: [],
    preferences: {
      displayName,
      defaultLibraryView: "grid",
      hideSpoilers: true,
    },
    profile: {
      id,
      displayName,
      username: "",
      bio: "",
      location: "",
      avatarImage: "",
      favoritePlatforms: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };
}
