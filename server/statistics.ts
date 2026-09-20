import "server-only";
import type { AccountDocument } from "./database";
import { database } from "./database";
import { flushTimelineOutbox } from "./game-activity/timeline";
import { libraryView } from "./library-storage";
import type { Game } from "@/types/game";
import type {
  ActivityFeedItem,
  ActivityGameSummary,
  ActivityPeriodSummary,
  ActivityStatistics,
  GameActivityEvent,
} from "@/types/game-activity";
import type { GameActivityEventDocument } from "./game-activity/models";

const MAX_EVENTS = 100_000;

function emptyPeriod(period: string): ActivityPeriodSummary {
  return {
    period,
    eventCount: 0,
    activeGames: 0,
    statusChanges: 0,
    playtimeUpdates: 0,
    minutesChanged: 0,
    minutesGained: 0,
    started: 0,
    completed: 0,
  };
}

function updatePeriod(
  periods: Map<string, ActivityPeriodSummary>,
  key: string,
  event: GameActivityEvent,
) {
  const summary = periods.get(key) ?? emptyPeriod(key);
  summary.eventCount += 1;
  if (event.type === "STATUS_CHANGED") summary.statusChanges += 1;
  // STARTED/COMPLETED are emitted alongside their status changes. Count the
  // semantic milestone once instead of double-counting the pair.
  if (event.type === "STARTED") summary.started += 1;
  if (event.type === "COMPLETED") summary.completed += 1;
  if (event.type === "PLAYTIME_UPDATED" || event.type === "EXTERNAL_ACTIVITY") {
    summary.playtimeUpdates += 1;
    summary.minutesChanged += event.deltaMinutes ?? 0;
    summary.minutesGained += Math.max(0, event.deltaMinutes ?? 0);
  }
  periods.set(key, summary);
}

function sortPeriods(periods: Map<string, ActivityPeriodSummary>) {
  return [...periods.values()].sort((a, b) =>
    b.period.localeCompare(a.period),
  );
}

function publicEvent(document: GameActivityEventDocument): ActivityFeedItem {
  const {
    _id: _ignored,
    userId: _userId,
    ...event
  } = document;
  return event as ActivityFeedItem;
}

function eventDate(event: GameActivityEvent) {
  return event.occurredAt.slice(0, 10);
}

function mergeActivity(
  summary: ActivityGameSummary,
  activeDays: Set<string>,
  event: GameActivityEvent,
) {
  summary.eventCount += 1;
  const day = eventDate(event);
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
    minutesChanged: 0,
    activeDays: 0,
  };
}

/**
 * Builds the archive-wide activity read model from the append-only event
 * collection. The current game list is joined separately so every game appears
 * in the game table, including games imported before activity tracking existed.
 */
export async function activityStatistics(
  account: Pick<AccountDocument, "_id" | "snapshot">,
): Promise<ActivityStatistics> {
  await flushTimelineOutbox(account._id);
  const [snapshot, db] = await Promise.all([
    libraryView(account),
    database(),
  ]);
  const documents = await db.gameActivityEvents
    .find({ userId: account._id })
    .sort({ occurredAt: -1, id: -1 })
    .limit(MAX_EVENTS)
    .toArray();

  const gamesById = new Map(snapshot.games.map((game) => [game.id, game]));
  const games = new Map(
    snapshot.games.map((game) => [game.id, gameSummary(game)]),
  );
  const activeDaysByGame = new Map<string, Set<string>>();
  const monthly = new Map<string, ActivityPeriodSummary>();
  const daily = new Map<string, ActivityPeriodSummary>();
  const activities: ActivityFeedItem[] = [];

  for (const document of documents) {
    const game = gamesById.get(document.gameId);
    // Deleted-game events should not leak into a user's statistics table.
    if (!game) continue;
    const event = publicEvent(document);
    activities.push({ ...event, gameTitle: game.title });
    const day = eventDate(event);
    updatePeriod(monthly, day.slice(0, 7), event);
    updatePeriod(daily, day, event);
    const summary = games.get(game.id)!;
    const activeDays = activeDaysByGame.get(game.id) ?? new Set<string>();
    activeDaysByGame.set(game.id, activeDays);
    mergeActivity(summary, activeDays, event);
  }

  // Active game counts are easier and less error-prone to calculate after all
  // event dates have been collected.
  for (const periods of [monthly, daily]) {
    for (const period of periods.values()) {
      period.activeGames = new Set(
        activities
          .filter((event) => {
            const date = eventDate(event);
            return periods === monthly
              ? date.startsWith(period.period)
              : date === period.period;
          })
          .map((event) => event.gameId),
      ).size;
    }
  }

  const totalMinutes = snapshot.games.reduce(
    (total, game) => total + (game.hoursPlayed ? game.hoursPlayed * 60 : 0),
    0,
  );
  const activeDays = new Set(activities.map(eventDate)).size;

  return {
    generatedAt: new Date().toISOString(),
    totalGames: snapshot.games.length,
    trackedGames: snapshot.games.filter(
      (game) => game.hoursPlayed !== undefined,
    ).length,
    totalMinutes: Math.round(totalMinutes),
    totalEvents: activities.length,
    activeDays,
    statusChanges: activities.filter(
      (event) => event.type === "STATUS_CHANGED",
    ).length,
    playtimeUpdates: activities.filter(
      (event) =>
        event.type === "PLAYTIME_UPDATED" || event.type === "EXTERNAL_ACTIVITY",
    ).length,
    monthly: sortPeriods(monthly),
    daily: sortPeriods(daily),
    games: [...games.values()].sort((a, b) => {
      if (b.totalMinutes !== a.totalMinutes)
        return b.totalMinutes - a.totalMinutes;
      return a.title.localeCompare(b.title);
    }),
    activities,
  };
}
