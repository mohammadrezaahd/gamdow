"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { RefreshRounded } from "@mui/icons-material";
import { Button, Chip, MenuItem, TextField } from "@/components/ui";
import { EmptyState, Metric, SectionTitle } from "@/components/page-parts";
import { statisticsRepository } from "@/services/statistics-repository";
import { SteamProfilePanel } from "../steam/steam-profile-panel";
import type {
  ActivityLogPage,
  ActivityStatistics,
  ActivityStatisticsQuery,
} from "@/types/game-activity";
import type { GameStatus } from "@/types/game";
import type { GameActivitySource } from "@/types/game-activity";
import {
  ActivityLogTable,
  BreakdownAnalysis,
  GameAnalysis,
  PeriodAnalysis,
  WeekdayAnalysis,
} from "./statistics/analytics-sections";

type Filters = Omit<ActivityStatisticsQuery, "timeZone" | "fromDate" | "toDate">;
type FilterKey = keyof Filters;

const DAY_MS = 86_400_000;

const formatMinutes = (minutes: number) => {
  const value = Math.abs(Math.round(minutes));
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  const duration = [hours ? `${hours}h` : "", rest ? `${rest}m` : ""]
    .filter(Boolean)
    .join(" ");
  return `${minutes < 0 ? "−" : minutes > 0 ? "+" : ""}${duration || "0m"}`;
};

function localDate(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDate(day: string, amount: number) {
  return new Date(Date.parse(`${day}T12:00:00.000Z`) + amount * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export function StatisticsPage() {
  const [statistics, setStatistics] = useState<ActivityStatistics | null>(null);
  const [logPage, setLogPage] = useState<ActivityLogPage | null>(null);
  const [logTotal, setLogTotal] = useState<number | null>(null);
  const logTotalRef = useRef<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [logLoading, setLogLoading] = useState(true);
  const [error, setError] = useState("");
  const [logError, setLogError] = useState("");
  const [timeZone, setTimeZone] = useState("");
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");
  const [filters, setFilters] = useState<Filters>({});
  const [logCursors, setLogCursors] = useState<(string | undefined)[]>([undefined]);
  const [refresh, setRefresh] = useState(0);
  const currentCursor = logCursors[logCursors.length - 1];
  const filtersActive = Object.values(filters).some((value) => value !== undefined);
  const rangeDays = reportFrom && reportTo
    ? (Date.parse(`${reportTo}T12:00:00.000Z`) - Date.parse(`${reportFrom}T12:00:00.000Z`)) / DAY_MS + 1
    : 0;
  const dateRangeError = !reportFrom || !reportTo
    ? "Choose a start and end date."
    : reportTo < reportFrom
      ? "The end date must be on or after the start date."
      : rangeDays > 366
        ? "Choose a date range of at most 366 days."
        : "";

  const refreshAll = () => {
    logTotalRef.current = null;
    setLogTotal(null);
    setRefresh((value) => value + 1);
  };

  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const today = localDate(new Date(), zone);
    setTimeZone(zone);
    setReportTo(today);
    setReportFrom(shiftDate(today, -89));
  }, []);

  useEffect(() => {
    if (!timeZone || dateRangeError) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    statisticsRepository
      .load(
        { ...filters, timeZone, fromDate: reportFrom, toDate: reportTo },
        controller.signal,
      )
      .then((result) => {
        if (!controller.signal.aborted) {
          setStatistics(result);
          setError("");
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(reason instanceof Error ? reason.message : "Could not load activity analytics.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filters, refresh, timeZone, reportFrom, reportTo, dateRangeError]);

  useEffect(() => {
    if (!timeZone) return;
    const controller = new AbortController();
    setLogPage(null);
    setLogLoading(true);
    statisticsRepository
      .log(filters, currentCursor, controller.signal, 50, logTotalRef.current === null)
      .then((result) => {
        if (!controller.signal.aborted) {
          setLogPage(result);
          if (result.total !== undefined) {
            logTotalRef.current = result.total;
            setLogTotal(result.total);
          }
          setLogError("");
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setLogError(reason instanceof Error ? reason.message : "Could not load the activity log.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLogLoading(false);
      });
    return () => controller.abort();
  }, [filters, currentCursor, refresh, timeZone]);

  useEffect(() => {
    const reload = () => refreshAll();
    window.addEventListener("gamdow:steam-updated", reload);
    window.addEventListener("gamdow:storage-updated", reload);
    return () => {
      window.removeEventListener("gamdow:steam-updated", reload);
      window.removeEventListener("gamdow:storage-updated", reload);
    };
  }, []);

  const setFilter = <K extends FilterKey>(key: K, value: Filters[K] | undefined) => {
    setFilters((existing) => ({
      ...existing,
      [key]: value === undefined || value === "" ? undefined : value,
    }));
    setLogCursors([undefined]);
    logTotalRef.current = null;
    setLogTotal(null);
  };

  const applyPreset = (days: number) => {
    const today = localDate(new Date(), timeZone || "UTC");
    setReportTo(today);
    setReportFrom(shiftDate(today, -(days - 1)));
  };

  const clearFilters = () => {
    setFilters({});
    setLogCursors([undefined]);
    logTotalRef.current = null;
    setLogTotal(null);
  };

  const onLogNext = () => {
    if (!logPage?.nextCursor) return;
    setLogCursors((existing) => [...existing, logPage.nextCursor]);
  };
  const onLogPrevious = () => {
    setLogCursors((existing) => (existing.length > 1 ? existing.slice(0, -1) : existing));
  };
  const currentRange = useMemo(() => {
    if (!logPage || !logPage.items.length) return `${(logTotal ?? 0).toLocaleString()} events`;
    const from = (logCursors.length - 1) * logPage.limit + 1;
    const to = from + logPage.items.length - 1;
    return logTotal === null
      ? `${from.toLocaleString()}–${to.toLocaleString()} events`
      : `${from.toLocaleString()}–${Math.min(to, logTotal).toLocaleString()} of ${logTotal.toLocaleString()} events`;
  }, [logPage, logCursors.length, logTotal]);

  return (
    <>
      <SectionTitle
        title="Statistics"
        eyebrow="INTERNAL ANALYTICS / ACTIVITY ARCHIVE"
        action={
          <Button
            variant="outlined"
            startIcon={<RefreshRounded />}
            disabled={loading || logLoading}
            onClick={refreshAll}
          >
            Refresh report
          </Button>
        }
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        All historical periods are available through the date window; the Log always covers the full retained history.
      </Typography>

      {loading && statistics && <LinearProgress sx={{ mb: 2 }} aria-label="Refreshing statistics" />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {statistics && (
        <Paper sx={{ p: { xs: 2, md: 2.5 }, mb: 3 }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", md: "row" }} sx={{ justifyContent: "space-between", alignItems: { md: "center" }, gap: 1 }}>
              <Box>
                <Typography variant="h6">Report filters</Typography>
                <Typography variant="caption" color="text.secondary">Library filters apply to each analysis and the Log. Periods use {statistics.timeZone}.</Typography>
              </Box>
              {filtersActive && <Button size="small" onClick={clearFilters}>Clear library filters</Button>}
            </Stack>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))", xl: "repeat(5,minmax(0,1fr))" }, gap: 1.25 }}>
              <TextField select size="small" label="Genre" value={filters.genre ?? ""} onChange={(event) => setFilter("genre", event.target.value || undefined)}>
                <MenuItem value="">All genres</MenuItem>
                {statistics.availableFilters.genres.map((genre) => <MenuItem key={genre} value={genre}>{genre}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Platform" value={filters.platform ?? ""} onChange={(event) => setFilter("platform", event.target.value || undefined)}>
                <MenuItem value="">All platforms</MenuItem>
                {statistics.availableFilters.platforms.map((platform) => <MenuItem key={platform} value={platform}>{platform}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Status" value={filters.status ?? ""} onChange={(event) => setFilter("status", (event.target.value || undefined) as GameStatus | undefined)}>
                <MenuItem value="">All statuses</MenuItem>
                {statistics.availableFilters.statuses.map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Source" value={filters.source ?? ""} onChange={(event) => setFilter("source", (event.target.value || undefined) as GameActivitySource | undefined)}>
                <MenuItem value="">All sources</MenuItem>
                {statistics.availableFilters.sources.map((source) => <MenuItem key={source} value={source}>{source}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Favorite" value={filters.favorite === undefined ? "" : String(filters.favorite)} onChange={(event) => setFilter("favorite", event.target.value === "" ? undefined : event.target.value === "true")}>
                <MenuItem value="">All games</MenuItem><MenuItem value="true">Favorites</MenuItem><MenuItem value="false">Not favorites</MenuItem>
              </TextField>
            </Box>
            <Stack direction={{ xs: "column", md: "row" }} useFlexGap sx={{ alignItems: { md: "center" }, flexWrap: "wrap", gap: 1.25 }}>
              <Typography variant="body2" sx={{ mr: 0.5 }}>Analytics date window · max 366 local days</Typography>
              <TextField type="date" size="small" label="From" value={reportFrom} onChange={(event) => setReportFrom(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: { xs: "100%", sm: 170 } }} />
              <TextField type="date" size="small" label="To" value={reportTo} onChange={(event) => setReportTo(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: { xs: "100%", sm: 170 } }} />
              <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 0.5 }}>
                <Button size="small" onClick={() => applyPreset(30)}>30 days</Button>
                <Button size="small" onClick={() => applyPreset(90)}>90 days</Button>
                <Button size="small" onClick={() => applyPreset(365)}>365 days</Button>
              </Stack>
            </Stack>
            {dateRangeError && <Alert severity="warning">{dateRangeError} Choose an older window to inspect earlier dates.</Alert>}
          </Stack>
        </Paper>
      )}

      {loading && !statistics ? (
        <Paper sx={{ p: 5, display: "grid", placeItems: "center" }}>
          <CircularProgress aria-label="Loading statistics" />
          <Typography color="text.secondary" sx={{ mt: 2 }}>Building the activity report…</Typography>
        </Paper>
      ) : !statistics ? (
        <EmptyState title="Statistics could not be loaded" description="Refresh the report or try again in a moment." />
      ) : (
        <Stack spacing={4}>
          <Box component="section" aria-labelledby="coverage-title">
            <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", alignItems: { sm: "end" }, mb: 1.5, gap: 1 }}>
              <Box>
                <Typography id="coverage-title" variant="h5">Coverage</Typography>
                <Typography variant="body2" color="text.secondary">
                  Current library totals and retained Log counts are all-time. Activity metrics and period rows cover {statistics.fromDate} through {statistics.toDate} in {statistics.timeZone}.
                </Typography>
              </Box>
              <Chip size="small" label={`Calendar · ${statistics.timeZone}`} />
            </Stack>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", lg: "repeat(4,minmax(0,1fr))" }, gap: 1.5 }}>
              <Metric value={statistics.totalGames.toLocaleString()} label="Games in scope" />
              <Metric value={statistics.trackedGames.toLocaleString()} label="Games with playtime" />
              <Metric value={formatMinutes(statistics.totalMinutes).replace(/^\+/, "")} label="Current total playtime" />
              <Metric value={statistics.totalEvents.toLocaleString()} label="All-time Log records" />
              <Metric value={statistics.baselineRecords.toLocaleString()} label="Baseline snapshots (not play sessions)" />
              <Metric value={statistics.windowEvents.toLocaleString()} label="Activity events in range" />
              <Metric value={statistics.playDays.toLocaleString()} label="Days with playtime recorded" />
              <Metric value={statistics.activeDays.toLocaleString()} label="Days with any recorded activity" />
            </Box>
          </Box>

          <Box component="section" aria-label="Monthly analytics">
            <PeriodAnalysis title="Monthly data" rows={statistics.monthly} monthly={true} timeZone={statistics.timeZone} fromDate={statistics.fromDate} toDate={statistics.toDate} />
          </Box>
          <Box component="section" aria-label="Daily analytics">
            <PeriodAnalysis title="Daily data" rows={statistics.daily} monthly={false} timeZone={statistics.timeZone} fromDate={statistics.fromDate} toDate={statistics.toDate} />
          </Box>
          <Box component="section" aria-label="Play timing analysis">
            <WeekdayAnalysis statistics={statistics} />
          </Box>
          <Box component="section" aria-label="Genre analytics">
            <BreakdownAnalysis title="Genres" description="Current playtime is all-time; event coverage and active days are limited to the selected window." rows={statistics.genres} measure="minutes" measureLabel="Current playtime" />
          </Box>
          <Box component="section" aria-label="Game analytics">
            <GameAnalysis games={statistics.games} timeZone={statistics.timeZone} />
          </Box>
          <Box component="section" aria-label="Platform analytics">
            <BreakdownAnalysis title="Platforms" description="Current library playtime is all-time; event counts and active days cover the selected window." rows={statistics.platforms} measure="minutes" measureLabel="Current playtime" />
          </Box>
          <Box component="section" aria-label="Source analytics">
            <BreakdownAnalysis title="Sources" description="Current library playtime is all-time; event counts and active days cover the selected window." rows={statistics.sources} measure="minutes" measureLabel="Current playtime" />
          </Box>
          <Box component="section" aria-label="Status analytics">
            <BreakdownAnalysis title="Statuses" description="Current game counts and playtime are all-time. Events shown are status transitions into the current status during the selected window." rows={statistics.statuses} measure="games" measureLabel="Current games" eventColumnLabel="Status transitions into this status" dayColumnLabel="Transition days" />
          </Box>

          <Box component="section" aria-labelledby="log-title">
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", alignItems: { sm: "end" }, gap: 1 }}>
                <Box>
                  <Typography id="log-title" variant="h5">Log</Typography>
                  <Typography variant="body2" color="text.secondary">Every retained game event, including baseline snapshots, newest first. This section ignores the date window; expand a row for IDs, recording time, tags, genre and platform snapshots.</Typography>
                </Box>
                <Chip size="small" label={currentRange} />
              </Stack>
              {logError && <Alert severity="error">{logError}</Alert>}
              {logLoading && <LinearProgress aria-label="Loading activity log" />}
              {logPage && <ActivityLogTable items={logPage.items} timeZone={statistics.timeZone} />}
              {!logPage && logLoading && <Paper sx={{ p: 3, textAlign: "center" }}><CircularProgress size={24} aria-label="Loading activity log" /></Paper>}
              {!logPage && !logLoading && !logError && <Paper sx={{ p: 3 }}><Typography color="text.secondary">No log entries are available.</Typography></Paper>}
              <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="caption" color="text.secondary">Page {logCursors.length} · 50 events per page</Typography>
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" disabled={logCursors.length <= 1 || logLoading} onClick={onLogPrevious}>Previous</Button>
                  <Button variant="outlined" disabled={!logPage?.nextCursor || logLoading} onClick={onLogNext}>Next</Button>
                </Stack>
              </Stack>
            </Stack>
          </Box>

          <Box component="section" aria-labelledby="steam-data-title">
            <Typography id="steam-data-title" variant="h5" sx={{ mb: 1 }}>Steam integration data</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Provider account and cached profile metrics are kept separate from the game activity Log.</Typography>
            <SteamProfilePanel />
          </Box>
        </Stack>
      )}
    </>
  );
}
