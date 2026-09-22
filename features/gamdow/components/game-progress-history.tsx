"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AccessTimeRounded,
  CheckCircleRounded,
  FlagRounded,
  PauseCircleRounded,
  PlayArrowRounded,
  TrendingUpRounded,
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
  minutesPlayed: number;
  playtimeChanged: number;
  playtimeTotal?: number;
  progressChanged: number;
  progress?: number;
  hasProgress: boolean;
  statusTransitions: string[];
  sources: Set<string>;
}

function groupByDay(events: GameActivityEvent[]) {
  const days = new Map<string, DayActivity>();
  for (const event of events) {
    const date = event.occurredAt.slice(0, 10);
    const day =
      days.get(date) ?? {
        date,
        minutesPlayed: 0,
        playtimeChanged: 0,
        progressChanged: 0,
        hasProgress: false,
        statusTransitions: [],
        sources: new Set<string>(),
      };
    days.set(date, day);
    day.sources.add(event.source);

    if (event.type === "STATUS_CHANGED" && event.fromStatus && event.toStatus)
      day.statusTransitions.push(`${event.fromStatus} → ${event.toStatus}`);
    else if (event.type === "STARTED")
      day.statusTransitions.push("Not started → Playing");
    else if (event.type === "COMPLETED")
      day.statusTransitions.push("Playing → Completed");
    else if (event.type === "COMPLETION_CLEARED")
      day.statusTransitions.push("Completed → Playing");

    if (event.type === "PLAYTIME_UPDATED" || event.type === "EXTERNAL_ACTIVITY") {
      const delta = event.deltaMinutes ?? 0;
      day.playtimeChanged += delta;
      day.minutesPlayed += Math.max(0, delta);
      day.playtimeTotal ??= event.totalMinutes;
    }
    if (event.type === "PROGRESS_UPDATED") {
      day.progressChanged += event.deltaProgress ?? 0;
      day.progress = event.progress;
      day.hasProgress = true;
    }
  }
  return [...days.values()].sort((a, b) => b.date.localeCompare(a.date));
}

interface StatusMilestone {
  key: "started" | "hold" | "dropped" | "completed";
  label: string;
  icon: typeof PlayArrowRounded;
  color: string;
  firstAt?: string;
  lastAt?: string;
  count: number;
}

function extractMilestones(events: GameActivityEvent[], game: Game): StatusMilestone[] {
  const tracked: Record<StatusMilestone["key"], StatusMilestone> = {
    started: {
      key: "started",
      label: "Started",
      icon: PlayArrowRounded,
      color: statusColors.Playing,
      count: 0,
    },
    hold: {
      key: "hold",
      label: "On hold",
      icon: PauseCircleRounded,
      color: statusColors["On hold"],
      count: 0,
    },
    dropped: {
      key: "dropped",
      label: "Dropped",
      icon: FlagRounded,
      color: statusColors.Dropped,
      count: 0,
    },
    completed: {
      key: "completed",
      label: "Completed",
      icon: CheckCircleRounded,
      color: statusColors.Completed,
      count: 0,
    },
  };

  const mark = (key: StatusMilestone["key"], at: string) => {
    const bucket = tracked[key];
    const date = at.slice(0, 10);
    bucket.count += 1;
    bucket.firstAt ??= date;
    bucket.lastAt = date;
  };

  for (const event of [...events].sort(
    (a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt),
  )) {
    if (event.type === "STARTED") mark("started", event.occurredAt);
    if (event.type === "COMPLETED") mark("completed", event.occurredAt);
    if (event.type === "STATUS_CHANGED" && event.toStatus) {
      if (event.toStatus === "Playing") mark("started", event.occurredAt);
      if (event.toStatus === "On hold") mark("hold", event.occurredAt);
      if (event.toStatus === "Dropped") mark("dropped", event.occurredAt);
      if (event.toStatus === "Completed") mark("completed", event.occurredAt);
    }
  }

  if (game.startedAt && !tracked.started.firstAt) {
    tracked.started.firstAt = game.startedAt;
    tracked.started.lastAt = game.startedAt;
  }
  if (game.status === "On hold" && !tracked.hold.lastAt)
    tracked.hold.lastAt = events[0]?.occurredAt.slice(0, 10);
  if (game.status === "Dropped" && !tracked.dropped.lastAt)
    tracked.dropped.lastAt = events[0]?.occurredAt.slice(0, 10);
  if (game.completedAt && !tracked.completed.lastAt) {
    tracked.completed.firstAt = game.completedAt;
    tracked.completed.lastAt = game.completedAt;
  }

  return [tracked.started, tracked.hold, tracked.dropped, tracked.completed];
}

function MiniProgressChart({ days, game }: { days: DayActivity[]; game: Game }) {
  const chronological = [...days].reverse();
  const progressPoints = chronological.filter(
    (day) => day.hasProgress && day.progress !== undefined,
  );
  const width = 640;
  const height = 132;
  const left = 18;
  const right = 10;
  const top = 12;
  const bottom = 22;
  const plotWidth = width - left - right;
  const progressFloor = top;
  const progressCeiling = height - bottom - 30;
  const barsFloor = height - bottom;
  const barMaxHeight = 24;
  const maxPlayed = Math.max(1, ...chronological.map((day) => day.minutesPlayed));
  const progressX = (index: number, total: number) =>
    total <= 1 ? left + plotWidth / 2 : left + (index / (total - 1)) * plotWidth;
  const progressY = (progress: number) => {
    const clamped = Math.max(0, Math.min(100, progress));
    return progressFloor + ((100 - clamped) / 100) * (progressCeiling - progressFloor);
  };
  const path = progressPoints
    .map((point, indexOnLine) => {
      const index = chronological.findIndex((day) => day.date === point.date);
      const command = indexOnLine === 0 ? "M" : "L";
      return `${command}${progressX(index, chronological.length)} ${progressY(point.progress ?? 0)}`;
    })
    .join(" ");

  if (!chronological.length) return null;

  return (
    <Paper
      variant="outlined"
      sx={{ p: { xs: 1.5, md: 2 } }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{ justifyContent: "space-between", gap: 1.5, alignItems: { sm: "center" }, mb: 1.25 }}
      >
        <Box>
          <Typography variant="subtitle2" color="text.secondary">
            Progress trend
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Daily playtime bars + progress line
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Current progress
            </Typography>
            <Typography sx={{ fontWeight: 700 }}>
              {game.manualProgress === undefined ? "No value" : `${game.manualProgress}%`}
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
          overflowX: "auto",
        }}
      >
        <Box sx={{ minWidth: { xs: 430, md: "100%" } }}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            width="100%"
            role="img"
            aria-label="Game progress trend"
          >
            {[0, 50, 100].map((value) => (
              <g key={value}>
                <line
                  x1={left}
                  x2={width - right}
                  y1={progressY(value)}
                  y2={progressY(value)}
                  stroke="rgba(227,239,211,.14)"
                  strokeDasharray={value === 0 ? undefined : "3 6"}
                />
                <text
                  x={left - 4}
                  y={progressY(value) + 4}
                  textAnchor="end"
                  fill="#879384"
                  fontSize="9"
                >
                  {value}%
                </text>
              </g>
            ))}
            {chronological.map((day, index) => {
              const x = progressX(index, chronological.length);
              const barHeight = Math.max(
                day.minutesPlayed ? 4 : 2,
                (day.minutesPlayed / maxPlayed) * barMaxHeight,
              );
              return (
                <rect
                  key={`bar-${day.date}`}
                  x={x - 2}
                  y={barsFloor - barHeight}
                  width="4"
                  height={barHeight}
                  rx="2"
                  fill="#d3fc7290"
                >
                  <title>{`${dateLabel(day.date)} · ${duration(day.minutesPlayed)}`}</title>
                </rect>
              );
            })}
            {path && (
              <path
                d={path}
                fill="none"
                stroke="rgba(125,255,191,.95)"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {progressPoints.map((point) => {
              const index = chronological.findIndex((day) => day.date === point.date);
              return (
                <circle
                  key={`point-${point.date}`}
                  cx={progressX(index, chronological.length)}
                  cy={progressY(point.progress ?? 0)}
                  r="2.8"
                  fill="#7dffbf"
                >
                  <title>{`${dateLabel(point.date)} · ${point.progress}%`}</title>
                </circle>
              );
            })}
            {chronological.filter((day) => day.statusTransitions.length).map((day) => {
              const index = chronological.findIndex((item) => item.date === day.date);
              return (
                <line
                  key={`status-${day.date}`}
                  x1={progressX(index, chronological.length)}
                  x2={progressX(index, chronological.length)}
                  y1={height - bottom + 2}
                  y2={height - 2}
                  stroke="#e5a67b"
                  strokeWidth="1.2"
                />
              );
            })}
            {[0, Math.floor((chronological.length - 1) / 2), chronological.length - 1]
              .filter((value, index, all) => value >= 0 && all.indexOf(value) === index)
              .map((index) => {
                const day = chronological[index];
                return (
                  <text
                    key={`date-${day.date}`}
                    x={progressX(index, chronological.length)}
                    y={height - 6}
                    textAnchor="middle"
                    fill="#a3ab9a"
                    fontSize="9"
                  >
                    {dateLabel(day.date, { year: "2-digit" })}
                  </text>
                );
              })}
            {progressPoints.length <= 6 &&
              progressPoints.map((point) => {
                const index = chronological.findIndex((day) => day.date === point.date);
                return (
                  <text
                    key={`value-${point.date}`}
                    x={progressX(index, chronological.length)}
                    y={progressY(point.progress ?? 0) - 5}
                    textAnchor="middle"
                    fill="#7dffbf"
                    fontSize="9"
                  >
                    {point.progress}%
                  </text>
                );
              })}
            {chronological.map((day, index) => (
              <text
                key={`status-dot-${day.date}`}
                x={progressX(index, chronological.length)}
                y={height - bottom - 2}
                textAnchor="middle"
                fill="#a3ab9a"
                fontSize="8"
              >
                {day.statusTransitions.length ? "|" : ""}
              </text>
            ))}
          </svg>
        </Box>
      </Box>

      <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 1, mt: 1 }}>
        <Chip size="small" label="Bars: played time per day" />
        <Chip size="small" label="Line: manual progress" />
        <Chip size="small" label="Orange markers: status changes" />
        {!progressPoints.length && <Chip size="small" label="No progress points yet" />}
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
  const totalMinutesPlayed = days.reduce((sum, day) => sum + day.minutesPlayed, 0);
  const averageMinutes = days.length ? Math.round(totalMinutesPlayed / days.length) : 0;
  const bestDay = days.reduce<DayActivity | undefined>(
    (best, day) => (!best || day.minutesPlayed > best.minutesPlayed ? day : best),
    undefined,
  );

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
          <Typography variant="h5">{compact ? "Recent activity" : "Daily progress table"}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
            {compact
              ? "A quick view of your latest play and progress."
              : "Includes played hours, progress deltas and status transitions for each day."}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
          <Chip size="small" label={`${days.length} active days`} />
          <Chip size="small" label={`Avg ${duration(averageMinutes).replace("+", "")}/day`} />
          {bestDay && bestDay.minutesPlayed > 0 && (
            <Chip
              size="small"
              label={`Best ${dateLabel(bestDay.date, { year: "2-digit" })} · ${duration(bestDay.minutesPlayed).replace("+", "")}`}
            />
          )}
        </Stack>
      </Stack>
      {!days.length ? (
        <Typography color="text.secondary">
          Change playtime or progress to start this game&apos;s history.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {!compact && (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "minmax(110px,.8fr) minmax(110px,.8fr) minmax(140px,1fr) minmax(180px,1.3fr)",
                gap: 1.25,
                px: 1,
              }}
            >
              <Typography variant="caption" color="text.secondary">Date</Typography>
              <Typography variant="caption" color="text.secondary">Played</Typography>
              <Typography variant="caption" color="text.secondary">Progress</Typography>
              <Typography variant="caption" color="text.secondary">Status</Typography>
            </Box>
          )}
          {visibleDays.map((day) => (
            <Box
              key={day.date}
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "minmax(110px,.8fr) minmax(110px,.8fr) minmax(140px,1fr) minmax(180px,1.3fr)",
                },
                gap: { xs: 1.5, sm: 2 },
                alignItems: "center",
                p: { xs: 1.25, md: 1.5 },
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
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
                  <Typography color={day.minutesPlayed > 0 ? "primary.main" : "text.secondary"}>
                    {day.minutesPlayed > 0
                      ? duration(day.minutesPlayed).replace("+", "")
                      : "No played hours"}
                  </Typography>
                  {day.playtimeChanged !== day.minutesPlayed && day.playtimeChanged !== 0 && (
                    <Typography variant="caption" color="text.secondary">
                      net {duration(day.playtimeChanged)}
                    </Typography>
                  )}
                  {day.playtimeTotal !== undefined && (
                    <Typography variant="caption" color="text.secondary">
                      {`${duration(day.playtimeTotal).replace("+", "")} total`}
                    </Typography>
                  )}
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <TrendingUpRounded sx={{ fontSize: 18, color: "secondary.main" }} />
                <Box>
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
                {day.statusTransitions.length ? (
                  <SwapHorizRounded sx={{ fontSize: 18, color: "#e5a67b" }} />
                ) : (
                  <CheckCircleRounded sx={{ fontSize: 18, color: "text.secondary" }} />
                )}
                <Box>
                  <Typography>
                    {day.statusTransitions.length
                      ? day.statusTransitions.join(" · ")
                      : "No status change"}
                  </Typography>
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

function Milestones({ events, game }: { events: GameActivityEvent[]; game: Game }) {
  const milestones = extractMilestones(events, game);
  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }}>
      <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", mb: 1.5 }}>
        <Typography variant="h6">Detected milestones</Typography>
        <Typography variant="caption" color="text.secondary">
          Start / Hold / Drop / Complete tracking
        </Typography>
      </Stack>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(4,minmax(0,1fr))" },
          gap: 1,
        }}
      >
        {milestones.map((milestone) => {
          const Icon = milestone.icon;
          return (
            <Box
              key={milestone.key}
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 1.5,
                p: 1.25,
                minHeight: 76,
              }}
            >
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 0.5 }}>
                <Icon sx={{ fontSize: 18, color: milestone.color }} />
                <Typography sx={{ fontWeight: 700 }}>{milestone.label}</Typography>
              </Stack>
              {milestone.lastAt ? (
                <>
                  <Typography variant="body2">Last: {dateLabel(milestone.lastAt)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {milestone.count ? `${milestone.count} time${milestone.count > 1 ? "s" : ""}` : "Recorded"}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">Not recorded yet</Typography>
              )}
            </Box>
          );
        })}
      </Box>
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
      <Milestones events={events} game={game} />
      <MiniProgressChart days={days} game={game} />
      <DayActivityList days={days} compact={false} />
    </Stack>
  );
}
