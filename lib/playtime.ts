export const MAX_PLAYTIME_HOURS = 1000000;
export function adjustPlaytime(
  hours: number | undefined,
  deltaMinutes: number,
): number {
  if (
    !Number.isSafeInteger(deltaMinutes) ||
    Math.abs(deltaMinutes) > 1440 ||
    deltaMinutes === 0
  )
    throw new Error("Choose between 1 and 1,440 minutes.");
  const minutes = Math.round((hours ?? 0) * 60) + deltaMinutes;
  if (minutes < 0 || minutes > MAX_PLAYTIME_HOURS * 60)
    throw new Error("Time played must stay between zero and 1,000,000 hours.");
  return minutes / 60;
}
export function formatPlaytime(hours: number | undefined) {
  if (hours === undefined) return "Not recorded";
  const minutes = Math.round(hours * 60);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
