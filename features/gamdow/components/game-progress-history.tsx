"use client";

import { useCallback, useEffect, useState } from "react";
import { CircularProgress, Paper, Stack, Typography, Box } from "@mui/material";
import { Button, Chip } from "@/components/ui";
import { gameActivityRepository } from "@/services/game-activity-repository";
import type { Game, GameStatus } from "@/types/game";
import type { GameActivityEvent } from "@/types/game-activity";

const duration = (minutes: number) => {
  const absolute = Math.abs(Math.round(minutes));
  const hours = Math.floor(absolute / 60);
  const rest = absolute % 60;
  const text = [hours ? `${hours}h` : "", rest ? `${rest}m` : ""]
    .filter(Boolean)
    .join(" ");
  return `${minutes < 0 ? "−" : minutes > 0 ? "+" : ""}${text || "0m"}`;
};

const dayLabel = (date: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(`${date}T12:00:00`));

const shortDayLabel = (date: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "2-digit",
  }).format(new Date(`${date}T12:00:00`));

interface DayActivity {
  date: string;
  playtimeChanged: number;
  playtimeTotal?: number;
  progressChanged: number;
  progress?: number;
  hasProgress: boolean;
  statuses: string[];
  sources: Set<string>;
}

function groupByDay(events: GameActivityEvent[]) {
  const days = new Map<string, DayActivity>();
  for (const event of events) {
    const date = event.occurredAt.slice(0, 10);
    const day =
      days.get(date) ?? {
        date,
        playtimeChanged: 0,
        progressChanged: 0,
        hasProgress: false,
        statuses: [],
        sources: new Set<string>(),
      };
    days.set(date, day);
    day.sources.add(event.source);
    if (event.type === "STATUS_CHANGED" && event.fromStatus && event.toStatus)
      day.statuses.push(`${event.fromStatus} → ${event.toStatus}`);
    else if (event.type === "STARTED") day.statuses.push("Started playing");
    else if (event.type === "COMPLETED") day.statuses.push("Completed");
    else if (event.type === "COMPLETION_CLEARED") day.statuses.push("Completion reopened");
    if (event.type === "PLAYTIME_UPDATED" || event.type === "EXTERNAL_ACTIVITY") {
      day.playtimeChanged += event.deltaMinutes ?? 0;
      day.playtimeTotal ??= event.totalMinutes;
    }
    if (event.type === "PROGRESS_UPDATED") {
      day.progressChanged += event.deltaProgress ?? 0;
      if (!day.hasProgress) {
        day.progress = event.progress;
        day.hasProgress = true;
      }
    }
  }
  return [...days.values()].sort((a, b) => b.date.localeCompare(a.date));
}

const statusColors: Record<GameStatus, string> = {
  "Not started": "#81907b",
  Playing: "#d3fc72",
  "On hold": "#e5a67b",
  Completed: "#8bd8b0",
  Dropped: "#f28f8f",
};

interface JourneyPoint {
  date: string;
  timestamp: number;
  progress?: number;
  hasProgress: boolean;
  totalMinutes?: number;
  status: GameStatus;
  statusChange?: string;
}

function buildJourney(events: GameActivityEvent[], game: Game) {
  const ordered = [...events].sort(
    (a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt),
  );
  const points = new Map<string, JourneyPoint>();
  const firstStatusChange = ordered.find(
    (event) => event.type === "STATUS_CHANGED" && event.fromStatus,
  );
  const firstAdded = ordered.find(
    (event) => event.type === "ADDED" && event.toStatus,
  );
  let status: GameStatus =
    firstStatusChange?.fromStatus ?? firstAdded?.toStatus ?? game.status;
  let progress: number | undefined;
  let hasProgress = false;
  let totalMinutes: number | undefined;

  for (const event of ordered) {
    if (event.type === "ADDED" && event.toStatus) status = event.toStatus;
    if (event.type === "STATUS_CHANGED" && event.toStatus) status = event.toStatus;
    if (event.type === "STARTED") status = "Playing";
    if (event.type === "COMPLETED") status = "Completed";
    if (event.type === "COMPLETION_CLEARED") status = "Playing";
    if (event.type === "PROGRESS_UPDATED") {
      progress = event.progress;
      hasProgress = true;
    }
    if (event.type === "PLAYTIME_UPDATED" || event.type === "EXTERNAL_ACTIVITY")
      totalMinutes = event.totalMinutes;

    const date = event.occurredAt.slice(0, 10);
    const point = points.get(date) ?? {
      date,
      timestamp: Date.parse(event.occurredAt),
      progress,
      hasProgress,
      totalMinutes,
      status,
    };
    point.progress = progress;
    point.hasProgress = hasProgress;
    point.totalMinutes = totalMinutes;
    point.status = status;
    if (event.type === "STATUS_CHANGED" && event.fromStatus && event.toStatus)
      point.statusChange = `${event.fromStatus} → ${event.toStatus}`;
    else if (event.type === "STARTED") point.statusChange = "Started playing";
    else if (event.type === "COMPLETED") point.statusChange = "Completed";
    points.set(date, point);
  }

  return [...points.values()].sort((a, b) => a.timestamp - b.timestamp);
}

function JourneyChart({ events, game }: { events: GameActivityEvent[]; game: Game }) {
  const points = buildJourney(events, game);
  const hasProgress = points.some((point) => point.hasProgress);
  if (!points.length) return null;

  const width = 760;
  const height = 290;
  const left = 46;
  const right = 18;
  const top = 24;
  const plotHeight = 178;
  const plotWidth = width - left - right;
  const firstTime = points[0].timestamp;
  const lastTime = points[points.length - 1].timestamp;
  const span = Math.max(1, lastTime - firstTime);
  const x = (point: JourneyPoint) =>
    points.length === 1
      ? left + plotWidth / 2
      : left + ((point.timestamp - firstTime) / span) * plotWidth;
  const y = (progress: number) => top + plotHeight - (Math.max(0, Math.min(100, progress)) / 100) * plotHeight;
  const statusDates = points.filter((point) => point.statusChange);
  const labels = points.filter((_, index) => {
    if (points.length <= 6) return true;
    const step = Math.ceil(points.length / 5);
    return index % step === 0 || index === points.length - 1;
  });
  const linePoints = points.filter((point) => point.hasProgress && point.progress !== undefined);
  const usedStatuses = [...new Set(points.map((point) => point.status))];

  return (
    <Paper sx={{ p: { xs: 2, md: 3 }, background: "#d3fc7205" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{ justifyContent: "space-between", gap: 1.5, mb: 1 }}
      >
        <Box>
          <Typography variant="h5">Journey line</Typography>
          <Typography variant="body2" color="text.secondary">
            Progress over time. The line color follows the game&apos;s status.
          </Typography>
        </Box>
        <Chip size="small" label={`${points.length} tracked days`} />
      </Stack>
      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <Box sx={{ minWidth: { xs: 620, md: "100%" } }}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            width="100%"
            role="img"
            aria-label="Game progress over time, colored by status"
          >
            {[0, 50, 100].map((value) => (
              <g key={value}>
                <line
                  x1={left}
                  x2={width - right}
                  y1={y(value)}
                  y2={y(value)}
                  stroke="rgba(227,239,211,.14)"
                  strokeDasharray={value === 0 ? undefined : "3 5"}
                />
                <text x={left - 10} y={y(value) + 4} textAnchor="end" fill="#a3ab9a" fontSize="10">
                  {value}%
                </text>
              </g>
            ))}
            {points.map((point, index) => {
              const start = x(point);
              const end = index === points.length - 1 ? width - right : x(points[index + 1]);
              return (
                <rect
                  key={`status-${point.date}`}
                  x={start}
                  y={top + plotHeight + 20}
                  width={Math.max(3, end - start)}
                  height={16}
                  fill={statusColors[point.status]}
                  opacity={0.72}
                  rx="3"
                >
                  <title>{`${dayLabel(point.date)} · ${point.status}`}</title>
                </rect>
              );
            })}
            {statusDates.map((point) => (
              <line
                key={`change-${point.date}`}
                x1={x(point)}
                x2={x(point)}
                y1={top}
                y2={top + plotHeight + 18}
                stroke={statusColors[point.status]}
                strokeDasharray="2 5"
                opacity={0.45}
              />
            ))}
            {linePoints.slice(0, -1).map((point, index) => {
              const next = linePoints[index + 1];
              return (
                <line
                  key={`line-${point.date}-${next.date}`}
                  x1={x(point)}
                  y1={y(point.progress ?? 0)}
                  x2={x(next)}
                  y2={y(next.progress ?? 0)}
                  stroke={statusColors[next.status]}
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              );
            })}
            {linePoints.map((point) => {
              return (
                <g key={`point-${point.date}`}>
                  <circle
                    cx={x(point)}
                    cy={y(point.progress ?? 0)}
                    r="6"
                    fill="#111311"
                    stroke={statusColors[point.status]}
                    strokeWidth="3"
                  >
                    <title>{`${dayLabel(point.date)} · ${point.progress}% · ${point.status}`}</title>
                  </circle>
                </g>
              );
            })}
            {labels.map((point) => (
              <text
                key={`label-${point.date}`}
                x={x(point)}
                y={height - 13}
                textAnchor="middle"
                fill="#a3ab9a"
                fontSize="10"
              >
                {shortDayLabel(point.date)}
              </text>
            ))}
          </svg>
        </Box>
      </Box>
      <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 1, mt: 1 }}>
        {usedStatuses.map((status) => (
          <Chip
            key={status}
            size="small"
            label={status}
            sx={{ borderColor: statusColors[status], color: statusColors[status] }}
          />
        ))}
        {!hasProgress && (
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
            Move the progress slider to start the line.
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}

export function GameProgressHistory({
  game,
  compact = false,
  onOpenJournal,
}: {
  game: Game;
  compact?: boolean;
  onOpenJournal?: () => void;
}) {
  const [events, setEvents] = useState<GameActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const result = await gameActivityRepository.history(game.id, signal);
        if (!signal?.aborted) {
          setEvents(result);
          setError("");
        }
      } catch (reason) {
        if (!signal?.aborted)
          setError(
            reason instanceof Error ? reason.message : "Could not load progress history.",
          );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [game.id],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    const refresh = () => void load();
    window.addEventListener("gamdow:steam-updated", refresh);
    window.addEventListener("gamdow:storage-updated", refresh);
    return () => {
      window.removeEventListener("gamdow:steam-updated", refresh);
      window.removeEventListener("gamdow:storage-updated", refresh);
    };
  }, [load]);

  const days = groupByDay(events);
  const visibleDays = compact ? days.slice(0, 3) : days;

  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{ justifyContent: "space-between", gap: 1.5, mb: 2.5 }}
      >
        <Box>
          <Typography variant="h5">{compact ? "Recent activity" : "Progress journal"}</Typography>
          <Typography variant="body2" color="text.secondary">
            {compact
              ? "A quick view of your latest play and progress."
              : "A complete daily record of what you played and how far you got."}
          </Typography>
        </Box>
        <Chip size="small" label={`${days.length} active days`} />
      </Stack>
      {loading ? (
        <Stack direction="row" spacing={1.5} role="status">
          <CircularProgress size={20} />
          <Typography>Loading history…</Typography>
        </Stack>
      ) : error ? (
        <Typography color="error.main">{error}</Typography>
      ) : !days.length ? (
        <Typography color="text.secondary">
          Change playtime or progress to start this game&apos;s history.
        </Typography>
      ) : (
        <>
          {!compact && <JourneyChart events={events} game={game} />}
          <Stack spacing={1.25} sx={{ mt: !compact ? 2 : 0 }}>
          {visibleDays.map((day) => (
            <Box
              key={day.date}
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "minmax(130px,.7fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)",
                },
                gap: { xs: 1, sm: 2 },
                alignItems: "center",
                p: 1.5,
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                background: "#d3fc7205",
              }}
            >
              <Box>
                <Typography sx={{ fontWeight: 700 }}>{dayLabel(day.date)}</Typography>
                <Stack direction="row" spacing={0.75} sx={{ mt: 0.5 }}>
                  {[...day.sources].map((source) => (
                    <Chip key={source} size="small" label={source} />
                  ))}
                </Stack>
              </Box>
              <Box>
                <Typography variant="overline" color="text.secondary">
                  PLAYTIME
                </Typography>
                <Typography color={day.playtimeChanged > 0 ? "primary.main" : undefined}>
                  {day.playtimeChanged
                    ? duration(day.playtimeChanged)
                    : "No time change"}
                  {day.playtimeTotal !== undefined && (
                    <Typography component="span" variant="caption" color="text.secondary">
                      {` · ${duration(day.playtimeTotal)} total`}
                    </Typography>
                  )}
                </Typography>
              </Box>
              <Box>
                <Typography variant="overline" color="text.secondary">
                  PROGRESS
                </Typography>
                <Typography color={day.progressChanged > 0 ? "primary.main" : undefined}>
                  {day.hasProgress
                    ? `${day.progress === undefined ? "Cleared" : `${day.progress}%`}${
                        day.progressChanged
                          ? ` · ${day.progressChanged > 0 ? "+" : "−"}${Math.abs(day.progressChanged)} pts`
                          : ""
                      }`
                    : "No progress change"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="overline" color="text.secondary">
                  STATUS
                </Typography>
                <Typography>
                  {day.statuses.length ? day.statuses.join(" · ") : "No status change"}
                </Typography>
              </Box>
            </Box>
          ))}
          </Stack>
        </>
      )}
      {compact && days.length > visibleDays.length && onOpenJournal && (
        <Button onClick={onOpenJournal} sx={{ mt: 2, alignSelf: "flex-start" }}>
          Open full progress journal
        </Button>
      )}
    </Paper>
  );
}
