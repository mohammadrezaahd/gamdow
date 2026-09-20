"use client";

import { useCallback, useEffect, useState } from "react";
import { CircularProgress, Paper, Stack, Typography, Box } from "@mui/material";
import { Chip } from "@/components/ui";
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

const dayLabel = (date: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(`${date}T12:00:00`));

interface DayActivity {
  date: string;
  playtimeChanged: number;
  playtimeTotal?: number;
  progressChanged: number;
  progress?: number;
  hasProgress: boolean;
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
        sources: new Set<string>(),
      };
    days.set(date, day);
    day.sources.add(event.source);
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

export function GameProgressHistory({ game }: { game: Game }) {
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

  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{ justifyContent: "space-between", gap: 1.5, mb: 2.5 }}
      >
        <Box>
          <Typography variant="h5">Progress & playtime history</Typography>
          <Typography variant="body2" color="text.secondary">
            Daily record of what you played and how far you got.
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
        <Stack spacing={1.25}>
          {days.map((day) => (
            <Box
              key={day.date}
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "minmax(130px,.7fr) 1fr 1fr" },
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
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
