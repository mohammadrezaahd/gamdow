import { activityStatistics } from "@/server/statistics";
import { failure, HttpError, json } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { requireSession } from "@/server/session";
import type { ActivityStatisticsQuery } from "@/types/game-activity";
import type { GameStatus } from "@/types/game";
import type { GameActivitySource } from "@/types/game-activity";

export const runtime = "nodejs";

const DAY_MS = 86_400_000;

function shiftDay(day: string, delta: number) {
  return new Date(Date.parse(`${day}T12:00:00.000Z`) + delta * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

function datePartInZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function GET(request: Request) {
  try {
    const { account } = await requireSession();
    await rateLimit(`statistics:${account._id}`, 60, 60);
    const params = new URL(request.url).searchParams;
    const value = (key: string) => {
      const item = params.get(key)?.trim();
      return item && item.length <= 200 ? item : undefined;
    };
    const favorite = value("favorite");
    const timeZone = value("timeZone") ?? "UTC";
    try {
      new Intl.DateTimeFormat("en-US", { timeZone });
    } catch {
      throw new HttpError(400, "Invalid time zone.", "INVALID_TIME_ZONE");
    }
    let fromDate = value("fromDate");
    let toDate = value("toDate");
    if (!fromDate && !toDate) {
      toDate = datePartInZone(new Date(), timeZone);
      fromDate = shiftDay(toDate, -89);
    } else if (!fromDate || !toDate || !validDate(fromDate) || !validDate(toDate)) {
      throw new HttpError(400, "Choose a valid start and end date.", "INVALID_DATE_RANGE");
    }
    if (!validDate(fromDate!) || !validDate(toDate!) || toDate! < fromDate!)
      throw new HttpError(400, "Choose a valid start and end date.", "INVALID_DATE_RANGE");
    const selectedFromDate = fromDate!;
    const selectedToDate = toDate!;
    const dayCount = (Date.parse(`${selectedToDate}T12:00:00.000Z`) - Date.parse(`${selectedFromDate}T12:00:00.000Z`)) / DAY_MS + 1;
    if (dayCount > 366)
      throw new HttpError(400, "Choose a date range of at most 366 days.", "DATE_RANGE_TOO_LARGE");
    const query: ActivityStatisticsQuery = {
      timeZone,
      fromDate: selectedFromDate,
      toDate: selectedToDate,
      genre: value("genre"),
      platform: value("platform"),
      status: value("status") as GameStatus | undefined,
      source: value("source") as GameActivitySource | undefined,
      ...(favorite === "true" || favorite === "false"
        ? { favorite: favorite === "true" }
        : {}),
    };
    return json(await activityStatistics(account, query));
  } catch (error) {
    return failure(error);
  }
}
