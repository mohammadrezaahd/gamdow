import "server-only";
import { Buffer } from "node:buffer";
import { HttpError } from "./http";
import type { AccountDocument } from "./database";
import { database } from "./database";
import {
  ensureLegacyBaselines,
  flushTimelineOutbox,
} from "./game-activity/timeline";
import { libraryView } from "./library-storage";
import type { Game } from "@/types/game";
import { statuses } from "@/lib/library-schema";
import type {
  ActivityBreakdown,
  ActivityFeedItem,
  ActivityGameSummary,
  ActivityLogPage,
  ActivityPeriodSummary,
  ActivityStatistics,
  ActivityStatisticsQuery,
  ActivityWeekdaySummary,
  GameActivityEvent,
} from "@/types/game-activity";
import type { GameActivityEventDocument } from "./game-activity/models";

const DAY_MS = 86_400_000;

interface MutableBreakdown {
  key: string;
  label: string;
  minutes: number;
  events: number;
  gameIds: Set<string>;
  days: Set<string>;
}

function emptyPeriod(period: string): ActivityPeriodSummary {
  return {
    period,
    eventCount: 0,
    activeGames: 0,
    statusChanges: 0,
    playtimeUpdates: 0,
    minutesChanged: 0,
    minutesGained: 0,
    progressUpdates: 0,
    progressChanged: 0,
    progressGained: 0,
    started: 0,
    completed: 0,
  };
}

function updatePeriod(
  periods: Map<string, ActivityPeriodSummary>,
  gamesByPeriod: Map<string, Set<string>>,
  key: string,
  gameId: string,
  event: GameActivityEvent,
) {
  const summary = periods.get(key) ?? emptyPeriod(key);
  summary.eventCount += 1;
  if (event.type === "STATUS_CHANGED") summary.statusChanges += 1;
  if (event.type === "STARTED") summary.started += 1;
  if (event.type === "COMPLETED") summary.completed += 1;
  if (event.type === "PLAYTIME_UPDATED" || event.type === "EXTERNAL_ACTIVITY") {
    const delta = event.deltaMinutes ?? 0;
    summary.playtimeUpdates += 1;
    summary.minutesChanged += delta;
    summary.minutesGained += Math.max(0, delta);
  }
  if (event.type === "PROGRESS_UPDATED") {
    const delta = event.deltaProgress ?? 0;
    summary.progressUpdates += 1;
    summary.progressChanged += delta;
    summary.progressGained += Math.max(0, delta);
  }
  periods.set(key, summary);
  const games = gamesByPeriod.get(key) ?? new Set<string>();
  games.add(gameId);
  gamesByPeriod.set(key, games);
}

function sortPeriods(periods: Map<string, ActivityPeriodSummary>) {
  return [...periods.values()].sort((a, b) => b.period.localeCompare(a.period));
}

function publicEvent(document: GameActivityEventDocument): ActivityFeedItem {
  const { _id: _ignored, userId: _userId, ...event } = document;
  return event as ActivityFeedItem;
}

function eventDate(event: GameActivityEvent, formatter: Intl.DateTimeFormat) {
  const parts = formatter.formatToParts(new Date(event.occurredAt));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function localWeekday(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date, 12)).getUTCDay();
}

function mergeActivity(
  summary: ActivityGameSummary,
  activeDays: Set<string>,
  event: GameActivityEvent,
  day: string,
) {
  summary.eventCount += 1;
  activeDays.add(day);
  summary.activeDays = activeDays.size;
  if (!summary.firstActivityAt || event.occurredAt < summary.firstActivityAt)
    summary.firstActivityAt = event.occurredAt;
  if (!summary.lastActivityAt || event.occurredAt > summary.lastActivityAt)
    summary.lastActivityAt = event.occurredAt;
  if (event.type === "STATUS_CHANGED") summary.statusChanges += 1;
  if (event.type === "PLAYTIME_UPDATED" || event.type === "EXTERNAL_ACTIVITY") {
    summary.playtimeUpdates += 1;
    summary.minutesChanged += event.deltaMinutes ?? 0;
  }
  if (event.type === "PROGRESS_UPDATED") {
    summary.progressUpdates += 1;
    summary.progressChanged += event.deltaProgress ?? 0;
  }
}

function gameSummary(game: Game): ActivityGameSummary {
  return {
    gameId: game.id,
    title: game.title,
    source: game.source ?? "MANUAL",
    status: game.status,
    totalMinutes:
      game.hoursPlayed === undefined ? 0 : Math.round(game.hoursPlayed * 60),
    eventCount: 0,
    statusChanges: 0,
    playtimeUpdates: 0,
    progressUpdates: 0,
    minutesChanged: 0,
    progressChanged: 0,
    activeDays: 0,
  };
}

function getBreakdown(
  rows: Map<string, MutableBreakdown>,
  key: string,
): MutableBreakdown {
  const row = rows.get(key) ?? {
    key,
    label: key,
    minutes: 0,
    events: 0,
    gameIds: new Set<string>(),
    days: new Set<string>(),
  };
  rows.set(key, row);
  return row;
}

function seedBreakdown(
  rows: Map<string, MutableBreakdown>,
  key: string,
  game: Game,
  minutes: number,
) {
  const row = getBreakdown(rows, key);
  if (!row.gameIds.has(game.id)) {
    row.gameIds.add(game.id);
    row.minutes += minutes;
  }
}

function recordBreakdown(
  rows: Map<string, MutableBreakdown>,
  key: string,
  gameId: string,
  day: string,
) {
  const row = getBreakdown(rows, key);
  row.events += 1;
  row.gameIds.add(gameId);
  row.days.add(day);
}

function finishBreakdown(rows: Map<string, MutableBreakdown>): ActivityBreakdown[] {
  return [...rows.values()]
    .map((row) => ({
      key: row.key,
      label: row.label,
      minutes: Math.round(row.minutes),
      events: row.events,
      games: row.gameIds.size,
      activeDays: row.days.size,
    }))
    .sort(
      (a, b) =>
        b.minutes - a.minutes || b.events - a.events || a.label.localeCompare(b.label),
    );
}

function matches(game: Game, query: ActivityStatisticsQuery) {
  return (
    (!query.genre || game.genres.includes(query.genre)) &&
    (!query.platform || game.platform === query.platform) &&
    (!query.status || game.status === query.status) &&
    (!query.source || (game.source ?? "MANUAL") === query.source) &&
    (query.favorite === undefined || game.favorite === query.favorite)
  );
}

function hasLibraryFilters(query: ActivityStatisticsQuery) {
  return Boolean(
    query.genre ||
      query.platform ||
      query.status ||
      query.source ||
      query.favorite !== undefined,
  );
}

function eventFilterKeys(event: GameActivityEvent, game?: Game) {
  const genres = event.genres?.length ? event.genres : game?.genres ?? [];
  const platforms = event.platform ? [event.platform] : game?.platform ? [game.platform] : [];
  return {
    genres: genres.length ? [...new Set(genres)] : ["Unassigned"],
    platforms: platforms[0] ? platforms : ["Unknown platform"],
  };
}

function normalizeTimeZone(value?: string) {
  if (!value) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return value;
  } catch {
    return "UTC";
  }
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

function defaultDateRange(timeZone: string) {
  const toDate = datePartInZone(new Date(), timeZone);
  const fromDate = new Date(Date.parse(`${toDate}T12:00:00.000Z`) - 89 * DAY_MS)
    .toISOString()
    .slice(0, 10);
  return { fromDate, toDate };
}

function encodeCursor(event: GameActivityEvent) {
  return Buffer.from(
    JSON.stringify({ occurredAt: event.occurredAt, id: event.id }),
  ).toString("base64url");
}

function decodeCursor(value?: string) {
  if (!value) return undefined;
  try {
    if (value.length > 16_384) throw new Error();
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString()) as {
      occurredAt?: unknown;
      id?: unknown;
    };
    if (
      typeof parsed.occurredAt !== "string" ||
      !Number.isFinite(Date.parse(parsed.occurredAt)) ||
      typeof parsed.id !== "string" ||
      parsed.id.length > 12_000
    )
      throw new Error();
    return { occurredAt: parsed.occurredAt, id: parsed.id };
  } catch {
    throw new HttpError(400, "Invalid activity log cursor.", "INVALID_CURSOR");
  }
}

/** Build complete library totals and date-windowed event analytics. */
export async function activityStatistics(
  account: Pick<AccountDocument, "_id" | "snapshot" | "revision">,
  query: ActivityStatisticsQuery = {},
): Promise<ActivityStatistics> {
  await flushTimelineOutbox(account._id);
  const [snapshot, db] = await Promise.all([libraryView(account), database()]);
  const timeZone = normalizeTimeZone(query.timeZone);
  const defaultRange = defaultDateRange(timeZone);
  const fromDate = query.fromDate ?? defaultRange.fromDate;
  const toDate = query.toDate ?? defaultRange.toDate;
  await ensureLegacyBaselines(account, snapshot.games);
  const calendarFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const matchingGames = snapshot.games.filter((game) => matches(game, query));
  const gamesById = new Map(matchingGames.map((game) => [game.id, game]));
  const matchingGameIds = [...gamesById.keys()];
  const games = new Map(matchingGames.map((game) => [game.id, gameSummary(game)]));
  const activeDaysByGame = new Map<string, Set<string>>();
  const monthly = new Map<string, ActivityPeriodSummary>();
  const daily = new Map<string, ActivityPeriodSummary>();
  const monthlyGames = new Map<string, Set<string>>();
  const dailyGames = new Map<string, Set<string>>();
  for (let offset = 0; offset < 366; offset += 1) {
    const day = new Date(
      Date.parse(`${fromDate}T12:00:00.000Z`) + offset * DAY_MS,
    )
      .toISOString()
      .slice(0, 10);
    if (day > toDate) break;
    const month = day.slice(0, 7);
    if (!monthly.has(month)) monthly.set(month, emptyPeriod(month));
    daily.set(day, emptyPeriod(day));
  }
  const allActiveDays = new Set<string>();
  const playDays = new Set<string>();
  const weekdays = Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    label: new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(2023, 0, 1 + weekday, 12))),
    minutes: 0,
    minutesChanged: 0,
    events: 0,
    activeDays: 0,
  } satisfies ActivityWeekdaySummary));
  const weekdayDays = Array.from({ length: 7 }, () => new Set<string>());
  const genres = new Map<string, MutableBreakdown>();
  const platforms = new Map<string, MutableBreakdown>();
  const sources = new Map<string, MutableBreakdown>();
  const statusRows = new Map<string, MutableBreakdown>();

  for (const status of statuses) getBreakdown(statusRows, status);
  for (const game of matchingGames) {
    const minutes = game.hoursPlayed === undefined ? 0 : game.hoursPlayed * 60;
    const source = game.source ?? "MANUAL";
    const genreKeys = game.genres.length ? [...new Set(game.genres)] : ["Unassigned"];
    const platform = game.platform || "Unknown platform";
    for (const key of genreKeys) seedBreakdown(genres, key, game, minutes);
    seedBreakdown(platforms, platform, game, minutes);
    seedBreakdown(sources, source, game, minutes);
    seedBreakdown(statusRows, game.status, game, minutes);
  }

  const steamAppIds = matchingGames
    .filter((game) => game.source === "STEAM" && game.steamAppId !== undefined)
    .map((game) => game.steamAppId!);
  if (steamAppIds.length) {
    const connection = await db.steamConnections.findOne({ _id: account._id });
    if (connection) {
      const steamRows = await db.steamUserGames
        .find(
          {
            userId: account._id,
            generation: connection.generation,
            steamAppId: { $in: steamAppIds },
          },
          { projection: { steamAppId: 1, playtime: 1 } },
        )
        .toArray();
      const gamesByAppId = new Map(
        matchingGames.flatMap((game) =>
          game.steamAppId ? [[game.steamAppId, game] as const] : [],
        ),
      );
      for (const row of steamRows) {
        const game = gamesByAppId.get(row.steamAppId);
        const lastPlayedAt = row.playtime?.lastPlayedAt;
        if (game && lastPlayedAt) games.get(game.id)!.steamLastPlayedAt = lastPlayedAt;
      }
    }
  }

  const allEventsFilter = {
    userId: account._id,
    ...(
      hasLibraryFilters(query)
        ? { gameId: { $in: matchingGameIds } }
        : {}
    ),
  };
  const analyticsEventsFilter = {
    userId: account._id,
    ...(hasLibraryFilters(query) ? { gameId: { $in: matchingGameIds } } : {}),
  };
  const [totalEvents, baselineRecords] = await Promise.all([
    db.gameActivityEvents.countDocuments(allEventsFilter),
    db.gameActivityEvents.countDocuments({ ...allEventsFilter, type: "BASELINE" }),
  ]);
  // The query deliberately includes a one-day UTC margin on either side; the
  // local calendar-day check below is exact for every IANA UTC offset.
  const coarseFrom = new Date(
    Date.parse(`${fromDate}T00:00:00.000Z`) - DAY_MS,
  ).toISOString();
  const coarseTo = new Date(
    Date.parse(`${toDate}T00:00:00.000Z`) + 2 * DAY_MS,
  ).toISOString();
  let windowEvents = 0;
  let statusChanges = 0;
  let playtimeUpdates = 0;
  let progressUpdates = 0;
  const cursor = db.gameActivityEvents
    .find({
      ...analyticsEventsFilter,
      type: { $ne: "BASELINE" },
      occurredAt: { $gte: coarseFrom, $lt: coarseTo },
    })
    .sort({ occurredAt: -1, id: -1 });

  for await (const document of cursor) {
    const game = gamesById.get(document.gameId);
    if (!game && hasLibraryFilters(query)) continue;
    const event = publicEvent(document);
    const day = eventDate(event, calendarFormatter);
    if (day < fromDate || day > toDate) continue;
    const summary = games.get(document.gameId);
    if (summary) {
      const activeDays = activeDaysByGame.get(document.gameId) ?? new Set<string>();
      activeDaysByGame.set(document.gameId, activeDays);
      mergeActivity(summary, activeDays, event, day);
    }
    updatePeriod(monthly, monthlyGames, day.slice(0, 7), document.gameId, event);
    updatePeriod(daily, dailyGames, day, document.gameId, event);
    allActiveDays.add(day);
    windowEvents += 1;
    if (event.type === "STATUS_CHANGED") statusChanges += 1;
    if (event.type === "PLAYTIME_UPDATED" || event.type === "EXTERNAL_ACTIVITY")
      playtimeUpdates += 1;
    if (event.type === "PROGRESS_UPDATED") progressUpdates += 1;

    if (event.type === "PLAYTIME_UPDATED" || event.type === "EXTERNAL_ACTIVITY") {
      const weekday = localWeekday(day);
      const row = weekdays[weekday];
      const delta = event.deltaMinutes ?? 0;
      row.minutes += Math.max(0, delta);
      row.minutesChanged += delta;
      row.events += 1;
      weekdayDays[weekday].add(day);
      playDays.add(day);
    }
    const keys = eventFilterKeys(event, game);
    for (const key of keys.genres) recordBreakdown(genres, key, document.gameId, day);
    for (const key of keys.platforms) recordBreakdown(platforms, key, document.gameId, day);
    recordBreakdown(sources, event.source, document.gameId, day);
    if (event.type === "STATUS_CHANGED" && event.toStatus) {
      const row = getBreakdown(statusRows, event.toStatus);
      row.events += 1;
      row.days.add(day);
    }
  }

  for (const [period, gameIds] of monthlyGames)
    monthly.get(period)!.activeGames = gameIds.size;
  for (const [period, gameIds] of dailyGames)
    daily.get(period)!.activeGames = gameIds.size;
  weekdays.forEach((row, index) => {
    row.minutes = Math.round(row.minutes);
    row.minutesChanged = Math.round(row.minutesChanged);
    row.activeDays = weekdayDays[index].size;
  });

  const totalMinutes = matchingGames.reduce(
    (total, game) => total + (game.hoursPlayed ? game.hoursPlayed * 60 : 0),
    0,
  );
  const availableFilters = {
    genres: [...new Set(snapshot.games.flatMap((game) => game.genres))].sort(
      (a, b) => a.localeCompare(b),
    ),
    platforms: [...new Set(snapshot.games.map((game) => game.platform).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b),
    ),
    statuses: [...statuses],
    sources: [...new Set(snapshot.games.map((game) => game.source ?? "MANUAL"))].sort(),
  };

  return {
    generatedAt: new Date().toISOString(),
    timeZone,
    fromDate,
    toDate,
    availableFilters,
    totalGames: matchingGames.length,
    trackedGames: matchingGames.filter((game) => game.hoursPlayed !== undefined).length,
    totalMinutes: Math.round(totalMinutes),
    totalEvents,
    windowEvents,
    baselineRecords,
    activeDays: allActiveDays.size,
    playDays: playDays.size,
    statusChanges,
    playtimeUpdates,
    progressUpdates,
    monthly: sortPeriods(monthly),
    daily: sortPeriods(daily),
    genres: finishBreakdown(genres),
    platforms: finishBreakdown(platforms),
    sources: finishBreakdown(sources),
    statuses: finishBreakdown(statusRows).filter((row) => row.games || row.events),
    weekdays,
    games: [...games.values()].sort(
      (a, b) => b.totalMinutes - a.totalMinutes || a.title.localeCompare(b.title),
    ),
  };
}

/** Return every retained event in bounded, stable pages for the dedicated Log table. */
export async function activityLog(
  account: Pick<AccountDocument, "_id" | "snapshot" | "revision">,
  query: ActivityStatisticsQuery = {},
  cursorValue?: string,
  requestedLimit = 50,
  includeTotal = true,
): Promise<ActivityLogPage> {
  await flushTimelineOutbox(account._id);
  const [snapshot, db] = await Promise.all([libraryView(account), database()]);
  await ensureLegacyBaselines(account, snapshot.games);
  const matchingGames = snapshot.games.filter((game) => matches(game, query));
  const gameTitles = new Map(matchingGames.map((game) => [game.id, game.title]));
  const limit = Math.max(1, Math.min(100, Math.floor(requestedLimit) || 50));
  const restrictToMatchingGames = hasLibraryFilters(query);
  if (restrictToMatchingGames && !matchingGames.length)
    return { items: [], ...(includeTotal ? { total: 0 } : {}), limit };

  const before = decodeCursor(cursorValue);
  const filter = {
    userId: account._id,
    ...(restrictToMatchingGames ? { gameId: { $in: [...gameTitles.keys()] } } : {}),
    ...(before
      ? {
          $or: [
            { occurredAt: { $lt: before.occurredAt } },
            { occurredAt: before.occurredAt, id: { $lt: before.id } },
          ],
        }
      : {}),
  };
  const totalFilter = {
    userId: account._id,
    ...(restrictToMatchingGames ? { gameId: { $in: [...gameTitles.keys()] } } : {}),
  };
  const [total, documents] = await Promise.all([
    includeTotal ? db.gameActivityEvents.countDocuments(totalFilter) : undefined,
    db.gameActivityEvents
      .find(filter)
      .sort({ occurredAt: -1, id: -1 })
      .limit(limit + 1)
      .toArray(),
  ]);
  const hasMore = documents.length > limit;
  const page = documents.slice(0, limit);
  return {
    items: page.map((document) => ({
      ...publicEvent(document),
      gameTitle:
        gameTitles.get(document.gameId) ?? document.gameTitle ?? "Removed library game",
    })),
    ...(total === undefined ? {} : { total }),
    limit,
    ...(hasMore && page.length
      ? { nextCursor: encodeCursor(page[page.length - 1]) }
      : {}),
  };
}
