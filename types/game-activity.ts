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
  | "COMPLETION_DATE_CHANGED"
  | "EXTERNAL_ACTIVITY";

export interface GameActivityEvent {
  id: string;
  gameId: string;
  type: GameActivityEventType;
  source: GameActivitySource;
  occurredAt: string;
  recordedAt: string;
  fromStatus?: GameStatus;
  toStatus?: GameStatus;
  previousMinutes?: number;
  totalMinutes?: number;
  deltaMinutes?: number;
  inferred?: boolean;
  note?: string;
}

export interface GameStatusSuggestion {
  status: Extract<GameStatus, "Playing" | "On hold">;
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
