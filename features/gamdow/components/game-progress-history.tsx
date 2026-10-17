"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AccessTimeRounded,
  CheckCircleRounded,
  TrendingUpRounded,
  SwapHorizRounded,
} from "@mui/icons-material";
import { Box, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { Button, Chip } from "@/components/ui";
import { gameActivityRepository } from "@/services/game-activity-repository";
import type { Game } from "@/types/game";
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
  progressChanged: number;
  progress?: number;
  hasProgress: boolean;
  statusTransitions: string[];
}

function groupByDay(events: GameActivityEvent[]) {
  const days = new Map<string, DayActivity>();
  for (const event of events) {
    const date = event.occurredAt.slice(0, 10);
    const day =
      days.get(date) ?? {
        date,
        minutesPlayed: 0,
        progressChanged: 0,
        hasProgress: false,
        statusTransitions: [],
      };
    days.set(date, day);

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
      day.minutesPlayed += Math.max(0, delta);
    }
    if (event.type === "PROGRESS_UPDATED") {
      day.progressChanged += event.deltaProgress ?? 0;
      day.progress = event.progress;
      day.hasProgress = true;
    }
  }
  return [...days.values()].sort((a, b) => b.date.localeCompare(a.date));
}

function JourneySummary({ game }: { game: Game }) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.75, md: 2.25 } }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", sm: "repeat(3,minmax(0,1fr))" }, gap: 2 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">STARTED</Typography>
          <Typography sx={{ fontWeight: 700, mt: .25 }}>{game.startedAt || "Not started yet"}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">CURRENT STATUS</Typography>
          <Typography sx={{ fontWeight: 700, mt: .25, color: "primary.main" }}>{game.status}</Typography>
        </Box>
        {game.completedAt && <Box>
          <Typography variant="caption" color="text.secondary">COMPLETED</Typography>
          <Typography sx={{ fontWeight: 700, mt: .25 }}>{game.completedAt}</Typography>
        </Box>}
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

  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{ justifyContent: "space-between", gap: 1.5, mb: 2.5 }}
      >
        <Box>
          <Typography variant="overline" color="primary.main" sx={{ letterSpacing: ".15em" }}>
            {compact ? "PLAY HISTORY" : "BY DAY"}
          </Typography>
          <Typography variant="h5">{compact ? "Recent activity" : "Daily records"}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
            {compact
              ? "A quick view of your latest play and progress."
              : "Playtime, progress and status changes in one readable list."}
          </Typography>
        </Box>
        <Chip size="small" label={`${days.length} ${days.length === 1 ? "day" : "days"}`} />
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
                gridTemplateColumns: "repeat(4,minmax(0,1fr))",
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
                  xs: "repeat(2,minmax(0,1fr))",
                  sm: "repeat(4,minmax(0,1fr))",
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

              </Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <AccessTimeRounded sx={{ fontSize: 18, color: "primary.main" }} />
                <Box>
                  <Typography color={day.minutesPlayed > 0 ? "primary.main" : "text.secondary"}>
                    {day.minutesPlayed > 0
                      ? duration(day.minutesPlayed).replace("+", "")
                      : "—"}
                  </Typography>

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
                      : "—"}
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
                      : "—"}
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
    <Stack spacing={2}>
      <JourneySummary game={game} />
      <DayActivityList days={days} compact={false} />
    </Stack>
  );
}
