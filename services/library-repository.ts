import { readSnapshot, writeSnapshot } from "./browser-store";
import {
  fakeCollections,
  fakeGalleryItems,
  fakeGames,
  fakePreferences,
} from "@/data/fake-data";
import type { LibraryRepository, LibrarySnapshot } from "@/types/game";
export const statuses = [
  "Not started",
  "Playing",
  "On hold",
  "Completed",
  "Dropped",
] as const;
export const plans = [
  "None",
  "Up next",
  "Soon",
  "Someday",
  "Not interested",
] as const;
export const initialLibrary: LibrarySnapshot = {
  version: 1,
  games: fakeGames,
  collections: fakeCollections,
  gallery: fakeGalleryItems,
  preferences: fakePreferences,
};
const key = "gamdow.library.v1";
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const strings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");
const optionalString = (v: unknown) => v === undefined || typeof v === "string";
const number = (v: unknown, min: number, max = Infinity) =>
  v === undefined ||
  (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max);
export function parseLibrary(value: unknown): LibrarySnapshot {
  if (
    !record(value) ||
    value.version !== 1 ||
    !Array.isArray(value.games) ||
    !Array.isArray(value.collections) ||
    !Array.isArray(value.gallery) ||
    !record(value.preferences)
  )
    throw new Error("Choose a valid gamdow backup (version 1).");
  const ids = new Set<string>();
  for (const g of value.games) {
    if (
      !record(g) ||
      typeof g.id !== "string" ||
      ids.has(g.id) ||
      typeof g.title !== "string" ||
      !g.title.trim() ||
      !strings(g.genres) ||
      typeof g.platform !== "string" ||
      !statuses.includes(g.status as never) ||
      !plans.includes(g.plan as never) ||
      typeof g.favorite !== "boolean" ||
      typeof g.description !== "string" ||
      typeof g.coverImage !== "string" ||
      typeof g.updatedAt !== "string" ||
      !number(g.rating, 0, 10) ||
      !number(g.hoursPlayed, 0) ||
      !number(g.releaseYear, 1950, 2200) ||
      !number(g.planOrder, 0) ||
      !Array.isArray(g.journalEntries) ||
      !g.journalEntries.every(
        (j) =>
          record(j) &&
          typeof j.id === "string" &&
          typeof j.date === "string" &&
          typeof j.text === "string",
      )
    )
      throw new Error("The backup contains invalid game data.");
    for (const field of [
      "series",
      "heroImage",
      "review",
      "reviewPros",
      "reviewCons",
      "startedAt",
      "completedAt",
      "plannedAt",
      "planNote",
    ])
      if (!optionalString(g[field]))
        throw new Error("Invalid game field in backup.");
    if (
      g.scoreBreakdown !== undefined &&
      (!record(g.scoreBreakdown) ||
        !Object.values(g.scoreBreakdown).every((v) => number(v, 0, 10)))
    )
      throw new Error("Invalid review scores.");
    if (g.reviewSpoiler !== undefined && typeof g.reviewSpoiler !== "boolean")
      throw new Error("Invalid spoiler flag.");
    if (
      g.edition !== undefined &&
      !["Main game", "DLC", "Remake", "Remaster"].includes(g.edition as string)
    )
      throw new Error("Invalid edition.");
    ids.add(g.id);
  }
  const unique = (items: unknown[]) => {
    const seen = new Set();
    return items.every((i) => {
      if (!record(i) || typeof i.id !== "string" || seen.has(i.id))
        return false;
      seen.add(i.id);
      return true;
    });
  };
  if (
    !unique(value.collections) ||
    !value.collections.every(
      (c) =>
        record(c) &&
        typeof c.name === "string" &&
        typeof c.description === "string" &&
        strings(c.gameIds) &&
        c.gameIds.every((id) => ids.has(id)),
    )
  )
    throw new Error("Invalid collections in backup.");
  if (
    !unique(value.gallery) ||
    !value.gallery.every(
      (p) =>
        record(p) &&
        typeof p.gameId === "string" &&
        ids.has(p.gameId) &&
        typeof p.image === "string" &&
        typeof p.caption === "string" &&
        typeof p.capturedAt === "string" &&
        typeof p.favorite === "boolean" &&
        typeof p.spoiler === "boolean",
    )
  )
    throw new Error("Invalid gallery in backup.");
  const p = value.preferences;
  if (
    typeof p.displayName !== "string" ||
    !["grid", "list"].includes(p.defaultLibraryView as string) ||
    typeof p.hideSpoilers !== "boolean"
  )
    throw new Error("Invalid preferences in backup.");
  return value as unknown as LibrarySnapshot;
}
// Replace this adapter with an HTTP repository when the API is available.
export const libraryRepository: LibraryRepository = {
  async load() {
    const snapshot = await readSnapshot();
    if (snapshot !== undefined) return parseLibrary(snapshot);
    // Migrate an existing v1 localStorage archive without deleting its backup.
    const saved = localStorage.getItem(key);
    return saved
      ? parseLibrary(JSON.parse(saved))
      : structuredClone(initialLibrary);
  },
  async save(snapshot) {
    await writeSnapshot(snapshot);
  },
};
