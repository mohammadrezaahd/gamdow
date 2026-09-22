"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Box, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { RefreshRounded } from "@mui/icons-material";
import {
  Button,
  Chip,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@/components/ui";
import { EmptyState, Metric, SectionTitle } from "@/components/page-parts";
import { statisticsRepository } from "@/services/statistics-repository";
import type {
  ActivityPeriodSummary,
  ActivityStatistics,
  ActivityStatisticsQuery,
} from "@/types/game-activity";

const formatMinutes = (minutes: number) => {
  const absolute = Math.abs(Math.round(minutes));
  const hours = Math.floor(absolute / 60);
  const rest = absolute % 60;
  const value = [hours ? `${hours}h` : "", rest ? `${rest}m` : ""]
    .filter(Boolean)
    .join(" ");
  return `${minutes < 0 ? "−" : minutes > 0 ? "+" : ""}${value || "0m"}`;
};

const formatProgress = (value: number) => {
  const rounded = Math.round(Math.abs(value) * 10) / 10;
  return `${value < 0 ? "−" : value > 0 ? "+" : ""}${rounded} pts`;
};

const periodLabel = (period: string, short = false) => {
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [year, month] = period.split("-").map(Number);
    return new Intl.DateTimeFormat(undefined, {
      month: short ? "short" : "long",
      ...(short ? {} : { year: "numeric" }),
    }).format(new Date(year, month - 1, 1));
  }
  const date = new Date(`${period}T12:00:00`);
  return short
    ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date)
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
};

function ActivityChart({
  rows,
  mode,
}: {
  rows: ActivityPeriodSummary[];
  mode: "monthly" | "daily";
}) {
  const chronological = [...rows].reverse();
  const maxMinutes = Math.max(1, ...rows.map((row) => row.minutesGained));
  const maxProgress = Math.max(1, ...rows.map((row) => row.progressGained));

  if (!rows.length)
    return (
      <Box sx={{ py: 6, textAlign: "center" }}>
        <Typography color="text.secondary">
          No recorded activity yet. Change a game&apos;s status, playtime or progress to start the chart.
        </Typography>
      </Box>
    );

  return (
    <>
      <Box sx={{ overflowX: "auto", pb: 1 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-end",
            gap: { xs: 1.25, md: 2 },
            minWidth: Math.max(chronological.length * 52, 420),
            height: 245,
            px: 1,
            pt: 2,
          }}
        >
          {chronological.map((row) => {
            const minutesHeight = row.minutesGained
              ? Math.max(8, (row.minutesGained / maxMinutes) * 158)
              : 3;
            const progressHeight = row.progressGained
              ? Math.max(8, (row.progressGained / maxProgress) * 158)
              : 3;
            return (
              <Box
                key={row.period}
                title={`${periodLabel(row.period)} · ${formatMinutes(row.minutesGained)} playtime · ${formatProgress(row.progressGained)} progress`}
                sx={{ width: 38, flex: "0 0 38px", textAlign: "center" }}
              >
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{ height: 175, alignItems: "flex-end", justifyContent: "center" }}
                >
                  <Box
                    aria-label={`${periodLabel(row.period)} playtime ${formatMinutes(row.minutesGained)}`}
                    sx={{
                      width: 14,
                      height: minutesHeight,
                      borderRadius: "4px 4px 1px 1px",
                      bgcolor: "primary.main",
                      transition: "height .2s ease",
                    }}
                  />
                  <Box
                    aria-label={`${periodLabel(row.period)} progress ${formatProgress(row.progressGained)}`}
                    sx={{
                      width: 14,
                      height: progressHeight,
                      borderRadius: "4px 4px 1px 1px",
                      bgcolor: "secondary.main",
                      transition: "height .2s ease",
                    }}
                  />
                </Stack>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 1, whiteSpace: "nowrap", overflow: "hidden" }}
                >
                  {periodLabel(row.period, true)}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>
      <Stack direction="row" spacing={2.5} sx={{ mt: 1, flexWrap: "wrap" }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
          <Box sx={{ width: 10, height: 10, bgcolor: "primary.main", borderRadius: 1 }} />
          <Typography variant="caption" color="text.secondary">Playtime</Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
          <Box sx={{ width: 10, height: 10, bgcolor: "secondary.main", borderRadius: 1 }} />
          <Typography variant="caption" color="text.secondary">Progress points</Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {mode === "daily" ? "Each bar is one day" : "Each bar is one month"}
        </Typography>
      </Stack>
    </>
  );
}

function ActivityDetails({ rows }: { rows: ActivityPeriodSummary[] }) {
  return rows.length ? (
    <Stack spacing={0.75} sx={{ maxHeight: 390, overflowY: "auto", pr: 0.5 }}>
      {rows.map((row) => (
        <Box
          key={row.period}
          sx={{
            display: "grid",
            gridTemplateColumns: "minmax(100px,1fr) auto auto auto",
            gap: { xs: 1, sm: 2.5 },
            alignItems: "center",
            p: 1.25,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {periodLabel(row.period)}
          </Typography>
          <Typography variant="body2" color={row.minutesGained ? "primary.main" : "text.secondary"}>
            {formatMinutes(row.minutesGained)}
          </Typography>
          <Typography variant="body2" color={row.progressGained ? "secondary.main" : "text.secondary"}>
            {formatProgress(row.progressGained)}
          </Typography>
          <Stack sx={{ alignItems: "flex-end" }}>
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
              {row.activeGames} {row.activeGames === 1 ? "game" : "games"}
            </Typography>
            {row.statusChanges > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                {row.statusChanges} status {row.statusChanges === 1 ? "change" : "changes"}
              </Typography>
            )}
          </Stack>
        </Box>
      ))}
    </Stack>
  ) : (
    <Typography color="text.secondary">No activity in this range yet.</Typography>
  );
}

export function StatisticsPage() {
  const [statistics, setStatistics] = useState<ActivityStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<"monthly" | "daily">("monthly");
  const [filters, setFilters] = useState<ActivityStatisticsQuery>({});
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    statisticsRepository
      .load(filters, controller.signal)
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
  }, [filters, refresh]);

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
  const rows = useMemo(
    () => (current ? (period === "monthly" ? current.monthly : current.daily) : []),
    [current, period],
  );
  const setFilter = <K extends keyof ActivityStatisticsQuery>(
    key: K,
    value: ActivityStatisticsQuery[K] | undefined,
  ) =>
    setFilters((existing) => ({
      ...existing,
      [key]: value === undefined || value === "" ? undefined : value,
    }));
  const filtersActive = Object.values(filters).some((value) => value !== undefined);

  return (
    <>
      <SectionTitle
        title="Statistics"
        eyebrow="PLAY · TRACK · REMEMBER"
        action={
          <Button
            variant="outlined"
            startIcon={<RefreshRounded />}
            disabled={loading}
            onClick={() => setRefresh((value) => value + 1)}
          >
            Refresh
          </Button>
        }
      />
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {current && (
        <Paper sx={{ p: { xs: 2, md: 2.5 }, mb: 3 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                lg: "minmax(260px,1.25fr) repeat(5,minmax(130px,.7fr)) auto",
              },
              alignItems: { lg: "center" },
              gap: 1.25,
            }}
          >
            <Box sx={{ pr: { lg: 1.25 } }}>
              <Typography variant="h6">Filter the archive</Typography>
              <Typography variant="caption" color="text.secondary">
                See your rhythm by genre, platform, status or source.
              </Typography>
            </Box>
            <TextField
              select
              size="small"
              label="Genre"
              value={filters.genre ?? ""}
              onChange={(event) => setFilter("genre", event.target.value || undefined)}
              sx={{ width: "100%" }}
            >
              <MenuItem value="">All genres</MenuItem>
              {current.availableFilters.genres.map((genre) => (
                <MenuItem key={genre} value={genre}>{genre}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Platform"
              value={filters.platform ?? ""}
              onChange={(event) => setFilter("platform", event.target.value || undefined)}
              sx={{ width: "100%" }}
            >
              <MenuItem value="">All platforms</MenuItem>
              {current.availableFilters.platforms.map((platform) => (
                <MenuItem key={platform} value={platform}>{platform}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Status"
              value={filters.status ?? ""}
              onChange={(event) =>
                setFilter(
                  "status",
                  (event.target.value || undefined) as ActivityStatisticsQuery["status"],
                )
              }
              sx={{ width: "100%" }}
            >
              <MenuItem value="">All statuses</MenuItem>
              {current.availableFilters.statuses.map((status) => (
                <MenuItem key={status} value={status}>{status}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Source"
              value={filters.source ?? ""}
              onChange={(event) =>
                setFilter(
                  "source",
                  (event.target.value || undefined) as ActivityStatisticsQuery["source"],
                )
              }
              sx={{ width: "100%" }}
            >
              <MenuItem value="">All sources</MenuItem>
              {current.availableFilters.sources.map((source) => (
                <MenuItem key={source} value={source}>{source}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Favorites"
              value={filters.favorite === undefined ? "" : String(filters.favorite)}
              onChange={(event) =>
                setFilter(
                  "favorite",
                  event.target.value === "" ? undefined : event.target.value === "true",
                )
              }
              sx={{ width: "100%" }}
            >
              <MenuItem value="">All games</MenuItem>
              <MenuItem value="true">Favorites</MenuItem>
              <MenuItem value="false">Not favorites</MenuItem>
            </TextField>
            {filtersActive && (
              <Button onClick={() => setFilters({})} sx={{ justifySelf: { lg: "end" } }}>
                Clear
              </Button>
            )}
          </Box>
        </Paper>
      )}
      {loading && !current ? (
        <Paper sx={{ p: 5, display: "grid", placeItems: "center" }}>
          <CircularProgress aria-label="Loading statistics" />
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            Building your activity report…
          </Typography>
        </Paper>
      ) : !current ? (
        <EmptyState
          title="Your story is just beginning"
          description="Add games and record progress or playtime to see the activity chart."
        />
      ) : !current.totalGames ? (
        <EmptyState
          title="No games match these filters"
          description="Clear one or more filters to see more of your activity."
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
            <Metric value={formatMinutes(current.totalMinutes)} label="Total playtime" />
            <Metric value={current.activeDays} label={`Active days · ${current.totalGames} games`} />
            <Metric value={current.statusChanges} label="Status changes" />
            <Metric value={current.progressUpdates} label="Progress updates" />
          </Box>

          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              sx={{ justifyContent: "space-between", gap: 2, mb: 2 }}
            >
              <Box>
                <Typography variant="h5">Activity rhythm</Typography>
                <Typography variant="body2" color="text.secondary">
                  How much you played and how many progress points you recorded.
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
            <ActivityChart rows={rows} mode={period} />
          </Paper>

          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", mb: 2, gap: 2 }}>
              <Box>
                <Typography variant="h5">{period === "monthly" ? "Monthly details" : "Daily details"}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Playtime, progress points and the number of games touched in each period.
                </Typography>
              </Box>
              <Chip size="small" label={`${rows.length} ${period === "monthly" ? "months" : "days"}`} />
            </Stack>
            <ActivityDetails rows={rows} />
          </Paper>
        </Stack>
      )}
    </>
  );
}
