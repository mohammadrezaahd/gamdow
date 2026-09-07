import type { Game } from "@/types/game";
export const searchKey = (value: string) =>
  value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("en-US");
// Keep user spelling; ignore empty and case-insensitive duplicate labels.
export function normalizeTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  return tags
    .map((tag) => tag.trim())
    .filter((tag) => {
      const key = searchKey(tag);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
export function matchesGameSearch(
  game: Pick<Game, "title" | "tags">,
  query: string,
) {
  const key = searchKey(query);
  return (
    !key ||
    [game.title, ...game.tags].some((value) => searchKey(value).includes(key))
  );
}
