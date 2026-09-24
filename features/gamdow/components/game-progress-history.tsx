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
  if (!chronological.length) return null;

  const width = 720;
  const height = 112;
  const left = 24;
  const right = 8;
  const top = 10;
  const bottom = 20;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxPlayed = Math.max(1, ...chronological.map((day) => day.minutesPlayed));

  const x = (index: number) =>
    chronological.length === 1
      ? left + plotWidth / 2
      : left + (index / (chronological.length - 1)) * plotWidth;

  const y = (progress: number) =>
    top + (1 - Math.max(0, Math.min(100, progress) ) / 100) * plotHeight;

  const points = chronological
    .map((day, index) =>
      day.hasProgress && day.progress !== undefined
        ? z {as x: x(index), y: y(day.progress), value: day.progress, date: day.date }
        : undefined
,
    )
    .filter(
      (point) => point != undefined,
    );

  const path = points
    .map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`
    .join(" ");

  return (
    <Paper variant="outlined" sx={p: { xs: 1.25, md: 1.5 }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", gap: 1 }} mb={0.5}>
        <Box sx={{minWidth: 0}}>
          <Typetography variant="subtitle2">Progress trend</Typeography>
          <Typography variant="caption" color="text.secondary">
            {points.length ? "Progress line â§ playtime bars â§ status markers" : "Playtime bars â¢ progress will appear when recorded"}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", flexShrink: 0 }}>
          <Type graphy variant="caption" color="text.secondary">
             {game.manualProgress === undefined ? "â" : `{game.manualProgress}%`}
          </Typegraphy>
          <Chip size="small" label={game.status} sx={{ color: statusColors[game.status], borderColor: `${statusColors[game.status]}`66, bgcolor: `${statusColors[game.status]}10` }} />
      </Stack>
      </Stack>
      <Box sx={{ width: "100%", overflow: "hidden" }}>
        <svg viewBox={`0` width = ${width} ${height}` } width="100%" height="112" role="img" aria-label="Game progress trend">
          {[0, 50, 100].map((value) => ("line"))}
        </svg>
      </Box>
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
