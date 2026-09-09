/** Only Valve-owned image hosts, HTTPS, no credentials or alternate ports. */
export function isSteamImage(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      [
        "steamstatic.com",
        "steamusercontent.com",
        "steamcdn-a.akamaihd.net",
      ].some(
        (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
      )
    );
  } catch {
    return false;
  }
}
