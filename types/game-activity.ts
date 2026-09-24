import type { GameStatus } from "./game";

export type GameActivitySource = "MANUAL" | "STEAM" | "EPIC" | "SYSTEM";

export type GameActivityEventType =
  | "BASELINE"
  | "ADDED"
  | "STATUS_CHANGED"
  | "STARTED"
  | "COMPLETED"
  | "COMPLETION_CLEARED"
  | "START_DATE_CHANGED"
  | "START_DATE_CLEARED"
  | "PLAYTIME_UPDATED"
  | "PROGRESS_UPDATED"
  | "COMPLETION_DATE_CHANGED"
  | "EXTERNAL_ACTIVITY";

export interface GameActivityEvent {
  id: string;
  gameId: string;
  type: GameActivityEventType;
  source: GameActivitySource;
  occurredAt: string;
  recordedAt: string;
  /** Historical metadata snapshot. Older events may not have these fields. */
  gameTitle?: string;
  genres?: string[];
  platform?: string;
  tags?: string[];
  fromStatus?: GameStatus;
  toStatus?: GameStatus;
  previousMinutes?: number;
  totalMinutes?: number;
  deltaMinutes?: number;
  previousProgress?: number;
  progress?: number;
  deltaProgress?: number;
  inferred?: boolean;
  note?: string;
}

export interface GameStatusSuggestion {
  status: Extract<GameStatus, "Not started" | "Playing" | "On hold">;
  source: Extract<GameActivitySource, "STEAM" | "EPIC">;
  confidence: "high" | "medium" | "low";
  reason: string;
  observedAt: string;
  lastActivityAt?: string;
}

export interface ExternalGameActivity {
  source: Extract<GameActivitySource, "STEAM" | "EPIC">;
  totalMinutes?: number;
  recentMinutes?: number;
  lastPlayedAt?: string;
  observedAt: string;
}

export interface GameTimelinePage {
  items: GameActivityEvent[];
  nextCursor?: string;
  statusSuggestion?: GameStatusSuggestion;
}

export interface ActivityPeriodSummary {
  period: string;
  eventCount: number;
  activeGames: number;
  statusChanges: number;
  playtimeUpdates: number;
  minutesChanged: number;
  minutesGained: number;
  progressUpdates: number;
  progressChanged: number;
  progressGained: number;
  started: number;
  completed: number;
}

export interface ActivityGameSummary {
  gameId: string;
  title: string;
  source: GameActivitySource;
  status: GameStatus;
  totalMinutes: number;
  eventCount: number;
  statusChanges: number;
  playtimeUpdates: number;
  progressUpdates: number;
  minutesChanged: number;
  progressChanged: number;
  activeDays: number;
  firstActivityAt?: string;
  lastActivityAt?: string;
}

export interface ActivityBreakdown {
  key: string;
  label: string;
  minutes: number;
  events: number;
  games: number;
  activeDays: number;
}

export interface ActivityWeekdaySummary {
  weekday: number;
  label: string;
  minutes: number;
  events: number;
  activeDays: number;
}

export interface ActivityFeedItem extends GameActivityEvent {
  gameTitle: string;
}

export interface ActivityStatisticsQuery {
  genre?: string;
  platform?: string;
  status?: GameStatus;
  source?: GameActivitySource;
  favorite?: boolean;
}

export interface ActivityStatisticsAvailableFilters {
  genres: string[];
  platforms: string[];
  statuses: GameStatus[];
  sources: GameActivitySource[];
}

export interface ActivityStatistics {
  generatedAt: string;
  availableFilters: ActivityStatisticsAvailableFilters;
  totalGames: number;
  trackedGames: number;
  totalMinutes: number;
  totalEvents: number;
  activeDays: number;
  playDays: number;
  statusChanges: number;
  playtimeUpdates: number;
  progressUpdates: number;
  monthly: ActivityPeriodSummary[];
  daily: ActivityPeriodSummary[];
  genres: ActivityBreakdown[];
  platforms: ActivityBreakdown[];
  sources: ActivityBreakdown[];
  statuses: ActivityBreakdown[];
  weekdays: ActivityWeekdaySummary[];
  games: ActivityGameSummary[];
  activities: ActivityFeedItem[];
}
