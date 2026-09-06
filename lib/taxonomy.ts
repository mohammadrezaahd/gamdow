import type { Game, LibrarySnapshot } from "@/types/game";
import type {
  Genre,
  GameSeries,
  TaxonomyEntry,
  TaxonomyKind,
  TaxonomyMutation,
} from "@/types/taxonomy";
export const taxonomyKey = (name: string) =>
  name.trim().toLocaleLowerCase("en-US");
const seedDate = "2026-09-01T00:00:00.000Z";
type LegacySnapshot = Omit<LibrarySnapshot, "genres" | "series"> & {
  genres?: Genre[];
  series?: GameSeries[];
};
// Names remain display fields for existing clients; IDs are the API-facing links.
export function normalizeTaxonomies(snapshot: LegacySnapshot): LibrarySnapshot {
  const genres = [...(snapshot.genres ?? [])];
  const series = [...(snapshot.series ?? [])];
  const ensure = (kind: TaxonomyKind, name: string) => {
    const list = kind === "genre" ? genres : series;
    const clean = name.trim();
    let found = list.find(
      (entry) => taxonomyKey(entry.name) === taxonomyKey(clean),
    );
    if (!found) {
      let id = `${kind}-${encodeURIComponent(taxonomyKey(clean))}`;
      while (list.some((entry) => entry.id === id)) id += "-legacy";
      const entry = {
        id,
        name: clean,
        description: "",
        createdAt: seedDate,
        updatedAt: seedDate,
      };
      if (kind === "genre") {
        const value: Genre = { ...entry, kind };
        genres.push(value);
        found = value;
      } else {
        const value: GameSeries = { ...entry, kind };
        series.push(value);
        found = value;
      }
    }
    return found;
  };
  const games = snapshot.games.map((game) => {
    const linkedGenres = [
      ...new Map(
        game.genres
          .filter((name) => name.trim())
          .map((name) => {
            const genre = ensure("genre", name);
            return [genre.id, genre] as const;
          }),
      ).values(),
    ];
    const linkedSeries = game.series?.trim()
      ? ensure("series", game.series)
      : undefined;
    return {
      ...game,
      genres: linkedGenres.map((g) => g.name),
      genreIds: linkedGenres.map((g) => g.id),
      series: linkedSeries?.name,
      seriesId: linkedSeries?.id,
    };
  });
  return { ...snapshot, games, genres, series };
}
export function saveTaxonomy(
  snapshot: LibrarySnapshot,
  mutation: TaxonomyMutation,
  id: string,
  timestamp: string,
): LibrarySnapshot {
  const field = mutation.kind === "genre" ? "genres" : "series";
  const list: TaxonomyEntry[] = snapshot[field];
  const name = mutation.input.name.trim();
  if (!name) throw new Error("A name is required.");
  if (
    list.some(
      (entry) =>
        entry.id !== mutation.id &&
        taxonomyKey(entry.name) === taxonomyKey(name),
    )
  )
    throw new Error("This name already exists.");
  const previous = list.find((entry) => entry.id === mutation.id);
  if (mutation.id && !previous)
    throw new Error("This category no longer exists.");
  const entry: TaxonomyEntry = {
    id: previous?.id ?? id,
    kind: mutation.kind,
    name,
    description: mutation.input.description.trim(),
    createdAt: previous?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
  const entries = previous
    ? list.map((item) => (item.id === previous.id ? entry : item))
    : [...list, entry];
  const games = previous
    ? snapshot.games.map((game) =>
        mutation.kind === "genre"
          ? {
              ...game,
              genres: game.genres.map((g) =>
                taxonomyKey(g) === taxonomyKey(previous.name) ? name : g,
              ),
            }
          : {
              ...game,
              series:
                game.series &&
                taxonomyKey(game.series) === taxonomyKey(previous.name)
                  ? name
                  : game.series,
            },
      )
    : snapshot.games;
  return normalizeTaxonomies({
    ...snapshot,
    games,
    ...(mutation.kind === "genre"
      ? { genres: entries as Genre[] }
      : { series: entries as GameSeries[] }),
  });
}
export function deleteTaxonomy(
  snapshot: LibrarySnapshot,
  kind: TaxonomyKind,
  id: string,
): LibrarySnapshot {
  const entry = (kind === "genre" ? snapshot.genres : snapshot.series).find(
    (item) => item.id === id,
  );
  if (!entry) return snapshot;
  const games: Game[] = snapshot.games.map((game) =>
    kind === "genre"
      ? {
          ...game,
          genres: game.genres.filter(
            (name) => taxonomyKey(name) !== taxonomyKey(entry.name),
          ),
        }
      : {
          ...game,
          series:
            game.series && taxonomyKey(game.series) === taxonomyKey(entry.name)
              ? undefined
              : game.series,
        },
  );
  return normalizeTaxonomies({
    ...snapshot,
    games,
    ...(kind === "genre"
      ? { genres: snapshot.genres.filter((g) => g.id !== id) }
      : { series: snapshot.series.filter((s) => s.id !== id) }),
  });
}
