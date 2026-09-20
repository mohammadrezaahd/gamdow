"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { RefreshRounded } from "@mui/icons-material";
import { Button, Chip, TextField, ToggleButton, ToggleButtonGroup } from "@/components/ui";
import { EmptyState, Metric, SectionTitle } from "@/components/page-parts";
import { statuses } from "@/services/library-repository";
import { statisticsRepository } from "@/services/statistics-repository";
import type {
  ActivityPeriodSummary,
  ActivityStatistics,
  GameActivityEvent,
} from "@/types/game-activity";

const formatMinutes = (minutes: number) => {
  const absolute = Math.abs(Math.round(minutes));
  const hours = Math.floor(absolute / 60);
  const rest = absolute % 60;
  const value = [hours ? `${hours}h` : "", rest ? `${rest}m` : ""]
    .filter(Boolean)
    .join(" ");
  return `${minutes < 0 ? "−" : ""}${value || "0m"}`;
};

const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: value.includes("T") ? "short" : undefined,
      }).format(new Date(value))
    : "—";

const formatPeriod = (period: string) => {
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [year, month] = period.split("-").map(Number);
    return new Intl.DateTimeFormat(undefined, {
      month: "long",
      year: "numeric",
    }).format(new Date(year, month - 1, 1));
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(`${period}T12:00:00`));
};

const eventLabel = (event: GameActivityEvent) => {
  switch (event.type) {
    case "ADDED":
      return "Added to library";
    case "STATUS_CHANGED":
      return "Status changed";
    case "STARTED":
      return "Started playing";
    case "COMPLETED":
      return "Completed";
    case "COMPLETION_CLEARED":
      return "Completion cleared";
    case "START_DATE_CHANGED":
      return "Start date changed";
    case "START_DATE_CLEARED":
      return "Start date cleared";
    case "PLAYTIME_UPDATED":
      return "Playtime updated";
    case "COMPLETION_DATE_CHANGED":
      return "Completion date changed";
    case "EXTERNAL_ACTIVITY":
      return "External activity synced";
    case "BASELINE":
      return "Tracking baseline";
  }
};

function PeriodTable({ rows }: { rows: ActivityPeriodSummary[] }) {
  return rows.length ? (
    <TableContainer sx={{ maxHeight: 560 }}>
      <Table stickyHeader size="small" aria-label="Activity by period">
        <TableHead>
          <TableRow>
            <TableCell>Period</TableCell>
            <TableCell align="right">Active games</TableCell>
            <TableCell align="right">Playtime change</TableCell>
            <TableCell align="right">Updates</TableCell>
            <TableCell align="right">Status changes</TableCell>
            <TableCell align="right">Started</TableCell>
            <TableCell align="right">Completed</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.period} hover>
              <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                {formatPeriod(row.period)}
              </TableCell>
              <TableCell align="right">{row.activeGames}</TableCell>
              <TableCell
                align="right"
                sx={{ color: row.minutesChanged > 0 ? "primary.main" : undefined }}
              >
                {formatMinutes(row.minutesChanged)}
              </TableCell>
              <TableCell align="right">{row.playtimeUpdates}</TableCell>
              <TableCell align="right">{row.statusChanges}</TableCell>
              <TableCell align="right">{row.started}</TableCell>
              <TableCell align="right">{row.completed}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  ) : (
    <Typography color="text.secondary">No activity has been recorded for this period yet.</Typography>
  );
}

export function StatisticsPage() {
  const [statistics, setStatistics] = useState<ActivityStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<"monthly" | "daily">("monthly");
  const [gameFilter, setGameFilter] = useState("");
  const [activityFilter, setActivityFilter] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    statisticsRepository
      .load(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setStatistics(result);
          setError("");
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Could not load activity statistics.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    const reload = () => setRefresh((value) => value + 1);
    window.addEventListener("gamdow:steam-updated", reload);
    window.addEventListener("gamdow:storage-updated", reload);
    return () => {
      window.removeEventListener("gamdow:steam-updated", reload);
      window.removeEventListener("gamdow:storage-updated", reload);
    };
  }, []);

  const current = statistics;
  const filteredGames = useMemo(() => {
    if (!current) return [];
    const query = gameFilter.trim().toLocaleLowerCase();
    return current.games.filter(
      (game) => !query || game.title.toLocaleLowerCase().includes(query),
    );
  }, [current, gameFilter]);
  const filteredActivities = useMemo(() => {
    if (!current) return [];
    const query = activityFilter.trim().toLocaleLowerCase();
    return current.activities.filter(
      (event) =>
        !query ||
        event.gameTitle.toLocaleLowerCase().includes(query) ||
        eventLabel(event).toLocaleLowerCase().includes(query) ||
        event.source.toLocaleLowerCase().includes(query),
    );
  }, [current, activityFilter]);
  const statusCounts = useMemo(
    () =>
      statuses.map((status) => ({
        status,
        count: current?.games.filter((game) => game.status === status).length ?? 0,
      })),
    [current],
  );

  return (
    <>
      <SectionTitle
        title="Statistics"
        eyebrow="THE STORIES ADD UP"
        action={
          <Button
            variant="outlined"
            startIcon={<RefreshRounded />}
            disabled={loading}
            onClick={() => setRefresh((value) => value + 1)}
          >
            Refresh activity
          </Button>
        }
      />
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      {loading && !current ? (
        <Paper sx={{ p: 5, display: "grid", placeItems: "center" }}>
          <CircularProgress aria-label="Loading statistics" />
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            Building your activity report…
          </Typography>
        </Paper>
      ) : !current || !current.totalGames ? (
        <EmptyState
          title="Your story is just beginning"
          description="Add games and your status and playtime changes will be collected here."
        />
      ) : (
        <Stack spacing={3}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "minmax(0,1fr) minmax(0,1fr)",
                lg: "repeat(4,minmax(0,1fr))",
              },
              gap: 2,
            }}
          >
            <Metric value={formatMinutes(current.totalMinutes)} label="Total recorded playtime" />
            <Metric value={current.trackedGames} label={`Games with playtime · ${current.totalGames} total`} />
            <Metric value={current.activeDays} label="Active days in recorded history" />
            <Metric value={current.totalEvents} label={`${current.playtimeUpdates} playtime · ${current.statusChanges} status updates`} />
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { lg: "minmax(0,1fr) minmax(0,1fr)" },
              gap: 3,
            }}
          >
            <Paper sx={{ p: { xs: 2, md: 3 } }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                sx={{ justifyContent: "space-between", gap: 2, mb: 3 }}
              >
                <Box>
                  <Typography variant="h5">Activity calendar</Typography>
                  <Typography variant="body2" color="text.secondary">
                    A monthly and daily view of every recorded change.
                  </Typography>
                </Box>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={period}
                  onChange={(_, value) => value && setPeriod(value)}
                  aria-label="Activity period"
                >
                  <ToggleButton value="monthly">Monthly</ToggleButton>
                  <ToggleButton value="daily">Daily</ToggleButton>
                </ToggleButtonGroup>
              </Stack>
              <PeriodTable rows={period === "monthly" ? current.monthly : current.daily} />
            </Paper>

            <Paper sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="h5">Current status mix</Typography>
              <Typography variant="body2" color="text.secondary">
                Based on the latest state of every game in your archive.
              </Typography>
              <Stack spacing={2.5} sx={{ mt: 3 }}>
                {statusCounts.map(({ status, count }) => (
                  <Box key={status}>
                    <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                      <Typography variant="body2">{status}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {count} / {current.totalGames}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      aria-label={`${status}: ${count} games`}
                      variant="determinate"
                      value={(count / current.totalGames) * 100}
                      sx={{ mt: 1, height: 7, borderRadius: 5 }}
                    />
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Box>

          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              sx={{ justifyContent: "space-between", gap: 2, mb: 2 }}
            >
              <Box>
                <Typography variant="h5">Games · complete activity totals</Typography>
                <Typography variant="body2" color="text.secondary">
                  One row per game, including games with no recorded event yet.
                </Typography>
              </Box>
              <TextField
                size="small"
                label="Find a game"
                value={gameFilter}
                onChange={(event) => setGameFilter(event.target.value)}
                sx={{ width: { xs: "100%", sm: 240 } }}
              />
            </Stack>
            <TableContainer sx={{ maxHeight: 620 }}>
              <Table stickyHeader size="small" aria-label="Game activity totals">
                <TableHead>
                  <TableRow>
                    <TableCell>Game</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Playtime</TableCell>
                    <TableCell align="right">Recorded events</TableCell>
                    <TableCell align="right">Status changes</TableCell>
                    <TableCell align="right">Active days</TableCell>
                    <TableCell>Last activity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredGames.map((game) => (
                    <TableRow key={game.gameId} hover>
                      <TableCell sx={{ minWidth: 180, fontWeight: 700 }}>
                        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
                          <span>{game.title}</span>
                          <Chip size="small" label={game.source} />
                        </Stack>
                      </TableCell>
                      <TableCell><Chip size="small" label={game.status} /></TableCell>
                      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{formatMinutes(game.totalMinutes)}</TableCell>
                      <TableCell align="right">{game.eventCount}</TableCell>
                      <TableCell align="right">{game.statusChanges}</TableCell>
                      <TableCell align="right">{game.activeDays}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDate(game.lastActivityAt)}</TableCell>
                    </TableRow>
                  ))}
                  {!filteredGames.length && (
                    <TableRow><TableCell colSpan={7}>No games match this search.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              sx={{ justifyContent: "space-between", gap: 2, mb: 2 }}
            >
              <Box>
                <Typography variant="h5">Complete activity log</Typography>
                <Typography variant="body2" color="text.secondary">
                  Every status, playtime and library activity record in chronological order.
                </Typography>
              </Box>
              <TextField
                size="small"
                label="Filter activity"
                value={activityFilter}
                onChange={(event) => setActivityFilter(event.target.value)}
                sx={{ width: { xs: "100%", sm: 240 } }}
              />
            </Stack>
            {filteredActivities.length ? (
              <TableContainer sx={{ maxHeight: 700 }}>
                <Table stickyHeader size="small" aria-label="Complete activity log">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Game</TableCell>
                      <TableCell>Activity</TableCell>
                      <TableCell>Change</TableCell>
                      <TableCell>Source</TableCell>
                      <TableCell>Recorded</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredActivities.map((event) => (
                      <TableRow key={event.id} hover>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDate(event.occurredAt)}</TableCell>
                        <TableCell sx={{ minWidth: 170, fontWeight: 700 }}>{event.gameTitle}</TableCell>
                        <TableCell>
                          <Typography variant="body2">{eventLabel(event)}</Typography>
                          {event.fromStatus && event.toStatus && (
                            <Typography variant="caption" color="text.secondary">
                              {event.fromStatus} → {event.toStatus}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {event.deltaMinutes !== undefined
                            ? `${formatMinutes(event.deltaMinutes)} · ${formatMinutes(event.totalMinutes ?? 0)} total`
                            : event.toStatus || event.note || "—"}
                        </TableCell>
                        <TableCell><Chip size="small" label={event.source} /></TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDate(event.recordedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary">
                No matching activity. Change a status or playtime to start the log.
              </Typography>
            )}
          </Paper>
        </Stack>
      )}
    </>
  );
}
