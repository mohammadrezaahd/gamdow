/** Official library artwork, never a user upload or a tiny app icon. */
export function steamArtwork(appId: number) {
  const base = `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}`;
  return {
    cover: `${base}/library_600x900_2x.jpg`,
    coverFallback: `${base}/library_600x900.jpg`,
    hero: `${base}/library_hero.jpg`,
    header: `${base}/header.jpg`,
  };
}
export function artworkFallbacks(src?: string): string[] {
  const match = src?.match(
    /^https:\/\/(?:[\w.-]+\.)?steamstatic\.com\/(?:store_item_assets\/)?steam\/apps\/(\d+)\/(library_600x900_2x\.jpg|library_600x900\.jpg|library_hero\.jpg)$/,
  );
  if (!match) return [];
  const art = steamArtwork(Number(match[1]));
  return match[2] === "library_600x900_2x.jpg"
    ? [art.coverFallback, art.header]
    : [art.header];
}
