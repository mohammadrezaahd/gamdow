"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
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
  ActivityBreakdown,
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
  return new Intl.DateTimeFormat(undefined, short
    ? { month: "short", day: "numeric" }
    : { dateStyle: "medium" }
  ).format(new Date(`${period}T12:00:00`));
};

function ActivityChart({ rows }: { rows: ActivityPeriodSummary[] }) {
  const chronological = [...rows].reverse();
  const max = Math.max(1, ...chronological.map((row) => Math.max(row.minutesGained, row.progressGained)));
  if (!rows.length)
    return (
      <Box sx={{ py: 5, textAlign: "center" }}>
        <Typography color="text.secondary">No recorded activity in this period.</Typography>
      </Box>
    );

  return (
    <Box sx={{ overflowX: "auto", pb: 1 }}>
      <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1.5, minWidth: Math.max(chronological.length * 52, 420), height: 190, px: 1 }}>
        {chronological.map((row) => (
          <Box key={row.period} title={`${periodLabel(row.period)} · ${formatMinutes(row.minutesGained)} playtime · ${formatProgress(row.progressGained)} progress`} sx={{ width: 38, flex: "0 0 38px", textAlign: "center" }}>
            <Stack direction="row" spacing={0.5} sx={{ height: 140, alignItems: "flex-end", justifyContent: "center" }}>
              <Box sx={{ width: 13, height: row.minutesGained ? Math.max(7, (row.minutesGained / max) * 125) : 2, borderRadius: "5px 5px 2px 2px", bgcolor: "primary.main" }} />
              <Box sx={{ width: 13, height: row.progressGained ? Math.max(7, (row.progressGained / max) * 125) : 2, borderRadius: "5px 5px 2px 2px", bgcolor: "secondary.main" }} />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, whiteSpace: "nowrap" }}>
              {periodLabel(row.period, true)}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function Breakdown({ title, rows, value = "minutes" }: { title: string; rows: ActivityBreakdown[]; value?: "minutes" | "games" }) {
  const visible = rows.slice(0, 8);
  const max = Math.max(1, ...visible.map((row) => value === "minutes" ? row.minutes : row.games));
  return (
    <Paper sx={{ p: { xs: 2, md: 2.5 }, height: "100%" }}>
      <Typography variant="h6">{title}</Typography>
      <Typography variant="caption" color="text.secondary">
        {value === "minutes" ? "Based on recorded playtime." : "Games currently in this group."}
      </Typography>
      <Stack spacing={1.25} sx={{ mt: 2 }}>
        {visible.length ? visible.map((row) => {
          const amount = value === "minutes" ? row.minutes : row.games;
          return (
            <Box key={row.key}>
              <Stack direction="row" sx={{ justifyContent: "space-between", gap: 1, mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.label}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {value === "minutes" ? formatMinutes(row.minutes).replace("+", "") : `${row.games} games`}
                </Typography>
              </Stack>
              <Box sx={{ height: 5, borderRadius: 99, bgcolor: "action.hover", overflow: "hidden" }}>
                <Box sx={{ width: `${Math.max(2, (amount / max) * 100)}%`, height: "100%", bgcolor: "primary.main", borderRadius: 99 }} />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {row.events} events · {row.activeDays} active days
              </Typography>
            </Box>
          );
        }) : <Typography color="text.secondary">No data yet.</Typography>}
      </Stack>
    </Paper>
  );
}

function WeekdayCard({ statistics }: { statistics: ActivityStatistics }) {
  const max = Math.max(1, ...statistics.weekdays.map((row) => row.minutes));
  return (
    <Paper sx={{ p: { xs: 2, md: 2.5 } }}>
      <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", gap: 1 }}>
        <Box>
          <Typography variant="h6">When you play</Typography>
          <Typography variant="caption" color="text.secondary">Playtime grouped by weekday.</Typography>
        </Box>
        <Chip size="small" label={`${statistics.playDays} play days`} />
      </Stack>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: { xs: 0.5, sm: 1.25 }, alignItems: "end", height: 150, mt: 2 }}>
        {statistics.weekdays.map((row) => (
          <Box key={row.weekday} sx={{ textAlign: "center", minWidth: 0 }}>
            <Box sx={{ height: 105, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
              <Box title={`${row.label}: ${formatMinutes(row.minutes)}`} sx={{ width: "min(24px,70%)", height: row.minutes ? `${Math.max(5, (row.minutes / max) * 100)}%` : 3, bgcolor: "primary.main", borderRadius: "5px 5px 2px 2px" }} />
            </Box>
            <Typography variant="caption" color="text.secondary">{row.label}</Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

function RecentActivity({ statistics }: { statistics: ActivityStatistics }) {
  return (
    <Paper sx={{ p: { xs: 2, md: 2.5 } }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", gap: 1, mb: 1.5 }}>
        <Box>
          <Typography variant="h6">Recent activity</Typography>
          <Typography variant="caption" color="text.secondary">The raw activity stream is retained for future year-end reports.</Typography>
        </Box>
        <Chip size="small" label={`${statistics.totalEvents} total events`} />
      </Stack>
      <Stack spacing={0.5} sx={{ maxHeight: 360, overflowY: "auto" }}>
        {statistics.activities.slice(0, 40).map((event) => (
          <Box key={event.id} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "140px minmax(150px,1fr) auto" }, gap: 1, alignItems: "center", py: 1, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="caption" color="text.secondary">
              {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(event.occurredAt))}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{event.gameTitle}</Typography>
            <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
              <Chip size="small" label={event.type.replaceAll("_", " ").toLowerCase()} />
              <Chip size="small" label={event.source} />
              {event.deltaMinutes !== undefined && event.deltaMinutes !== 0 && <Chip size="small" label={formatMinutes(event.deltaMinutes)} />}
              {event.progress !== undefined && <Chip size="small" label={`${event.progress}%`} />}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Paper>
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
    statisticsRepository.load(filters, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setStatistics(result);
          setError("");
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(reason instanceof Error ? reason.message : "Could not load activity statistics.");
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

  const rows = useMemo(
    () => statistics ? (period === "monthly" ? statistics.monthly : statistics.daily) : [],
    [statistics, period],
  );
  const setFilter = <K extends keyof ActivityStatisticsQuery>(key: K, value: ActivityStatisticsQuery[K] | undefined) =>
    setFilters((existing) => ({ ...existing, [key]: value === undefined || value === "" ? undefined : value }));
  const filtersActive = Object.values(filters).some((value) => value !== undefined);

  return (
    <>
      <SectionTitle
        title="Statistics"
        eyebrow="PLAY · TRACK · REMEMBER"
        action={<Button variant="outlined" startIcon={<RefreshRounded />} disabled={loading} onClick={() => setRefresh((value) => value + 1)}>Refresh</Button>}
      />
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {statistics && (
        <Paper sx={{ p: { xs: 2, md: 2.5 }, mb: 3 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(230px,1.2fr) repeat(5,minmax(120px,.7fr)) auto" }, gap: 1.25, alignItems: { lg: "center" } }}>
            <Box>
              <Typography variant="h6">Activity archive</Typography>
              <Typography variant="caption" color="text.secondary">Filters affect the analytics below, while the underlying event archive remains append-only.</Typography>
            </Box>
            <TextField select size="small" label="Genre" value={filters.genre ?? ""} onChange={(e) => setFilter("genre", e.target.value || undefined)}>
              <MenuItem value="">All genres</MenuItem>
              {statistics.availableFilters.genres.map((genre) => <MenuItem key={genre} value={genre}>{genre}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Platform" value={filters.platform ?? ""} onChange={(e) => setFilter("platform", e.target.value || undefined)}>
              <MenuItem value="">All platforms</MenuItem>
              {statistics.availableFilters.platforms.map((platform) => <MenuItem key={platform} value={platform}>{platform}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Status" value={filters.status ?? ""} onChange={(e) => setFilter("status", (e.target.value || undefined) as ActivityStatisticsQuery["status"])}>
              <MenuItem value="">All statuses</MenuItem>
              {statistics.availableFilters.statuses.map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Source" value={filters.source ?? ""} onChange={(e) => setFilter("source", (e.target.value || undefined) as ActivityStatisticsQuery["source"])}>
              <MenuItem value="">All sources</MenuItem>
              {statistics.availableFilters.sources.map((source) => <MenuItem key={source} value={source}>{source}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Favorites" value={filters.favorite === undefined ? "" : String(filters.favorite)} onChange={(e) => setFilter("favorite", e.target.value === "" ? undefined : e.target.value === "true")}>
              <MenuItem value="">All games</MenuItem>
              <MenuItem value="true">Favorites</MenuItem>
              <MenuItem value="false">Not favorites</MenuItem>
            </TextField>
            {filtersActive && <Button onClick={() => setFilters({})}>Clear</Button>}
          </Box>
        </Paper>
      )}

      {loading && !statistics ? (
        <Paper sx={{ p: 5, display: "grid", placeItems: "center" }}>
          <CircularProgress aria-label="Loading statistics" />
          <Typography color="text.secondary" sx={{ mt: 2 }}>Building your activity report…</Typography>
        </Paper>
      ) : !statistics ? (
        <EmptyState title="Your story is just beginning" description="Add games and record progress or playtime to start the activity archive." />
      ) : !statistics.totalGames ? (
        <EmptyState title="No games match these filters" description="Clear one or more filters to see more of your activity." />
      ) : (
        <Stack spacing={3}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", lg: "repeat(6,minmax(0,1fr))" }, gap: 2 }}>
            <Metric value={formatMinutes(statistics.totalMinutes)} label="Total playtime" />
            <Metric value={statistics.playDays} label="Play days" />
            <Metric value={statistics.activeDays} label="Activity days" />
            <Metric value={statistics.totalEvents} label="Tracked events" />
            <Metric value={statistics.statusChanges} label="Status changes" />
            <Metric value={statistics.progressUpdates} label="Progress updates" />
          </Box>

          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", gap: 2, mb: 2 }}>
              <Box>
                <Typography variant="h5">Activity rhythm</Typography>
                <Typography variant="body2" color="text.secondary">Playtime and progress changes recorded over time.</Typography>
              </Box>
              <ToggleButtonGroup exclusive size="small" value={period} onChange={(_, value) => value && setPeriod(value)} aria-label="Activity period">
                <ToggleButton value="monthly">Monthly</ToggleButton>
                <ToggleButton value="daily">Daily</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
            <ActivityChart rows={rows} />
          </Paper>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(3,minmax(0,1fr))" }, gap: 2 }}>
            <Breakdown title="Genres" rows={statistics.genres} />
            <Breakdown title="Platforms" rows={statistics.platforms} />
            <Breakdown title="Sources" rows={statistics.sources} value="games" />
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0,1.35fr) minmax(0,.65fr)" }, gap: 2 }}>
            <WeekdayCard statistics={statistics} />
            <Breakdown title="Current status" rows={statistics.statuses} value="games" />
          </Box>

          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", mb: 2, gap: 2 }}>
              <Box>
                <Typography variant="h5">{period === "monthly" ? "Monthly details" : "Daily details"}</Typography>
                <Typography variant="body2" color="text.secondary">Every recorded status, playtime and progress event is available here.</Typography>
              </Box>
              <Chip size="small" label={`${rows.length} ${period === "monthly" ? "months" : "days"}`} />
            </Stack>
            <Stack spacing={0.5} sx={{ maxHeight: 420, overflowY: "auto" }}>
              {rows.map((row) => (
                <Box key={row.period} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "minmax(130px,1fr) auto auto auto auto" }, gap: 1.5, alignItems: "center", p: 1.25, borderBottom: 1, borderColor: "divider" }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{periodLabel(row.period)}</Typography>
                  <Typography variant="body2" color={row.minutesGained ? "primary.main" : "text.secondary"}>{formatMinutes(row.minutesGained)}</Typography>
                  <Typography variant="body2" color={row.progressGained ? "secondary.main" : "text.secondary"}>{formatProgress(row.progressGained)}</Typography>
                  <Typography variant="caption" color="text.secondary">{row.activeGames} games</Typography>
                  <Typography variant="caption" color="text.secondary">{row.eventCount} events</Typography>
                </Box>
              ))}
            </Stack>
          </Paper>

          <RecentActivity statistics={statistics} />
        </Stack>
      )}
    </>
  );
}
