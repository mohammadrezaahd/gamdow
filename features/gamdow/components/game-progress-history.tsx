"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AccessTimeRounded,
  ArrowUpwardRounded,
  CheckCircleOutlineRounded,
  SwapHorizRounded,
} from "@mui/icons-material";
import { Box, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { Button, Chip } from "@/components/ui";
import { gameActivityRepository } from "@/services/game-activity-repository";
import type { Game, GameStatus } from "@/types/game";
import type { GameActivityEvent } from "@/types/game-activity";

const statusColors: Record<GameStatus, string> = {
  "Not started": "#8b9487",
  Playing: "#d3fc72",
  "On hold": "#e5a67b",
  Completed: "#8bd8b0",
  Dropped: "#f28f8f",
};

const statusShort: Record<GameStatus, string> = {
  "Not started": "Not started",
  Playing: "Playing",
  "On hold": "On hold",
  Completed: "Completed",
  Dropped: "Dropped",
};

const duration = (minutes: number) => {
  const absolute = Math.abs(Math.round(minutes));
  const hours = Math.floor(absolute / 60);
  const rest = absolute % 60;
  const text = [hours ? `${hours}h` : "", rest ? `${rest}m` : ""]
    .filter(Boolean)
    .join(" ");
  return `${minutes < 0 ? "−" : minutes > 0 ? "+" : ""}${text || "0m"}`;
};

const dateLabel = (date: string, options: Intl.DateTimeFormatOptions = {}) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
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
    else if (event.type === "COMPLETION_CLEARED")
      day.statuses.push("Completion reopened");

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
    const point =
      points.get(date) ??
      {
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
  const linePoints = points.filter(
    (point) => point.hasProgress && point.progress !== undefined,
  );
  const usedStatuses = [...new Set(points.map((point) => point.status))];
  const width = 700;
  const height = 220;
  const left = 42;
  const right = 18;
  const top = 24;
  const plotHeight = 118;
  const plotWidth = width - left - right;
  const firstTime = points[0]?.timestamp ?? 0;
  const lastTime = points[points.length - 1]?.timestamp ?? 0;
  const span = Math.max(1, lastTime - firstTime);
  const x = (point: JourneyPoint) =>
    points.length <= 1
      ? left + plotWidth / 2
      : left + ((point.timestamp - firstTime) / span) * plotWidth;
  const y = (progress: number) =>
    top + plotHeight - (Math.max(0, Math.min(100, progress)) / 100) * plotHeight;
  const labels = points.filter((_, index) => {
    if (points.length <= 5) return true;
    const step = Math.ceil(points.length / 4);
    return index % step === 0 || index === points.length - 1;
  });
  const pointLabels = linePoints.filter((_, index) => {
    if (linePoints.length <= 7) return true;
    const step = Math.ceil(linePoints.length / 6);
    return index % step === 0 || index === linePoints.length - 1;
  });

  if (!points.length) return null;

  return (
    <Paper
      sx={{
        p: { xs: 2, md: 2.5 },
        background: "linear-gradient(145deg, #1d261b, #131813)",
        borderColor: "#d3fc7226",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{ justifyContent: "space-between", gap: 1.5, alignItems: { sm: "center" } }}
      >
        <Box>
          <Typography variant="overline" color="primary.main" sx={{ letterSpacing: ".15em" }}>
            PROGRESS JOURNEY
          </Typography>
          <Typography variant="h5" sx={{ mt: 0.25 }}>
            Progress timeline
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Each dot is a recorded progress update. Line color follows status.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Box sx={{ textAlign: "right" }}>
            <Typography variant="overline" color="text.secondary">CURRENT</Typography>
            <Typography variant="h5" color="primary.main">
              {game.manualProgress === undefined ? "—" : `${game.manualProgress}%`}
            </Typography>
          </Box>
          <Chip
            size="small"
            label={game.status}
            sx={{
              color: statusColors[game.status],
              borderColor: `${statusColors[game.status]}88`,
              background: `${statusColors[game.status]}14`,
            }}
          />
        </Stack>
      </Stack>

      <Box
        sx={{
          mt: 2,
          px: { xs: 0.5, md: 1 },
          pt: 1,
          borderRadius: 2,
          background: "#0c110d",
          border: 1,
          borderColor: "#d3fc7217",
          overflowX: "auto",
        }}
      >
        <Box sx={{ minWidth: { xs: 470, md: "100%" } }}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            width="100%"
            role="img"
            aria-label="Game progress timeline"
          >
            {[0, 50, 100].map((value) => (
              <g key={value}>
                <line
                  x1={left}
                  x2={width - right}
                  y1={y(value)}
                  y2={y(value)}
                  stroke="rgba(227,239,211,.16)"
                  strokeDasharray={value === 0 ? undefined : "3 6"}
                />
                <text x={left - 9} y={y(value) + 4} textAnchor="end" fill="#879384" fontSize="10">
                  {value}%
                </text>
              </g>
            ))}
            {points
              .filter((point) => point.statusChange)
              .map((point) => (
                <line
                  key={`status-${point.date}`}
                  x1={x(point)}
                  x2={x(point)}
                  y1={top}
                  y2={top + plotHeight + 12}
                  stroke={statusColors[point.status]}
                  strokeDasharray="2 5"
                  opacity=".45"
                />
              ))}
            {linePoints.slice(0, -1).map((point, index) => {
              const next = linePoints[index + 1];
              return (
                <line
                  key={`${point.date}-${next.date}`}
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
            {linePoints.map((point) => (
              <circle
                key={`point-${point.date}`}
                cx={x(point)}
                cy={y(point.progress ?? 0)}
                r="5"
                fill="#0c110d"
                stroke={statusColors[point.status]}
                strokeWidth="3"
              >
                <title>{`${dateLabel(point.date)} · ${point.progress}% · ${statusShort[point.status]}`}</title>
              </circle>
            ))}
            {pointLabels.map((point) => (
              <text
                key={`value-${point.date}`}
                x={x(point)}
                y={Math.max(13, y(point.progress ?? 0) - 10)}
                textAnchor="middle"
                fill={statusColors[point.status]}
                fontSize="10"
                fontWeight="700"
              >
                {point.progress}%
              </text>
            ))}
            {labels.map((point) => (
              <text
                key={`date-${point.date}`}
                x={x(point)}
                y={height - 12}
                textAnchor="middle"
                fill="#a3ab9a"
                fontSize="10"
              >
                {dateLabel(point.date, { year: "2-digit" })}
              </text>
            ))}
          </svg>
        </Box>
      </Box>

      <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 1, mt: 1.5 }}>
        {usedStatuses.map((status) => (
          <Stack key={status} direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: statusColors[status] }} />
            <Typography variant="caption" color="text.secondary">{status}</Typography>
          </Stack>
        ))}
        {!linePoints.length && (
          <Typography variant="caption" color="text.secondary">
            Move the progress slider to create the first point.
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}

function DayActivityList({ days, compact, onOpenJournal }: {
  days: DayActivity[];
  compact: boolean;
  onOpenJournal?: () => void;
}) {
  const visibleDays = compact ? days.slice(0, 3) : days;
  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{ justifyContent: "space-between", gap: 1.5, mb: 2.5 }}
      >
        <Box>
          <Typography variant="overline" color="primary.main" sx={{ letterSpacing: ".15em" }}>
            {compact ? "RECENT LOG" : "DAILY JOURNAL"}
          </Typography>
          <Typography variant="h5">{compact ? "Recent activity" : "Every recorded session"}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
            {compact
              ? "A quick view of your latest play and progress."
              : "Playtime, progress and status changes in one readable timeline."}
          </Typography>
        </Box>
        <Chip size="small" label={`${days.length} active days`} />
      </Stack>
      {!days.length ? (
        <Typography color="text.secondary">
          Change playtime or progress to start this game&apos;s history.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {visibleDays.map((day) => (
            <Box
              key={day.date}
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "minmax(125px,.7fr) 1fr 1fr 1fr" },
                gap: { xs: 1.5, sm: 2 },
                alignItems: "center",
                p: { xs: 1.5, md: 1.75 },
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
                transition: "border-color .2s, background .2s",
                "&:hover": { borderColor: "#d3fc7240", background: "#d3fc7207" },
              }}
            >
              <Box>
                <Typography sx={{ fontWeight: 700 }}>{dateLabel(day.date)}</Typography>
                <Stack direction="row" spacing={0.75} sx={{ mt: 0.75 }}>
                  {[...day.sources].map((source) => (
                    <Chip key={source} size="small" label={source} />
                  ))}
                </Stack>
              </Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <AccessTimeRounded sx={{ fontSize: 18, color: "primary.main" }} />
                <Box>
                  <Typography variant="overline" color="text.secondary">PLAYTIME</Typography>
                  <Typography color={day.playtimeChanged > 0 ? "primary.main" : undefined}>
                    {day.playtimeChanged ? duration(day.playtimeChanged) : "No time change"}
                  </Typography>
                  {day.playtimeTotal !== undefined && (
                    <Typography variant="caption" color="text.secondary">
                      {`${duration(day.playtimeTotal).replace("+", "")} total`}
                    </Typography>
                  )}
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <ArrowUpwardRounded sx={{ fontSize: 18, color: "secondary.main" }} />
                <Box>
                  <Typography variant="overline" color="text.secondary">PROGRESS</Typography>
                  <Typography color={day.progressChanged > 0 ? "secondary.main" : undefined}>
                    {day.hasProgress
                      ? `${day.progress === undefined ? "Cleared" : `${day.progress}%`}${
                          day.progressChanged
                            ? ` · ${day.progressChanged > 0 ? "+" : "−"}${Math.abs(day.progressChanged)} pts`
                            : ""
                        }`
                      : "No progress change"}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                {day.statuses.length ? (
                  <SwapHorizRounded sx={{ fontSize: 18, color: "#e5a67b" }} />
                ) : (
                  <CheckCircleOutlineRounded sx={{ fontSize: 18, color: "text.secondary" }} />
                )}
                <Box>
                  <Typography variant="overline" color="text.secondary">STATUS</Typography>
                  <Typography>{day.statuses.length ? day.statuses.join(" · ") : "No status change"}</Typography>
                </Box>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
      {compact && days.length > visibleDays.length && onOpenJournal && (
        <Button onClick={onOpenJournal} sx={{ mt: 2, alignSelf: "flex-start" }}>
          Open full progress journal
        </Button>
      )}
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

  const days = useMemo(() => groupByDay(events), [events]);

  if (loading)
    return (
      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction="row" spacing={1.5} role="status">
          <CircularProgress size={20} />
          <Typography>Loading history…</Typography>
        </Stack>
      </Paper>
    );
  if (error)
    return (
      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Typography color="error.main">{error}</Typography>
      </Paper>
    );

  return compact ? (
    <DayActivityList days={days} compact onOpenJournal={onOpenJournal} />
  ) : (
    <Stack spacing={2.5}>
      <JourneyChart events={events} game={game} />
      <DayActivityList days={days} compact={false} />
    </Stack>
  );
}
