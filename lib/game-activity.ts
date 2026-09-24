import type { Game } from "@/types/game";
import type {
  ExternalGameActivity,
  GameActivityEvent,
  GameActivitySource,
  GameStatusSuggestion,
} from "@/types/game-activity";

const DAY_MS = 86_400_000;
// Steam's activity feed should move a game to On hold after three weeks
// without a recorded play session. Keep this in one shared rule so imports and
// background refreshes behave identically.
const INACTIVITY_DAYS = 21;
const RECENT_ACTIVITY_DAYS = 14;

const datePart = (timestamp: string) => timestamp.slice(0, 10);
const activityTime = (date: string, now: string) =>
  date === datePart(now) ? now : `${date}T12:00:00.000Z`;
const minutes = (hours?: number) =>
  hours === undefined ? undefined : Math.round(hours * 60);

export interface ActivityMutationContext {
  mutationId: string;
  now: string;
  source: GameActivitySource;
  inferred?: boolean;
}

const event = (
  context: ActivityMutationContext,
  gameId: string,
  index: number,
  value: Omit<GameActivityEvent, "id" | "gameId" | "recordedAt" | "source">,
): GameActivityEvent => ({
  id: `${context.mutationId}:${gameId}:${index}`,
  gameId,
  recordedAt: context.now,
  source: context.source,
  inferred: context.inferred || undefined,
  ...value,
});

/**
 * Applies date invariants shared by forms and server writes.
 * Completion is explicit; moving away from Completed clears the old end date.
 */
export function normalizeGameTracking(
  previous: Game | undefined,
  candidate: Game,
  now: string,
): Game {
  const next = { ...candidate };
  const previousMinutes = minutes(previous?.hoursPlayed) ?? 0;
  const nextMinutes = minutes(next.hoursPlayed) ?? 0;
  const firstTrackedPlay = nextMinutes > previousMinutes;

  if (
    !next.startedAt &&
    (next.status === "Playing" || firstTrackedPlay)
  )
    next.startedAt = datePart(now);

  if (firstTrackedPlay && ["Not started", "On hold"].includes(next.status))
    next.status = "Playing";

  if (next.status === "Completed")
    next.completedAt ||= datePart(now);
  else if (previous?.status === "Completed" || next.completedAt)
    next.completedAt = undefined;

  return next;
}

export function deriveGameActivity(
  previous: Game | undefined,
  candidate: Game,
  context: ActivityMutationContext,
): { game: Game; events: GameActivityEvent[] } {
  const normalized = normalizeGameTracking(previous, candidate, context.now);
  // Provider policy is authoritative during a Steam refresh. In particular,
  // normalizeGameTracking's generic first-play rule must not turn a stale
  // Steam game back into Playing merely because its imported total changed.
  const game =
    context.source === "STEAM" && candidate.status !== "Playing"
      ? { ...normalized, status: candidate.status }
      : normalized;
  const events: GameActivityEvent[] = [];
  const add = (
    value: Omit<
      GameActivityEvent,
      "id" | "gameId" | "recordedAt" | "source" | "gameTitle" | "genres" | "platform" | "tags"
    >,
  ) =>
    events.push(
      event(context, game.id, events.length, {
        ...value,
        gameTitle: game.title,
        genres: [...game.genres],
        platform: game.platform,
        tags: [...game.tags],
      }),
    );

  if (!previous) {
    add({
      type: "ADDED",
      occurredAt: context.now,
      toStatus: game.status,
      note: "Added to the library",
    });
  } else if (previous.status !== game.status) {
    add({
      type: "STATUS_CHANGED",
      occurredAt: context.now,
      fromStatus: previous.status,
      toStatus: game.status,
    });
  }

  if (game.startedAt && game.startedAt !== previous?.startedAt) {
    add({
      type: previous?.startedAt ? "START_DATE_CHANGED" : "STARTED",
      occurredAt: activityTime(game.startedAt, context.now),
      note: previous?.startedAt
        ? `Start date changed from ${previous.startedAt}`
        : undefined,
    });
  } else if (previous?.startedAt && !game.startedAt) {
    add({
      type: "START_DATE_CLEARED",
      occurredAt: context.now,
      note: `Previous start date: ${previous.startedAt}`,
    });
  }

  if (
    game.status === "Completed" &&
    game.completedAt &&
    game.completedAt !== previous?.completedAt
  ) {
    add({
      type: previous?.completedAt ? "COMPLETION_DATE_CHANGED" : "COMPLETED",
      occurredAt: activityTime(game.completedAt, context.now),
      note: previous?.completedAt
        ? `Completion date changed from ${previous.completedAt}`
        : undefined,
    });
  } else if (previous?.completedAt && !game.completedAt) {
    add({
      type: "COMPLETION_CLEARED",
      occurredAt: context.now,
      note: `Previous completion date: ${previous.completedAt}`,
    });
  }

  const before = minutes(previous?.hoursPlayed);
  const after = minutes(game.hoursPlayed);
  if ((previous && before !== after) || (!previous && (after ?? 0) > 0)) {
    add({
      type: "PLAYTIME_UPDATED",
      occurredAt: context.now,
      previousMinutes: before ?? 0,
      totalMinutes: after ?? 0,
      deltaMinutes: (after ?? 0) - (before ?? 0),
    });
  }

  const previousProgress = previous?.manualProgress;
  const nextProgress = game.manualProgress;
  if (
    (previous && previousProgress !== nextProgress) ||
    (!previous && nextProgress !== undefined)
  ) {
    add({
      type: "PROGRESS_UPDATED",
      occurredAt: context.now,
      previousProgress,
      progress: nextProgress,
      deltaProgress: (nextProgress ?? 0) - (previousProgress ?? 0),
    });
  }

  return { game, events };
}

export function deriveLibraryActivity(
  previousGames: Game[],
  nextGames: Game[],
  context: ActivityMutationContext,
) {
  const previous = new Map(previousGames.map((game) => [game.id, game]));
  const events: GameActivityEvent[] = [];
  const games = nextGames.map((candidate) => {
    const result = deriveGameActivity(previous.get(candidate.id), candidate, context);
    events.push(...result.events);
    return result.game;
  });
  return { games, events };
}

export function inferStatusFromExternalActivity(
  game: Game,
  previous: ExternalGameActivity | undefined,
  current: ExternalGameActivity,
): GameStatusSuggestion | undefined {
  // An omitted Steam playtime means that the profile did not expose it; it is
  // not the same thing as a verified zero-minute game.
  const total = current.totalMinutes;
  const before = previous?.totalMinutes;
  const delta =
    before === undefined || total === undefined ? undefined : total - before;
  const lastActivity = current.lastPlayedAt
    ? Date.parse(current.lastPlayedAt)
    : Number.NaN;
  const ageDays = Number.isFinite(lastActivity)
    ? (Date.parse(current.observedAt) - lastActivity) / DAY_MS
    : Number.POSITIVE_INFINITY;

  // Steam's two explicit archive rules take priority over inferred "Playing".
  // The caller applies these suggestions automatically; they are returned here
  // as suggestions as well so the rule stays easy to test and reuse.
  if (current.source === "STEAM" && total === 0 && game.status !== "Not started")
    return {
      status: "Not started",
      source: current.source,
      confidence: "high",
      reason: "Steam reports zero minutes played.",
      observedAt: current.observedAt,
      lastActivityAt: current.lastPlayedAt,
    };

  if (
    current.source === "STEAM" &&
    total !== undefined &&
    total > 0 &&
    Number.isFinite(lastActivity) &&
    ageDays >= INACTIVITY_DAYS &&
    game.status !== "On hold"
  )
    return {
      status: "On hold",
      source: current.source,
      confidence: "high",
      reason: `Steam has no recorded play session for ${Math.floor(ageDays)} days.`,
      observedAt: current.observedAt,
      lastActivityAt: current.lastPlayedAt,
    };

  if (delta !== undefined && delta > 0 && game.status !== "Playing")
    return {
      status: "Playing",
      source: current.source,
      confidence: "high",
      reason: `${current.source} playtime increased by ${delta} minutes.`,
      observedAt: current.observedAt,
      lastActivityAt: current.lastPlayedAt,
    };

  if (
    before === undefined &&
    total !== undefined &&
    total > 0 &&
    (current.recentMinutes ?? 0) > 0 &&
    ageDays <= RECENT_ACTIVITY_DAYS &&
    game.status !== "Playing"
  )
    return {
      status: "Playing",
      source: current.source,
      confidence: "high",
      reason: `${current.source} reports recent playtime.`,
      observedAt: current.observedAt,
      lastActivityAt: current.lastPlayedAt,
    };

  if (
    total !== undefined &&
    total > 0 &&
    game.status === "Playing" &&
    Number.isFinite(lastActivity) &&
    ageDays >= INACTIVITY_DAYS
  )
    return {
      status: "On hold",
      source: current.source,
      confidence: "low",
      reason: `No ${current.source} activity has been observed for ${Math.floor(ageDays)} days.`,
      observedAt: current.observedAt,
      lastActivityAt: current.lastPlayedAt,
    };

  if (
    before === undefined &&
    total !== undefined &&
    total > 0 &&
    game.status === "Not started" &&
    Number.isFinite(lastActivity) &&
    ageDays >= INACTIVITY_DAYS
  )
    return {
      status: "On hold",
      source: current.source,
      confidence: "low",
      reason: `${current.source} shows prior playtime, but cannot tell whether the game was completed or paused.`,
      observedAt: current.observedAt,
      lastActivityAt: current.lastPlayedAt,
    };
}

export function reconcileExternalGameActivity(
  game: Game,
  previous: ExternalGameActivity | undefined,
  current: ExternalGameActivity,
  eventId: string,
): {
  game: Game;
  event?: GameActivityEvent;
  suggestion?: GameStatusSuggestion;
} {
  const before = previous?.totalMinutes;
  const after = current.totalMinutes;
  const delta =
    before !== undefined && after !== undefined ? after - before : undefined;
  const activityChanged =
    (after !== undefined && after !== before) ||
    (!!current.lastPlayedAt && current.lastPlayedAt !== previous?.lastPlayedAt);
  const suggestion = inferStatusFromExternalActivity(game, previous, current);
  const next = { ...game };
  const playtimeChanged =
    after !== undefined &&
    (next.hoursPlayed === undefined ||
      Math.round(next.hoursPlayed * 60) !== after);

  // Steam is the source of truth for linked-game playtime. Keeping the value
  // on the archive record means the library, statistics and detail views all
  // show the same number after a refresh (including a decrease/reset).
  if (current.source === "STEAM" && after !== undefined)
    next.hoursPlayed = after / 60;

  if (after !== undefined && after > 0 && !next.startedAt)
    next.startedAt = datePart(current.lastPlayedAt || current.observedAt);

  // Steam's explicit zero/inactivity rules are applied automatically. Other
  // providers only apply a high-confidence positive signal, and never replace
  // an explicit terminal state.
  if (
    current.source === "STEAM" &&
    after === 0 &&
    suggestion?.status === "Not started"
  )
    next.status = "Not started";
  else if (
    current.source === "STEAM" &&
    suggestion?.status === "On hold" &&
    suggestion.confidence === "high"
  )
    next.status = "On hold";
  else if (
    suggestion?.status === "Playing" &&
    suggestion.confidence === "high" &&
    ["Not started", "On hold"].includes(next.status)
  )
    next.status = "Playing";

  const actionableSuggestion =
    suggestion && suggestion.status !== next.status ? suggestion : undefined;

  // A changed total is represented by the normal PLAYTIME_UPDATED event after
  // commitLibrary compares the old and new archive snapshots. Keep the
  // provider event only for last-played changes without a total change; this
  // avoids showing the same Steam playtime delta twice while preserving the
  // fact that a session timestamp changed.
  const timestampOnlyChange = activityChanged && !playtimeChanged;
  return {
    game: next,
    suggestion: actionableSuggestion,
    event: timestampOnlyChange
      ? {
          id: eventId,
          gameId: game.id,
          type: "EXTERNAL_ACTIVITY",
          source: current.source,
          occurredAt: current.lastPlayedAt || current.observedAt,
          recordedAt: current.observedAt,
          previousMinutes: before,
          totalMinutes: after,
          deltaMinutes: delta,
          gameTitle: game.title,
          genres: [...game.genres],
          platform: game.platform,
          tags: [...game.tags],
          inferred: true,
          note:
            before === undefined
              ? `${current.source} playtime imported`
              : `${current.source} activity synced`,
        }
      : undefined,
  };
}
