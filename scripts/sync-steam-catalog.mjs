// Operator-run bootstrap/resume. Sends only to the configured APP_URL; never follows redirects.
const origin = process.env.APP_URL;
const secret = process.env.CRON_SECRET;
if (!origin || !secret)
  throw new Error(
    "Set APP_URL and CRON_SECRET in the selected environment file.",
  );
const url = new URL("/api/steam/catalog/sync", origin);
if (
  url.protocol !== "https:" &&
  !(
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(url.hostname)
  )
)
  throw new Error("APP_URL must be HTTPS or localhost.");
let complete = false;
for (let page = 1; page <= 200; page++) {
  const response = await fetch(url, {
    method: "POST",
    redirect: "error",
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(60000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      `Catalog sync stopped (${response.status}). ${result?.error || "Retry the same command to resume."}`,
    );
  console.log(
    `Page ${page}: ${result.imported} catalog entries; ${result.hasMore ? "more pages remain" : "pass complete"}.`,
  );
  if (!result.hasMore) {
    complete = true;
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, 1500));
}
if (!complete)
  console.log(
    "Page budget reached. Run the command again to resume from the saved cursor.",
  );
