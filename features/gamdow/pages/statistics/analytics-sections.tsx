"use client";

import { useState } from "react";
import {
  Box,
  Chip,
  Collapse,
  IconButton,
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
import { ExpandMoreRounded } from "@mui/icons-material";
import type {
  ActivityBreakdown,
  ActivityFeedItem,
  ActivityGameSummary,
  ActivityPeriodSummary,
  ActivityStatistics,
} from "@/types/game-activity";

const formatMinutes = (minutes: number, signed = true) => {
  const absolute = Math.abs(Math.round(minutes));
  const hours = Math.floor(absolute / 60);
  const rest = absolute % 60;
  const value = [hours ? `${hours}h` : "", rest ? `${rest}m` : ""]
    .filter(Boolean)
    .join(" ");
  const sign = signed && minutes < 0 ? "−" : signed && minutes > 0 ? "+" : "";
  return `${sign}${value || "0m"}`;
};

const formatProgress = (value: number, signed = true) => {
  const rounded = Math.round(Math.abs(value) * 10) / 10;
  const sign = signed && value < 0 ? "−" : signed && value > 0 ? "+" : "";
  return `${sign}${rounded} pts`;
};

function localDate(period: string) {
  const [year, month, day = "1"] = period.split("-");
  return new Date(Number(year), Number(month) - 1, Number(day), 12);
}

function formatPeriod(period: string, monthly: boolean) {
  return new Intl.DateTimeFormat(
    "en-US",
    monthly ? { month: "long", year: "numeric" } : { dateStyle: "medium" },
  ).format(localDate(period));
}

function formatTimestamp(value: string, timeZone?: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(value));
}

function TableFrame({ children, minWidth = 760 }: { children: React.ReactNode; minWidth?: number }) {
  return (
    <TableContainer
      component={Paper}
      variant="outlined"
      sx={{ maxHeight: 470, minWidth: 0, overflowX: "auto" }}
    >
      <Table size="small" stickyHeader sx={{ minWidth }}>
        {children}
      </Table>
    </TableContainer>
  );
}

function BarChart({
  title,
  rows,
  value,
  formatValue,
  color = "primary.main",
  limit = 16,
}: {
  title: string;
  rows: { key: string; label: string; value: number }[];
  value: string;
  formatValue: (amount: number) => string;
  color?: string;
  limit?: number;
}) {
  const visible = rows.slice(0, limit);
  const max = Math.max(1, ...visible.map((row) => Math.abs(row.value)));
  return (
    <Paper component="figure" sx={{ p: { xs: 2, md: 2.5 }, m: 0, minWidth: 0 }}>
      <Typography variant="h6" component="figcaption">{title}</Typography>
      <Typography variant="caption" color="text.secondary">{value}{rows.length > limit ? ` · Top ${limit} shown; table includes all ${rows.length}` : ""}</Typography>
      {visible.length ? (
        <Stack spacing={1.25} sx={{ mt: 2 }} role="img" aria-label={title}>
          {visible.map((row) => (
            <Box key={row.key} sx={{ minWidth: 0 }} title={`${row.label}: ${formatValue(row.value)}`}>
              <Stack direction="row" sx={{ justifyContent: "space-between", gap: 1, mb: 0.5 }}>
                <Typography variant="body2" noWrap sx={{ minWidth: 0, flex: 1 }}>{row.label}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>{formatValue(row.value)}</Typography>
              </Stack>
              <Box sx={{ height: 6, borderRadius: 99, bgcolor: "action.hover", overflow: "hidden" }}>
                <Box sx={{ width: `${row.value ? Math.max(1.5, (Math.abs(row.value) / max) * 100) : 0}%`, height: "100%", bgcolor: color, borderRadius: 99 }} />
              </Box>
            </Box>
          ))}
        </Stack>
      ) : <Typography color="text.secondary" sx={{ mt: 2 }}>No data recorded.</Typography>}
    </Paper>
  );
}

function PeriodChart({
  rows,
  monthly,
  valueKey,
  title,
  color,
}: {
  rows: ActivityPeriodSummary[];
  monthly: boolean;
  valueKey: "minutesGained" | "progressChanged";
  title: string;
  color: string;
}) {
  const chronological = [...rows].reverse();
  const max = Math.max(1, ...chronological.map((row) => Math.abs(row[valueKey])));
  const labelEvery = Math.max(1, Math.ceil(chronological.length / 12));
  return (
    <Paper component="figure" sx={{ p: { xs: 2, md: 2.5 }, m: 0, minWidth: 0 }}>
      <Typography variant="h6" component="figcaption">{title}</Typography>
      <Typography variant="caption" color="text.secondary">
        {valueKey === "minutesGained" ? "Playtime added · net corrections are shown in the table" : "Net progress change · decreases extend below the zero line"}
      </Typography>
      {chronological.length ? (
        <Box sx={{ mt: 2, overflowX: "auto", pb: 1 }}>
          <Stack direction="row" spacing={0} sx={{ width: "100%", minWidth: 360, height: 172, alignItems: "flex-end", px: 0.5 }}>
            {chronological.map((row, index) => {
              const amount = row[valueKey];
              const height = amount ? Math.max(4, (Math.abs(amount) / max) * 54) : 0;
              return (
                <Box key={row.period} title={`${formatPeriod(row.period, monthly)} · ${valueKey === "minutesGained" ? formatMinutes(amount, false) : formatProgress(amount)}`} sx={{ flex: "1 1 0", minWidth: 0, textAlign: "center" }}>
                  <Box sx={{ height: 120, position: "relative" }}>
                    <Box sx={{ position: "absolute", left: 0, right: 0, top: "50%", borderTop: 1, borderColor: "divider" }} />
                    {amount !== 0 && <Box sx={{ position: "absolute", left: "50%", transform: "translateX(-50%)", width: "min(22px,72%)", minWidth: 1, height, ...(amount > 0 ? { bottom: "50%", borderRadius: "4px 4px 1px 1px" } : { top: "50%", borderRadius: "1px 1px 4px 4px" }), bgcolor: color, opacity: 0.92 }} />}
                  </Box>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", mt: 1, fontSize: 10 }}>
                    {index % labelEvery === 0 || index === chronological.length - 1 ? formatPeriod(row.period, monthly) : "\u00a0"}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        </Box>
      ) : <Typography color="text.secondary" sx={{ py: 3 }}>No recorded activity in this period.</Typography>}
    </Paper>
  );
}

function PeriodTable({ rows, monthly, timeZone }: { rows: ActivityPeriodSummary[]; monthly: boolean; timeZone: string }) {
  return (
    <TableFrame minWidth={1120}>
      <TableHead><TableRow>
        <TableCell>{monthly ? "Month" : "Local date"}</TableCell>
        <TableCell align="right">Playtime +</TableCell>
        <TableCell align="right">Playtime net</TableCell>
        <TableCell align="right">Progress +</TableCell>
        <TableCell align="right">Progress net</TableCell>
        <TableCell align="right">Active games</TableCell>
        <TableCell align="right">Status changes</TableCell>
        <TableCell align="right">Playtime records</TableCell>
        <TableCell align="right">Progress records</TableCell>
        <TableCell align="right">Started</TableCell>
        <TableCell align="right">Completed</TableCell>
        <TableCell align="right">Events</TableCell>
      </TableRow></TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.period} hover>
            <TableCell sx={{ whiteSpace: "nowrap", fontWeight: 700 }}>{formatPeriod(row.period, monthly)}<Typography component="span" variant="caption" color="text.secondary">{` · ${timeZone}`}</Typography></TableCell>
            <TableCell align="right">{formatMinutes(row.minutesGained, false)}</TableCell>
            <TableCell align="right">{formatMinutes(row.minutesChanged)}</TableCell>
            <TableCell align="right">{formatProgress(row.progressGained, false)}</TableCell>
            <TableCell align="right">{formatProgress(row.progressChanged)}</TableCell>
            <TableCell align="right">{row.activeGames}</TableCell>
            <TableCell align="right">{row.statusChanges}</TableCell>
            <TableCell align="right">{row.playtimeUpdates}</TableCell>
            <TableCell align="right">{row.progressUpdates}</TableCell>
            <TableCell align="right">{row.started}</TableCell>
            <TableCell align="right">{row.completed}</TableCell>
            <TableCell align="right">{row.eventCount}</TableCell>
          </TableRow>
        ))}
        {!rows.length && <TableRow><TableCell colSpan={12} align="center">No records.</TableCell></TableRow>}
      </TableBody>
    </TableFrame>
  );
}

export function PeriodAnalysis({
  title,
  rows,
  monthly,
  timeZone,
  fromDate,
  toDate,
}: {
  title: string;
  rows: ActivityPeriodSummary[];
  monthly: boolean;
  timeZone: string;
  fromDate: string;
  toDate: string;
}) {
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", alignItems: { sm: "end" }, gap: 1 }}>
        <Box>
          <Typography variant="h5">{title}</Typography>
          <Typography variant="body2" color="text.secondary">Local calendar periods from {fromDate} to {toDate} in {timeZone}. Playtime totals are grouped by when changes were recorded or synced, not by individual session time; the table includes every recorded period in this window.</Typography>
        </Box>
        <Chip size="small" label={`${rows.length} ${monthly ? "months" : "calendar days"}`} />
      </Stack>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" }, gap: 2 }}>
        <PeriodChart rows={rows} monthly={monthly} valueKey="minutesGained" title="Playtime recorded" color="primary.main" />
        <PeriodChart rows={rows} monthly={monthly} valueKey="progressChanged" title="Story progress recorded" color="secondary.main" />
      </Box>
      <PeriodTable rows={rows} monthly={monthly} timeZone={timeZone} />
    </Stack>
  );
}

export function WeekdayAnalysis({ statistics }: { statistics: ActivityStatistics }) {
  const rows = statistics.weekdays.map((row) => ({ key: String(row.weekday), label: row.label, value: row.minutes }));
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5">Weekday rhythm</Typography>
        <Typography variant="body2" color="text.secondary">Weekday pattern for when playtime changes were recorded or synced in {statistics.timeZone}, within the selected date window. This is not a session-by-session play schedule.</Typography>
      </Box>
      <Paper component="figure" sx={{ p: { xs: 2, md: 2.5 }, m: 0 }}>
        <Typography variant="h6" component="figcaption">Playtime additions by weekday</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: { xs: 0.5, sm: 1.5 }, alignItems: "end", mt: 2 }}>
          {statistics.weekdays.map((row) => (
            <Box key={row.weekday} title={`${row.label}: ${formatMinutes(row.minutes, false)}`} sx={{ minWidth: 0, textAlign: "center" }}>
              <Box sx={{ height: 128, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                <Box sx={{ width: "min(38px,72%)", height: row.minutes ? `${Math.max(4, (row.minutes / max) * 100)}%` : 2, bgcolor: "primary.main", borderRadius: "5px 5px 1px 1px", opacity: row.minutes ? 0.9 : 0.24 }} />
              </Box>
              <Typography variant="caption" color="text.secondary">{row.label}</Typography>
            </Box>
          ))}
        </Box>
      </Paper>
      <TableFrame minWidth={660}>
        <TableHead><TableRow><TableCell>Weekday</TableCell><TableCell align="right">Playtime added</TableCell><TableCell align="right">Net change</TableCell><TableCell align="right">Playtime events</TableCell><TableCell align="right">Active dates</TableCell></TableRow></TableHead>
        <TableBody>{statistics.weekdays.map((row) => <TableRow hover key={row.weekday}><TableCell>{row.label}</TableCell><TableCell align="right">{formatMinutes(row.minutes, false)}</TableCell><TableCell align="right">{formatMinutes(row.minutesChanged)}</TableCell><TableCell align="right">{row.events}</TableCell><TableCell align="right">{row.activeDays}</TableCell></TableRow>)}</TableBody>
      </TableFrame>
    </Stack>
  );
}

export function BreakdownAnalysis({
  title,
  description,
  rows,
  measure,
  measureLabel,
  eventColumnLabel = "Events in range",
  dayColumnLabel = "Active days in range",
}: {
  title: string;
  description: string;
  rows: ActivityBreakdown[];
  measure: "minutes" | "games";
  measureLabel: string;
  eventColumnLabel?: string;
  dayColumnLabel?: string;
}) {
  const chartRows = rows.map((row) => ({ key: row.key, label: row.label, value: row[measure] }));
  const categoryLabel = title === "Genres" ? "Genre"
    : title === "Platforms" ? "Platform"
      : title === "Sources" ? "Source"
        : title === "Statuses" ? "Status"
          : title;
  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5">{title}</Typography>
        <Typography variant="body2" color="text.secondary">{description}</Typography>
      </Box>
      <BarChart title={`${title} · ${measureLabel}`} rows={chartRows} value={measureLabel} formatValue={measure === "minutes" ? (value) => formatMinutes(value, false) : (value) => String(value)} />
      <TableFrame minWidth={720}>
        <TableHead><TableRow><TableCell>{categoryLabel}</TableCell><TableCell align="right">Playtime total · all-time</TableCell><TableCell align="right">Games</TableCell><TableCell align="right">{eventColumnLabel}</TableCell><TableCell align="right">{dayColumnLabel}</TableCell></TableRow></TableHead>
        <TableBody>
          {rows.map((row) => <TableRow hover key={row.key}><TableCell sx={{ fontWeight: 600 }}>{row.label}</TableCell><TableCell align="right">{formatMinutes(row.minutes, false)}</TableCell><TableCell align="right">{row.games}</TableCell><TableCell align="right">{row.events}</TableCell><TableCell align="right">{row.activeDays}</TableCell></TableRow>)}
          {!rows.length && <TableRow><TableCell colSpan={5} align="center">No records.</TableCell></TableRow>}
        </TableBody>
      </TableFrame>
      {title === "Genres" && <Typography variant="caption" color="text.secondary">A game assigned to multiple genres contributes its full current playtime to each genre.</Typography>}
    </Stack>
  );
}

export function GameAnalysis({ games, timeZone }: { games: ActivityGameSummary[]; timeZone: string }) {
  const chartRows = games.map((game) => ({ key: game.gameId, label: game.title, value: game.totalMinutes }));
  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5">Games</Typography>
        <Typography variant="body2" color="text.secondary">Current library totals are all-time; event metrics cover the selected date window. Steam last-played dates are provider-reported and shown separately from when Gamdow observed a playtime change. Steam does not expose a full session-by-session history. The chart highlights the top 12; the table includes every game.</Typography>
      </Box>
      <BarChart title="Top games by current playtime" rows={chartRows} value="Current playtime" formatValue={(value) => formatMinutes(value, false)} limit={12} />
      <TableFrame minWidth={1180}>
        <TableHead><TableRow>
          <TableCell>Game</TableCell><TableCell>Status</TableCell><TableCell>Source</TableCell>
          <TableCell align="right">Current playtime</TableCell><TableCell align="right">Activity events</TableCell>
          <TableCell align="right">Status changes</TableCell><TableCell align="right">Playtime records</TableCell>
          <TableCell align="right">Progress records</TableCell><TableCell align="right">Net progress</TableCell>
          <TableCell align="right">Active days in range</TableCell><TableCell>First event in range</TableCell><TableCell>Last event in range</TableCell><TableCell>Steam last played</TableCell>
        </TableRow></TableHead>
        <TableBody>
          {games.map((game) => <TableRow hover key={game.gameId}>
            <TableCell sx={{ minWidth: 180, fontWeight: 600 }}>{game.title}</TableCell><TableCell>{game.status}</TableCell><TableCell>{game.source}</TableCell>
            <TableCell align="right">{formatMinutes(game.totalMinutes, false)}</TableCell><TableCell align="right">{game.eventCount}</TableCell>
            <TableCell align="right">{game.statusChanges}</TableCell><TableCell align="right">{game.playtimeUpdates}</TableCell>
            <TableCell align="right">{game.progressUpdates}</TableCell><TableCell align="right">{formatProgress(game.progressChanged)}</TableCell>
            <TableCell align="right">{game.activeDays}</TableCell>
            <TableCell sx={{ whiteSpace: "nowrap" }}>{game.firstActivityAt ? formatTimestamp(game.firstActivityAt, timeZone) : "—"}</TableCell>
            <TableCell sx={{ whiteSpace: "nowrap" }}>{game.lastActivityAt ? formatTimestamp(game.lastActivityAt, timeZone) : "—"}</TableCell>
            <TableCell sx={{ whiteSpace: "nowrap" }}>{game.steamLastPlayedAt ? formatTimestamp(game.steamLastPlayedAt, timeZone) : "—"}</TableCell>
          </TableRow>)}
          {!games.length && <TableRow><TableCell colSpan={13} align="center">No games match these filters.</TableCell></TableRow>}
        </TableBody>
      </TableFrame>
    </Stack>
  );
}

function eventLabel(type: string) {
  return type.replaceAll("_", " ").toLocaleLowerCase();
}

function eventPlaytime(event: ActivityFeedItem) {
  if (event.previousMinutes === undefined && event.totalMinutes === undefined && event.deltaMinutes === undefined) return "—";
  if (event.previousMinutes === undefined && event.totalMinutes === undefined)
    return event.deltaMinutes === undefined ? "—" : `Δ ${formatMinutes(event.deltaMinutes)}`;
  const before = event.previousMinutes === undefined ? "—" : formatMinutes(event.previousMinutes, false);
  const after = event.totalMinutes === undefined ? "—" : formatMinutes(event.totalMinutes, false);
  return `${before} → ${after}${event.deltaMinutes === undefined ? "" : ` (${formatMinutes(event.deltaMinutes)})`}`;
}

function eventProgress(event: ActivityFeedItem) {
  if (event.previousProgress === undefined && event.progress === undefined && event.deltaProgress === undefined) return "—";
  const before = event.previousProgress === undefined ? "—" : `${event.previousProgress}%`;
  const after = event.progress === undefined ? "—" : `${event.progress}%`;
  return `${before} → ${after}${event.deltaProgress === undefined ? "" : ` (${formatProgress(event.deltaProgress)})`}`;
}

export function ActivityLogTable({
  items,
  timeZone,
}: {
  items: ActivityFeedItem[];
  timeZone: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <TableFrame minWidth={1280}>
      <TableHead><TableRow>
        <TableCell>Occurred (local)</TableCell><TableCell>Game</TableCell><TableCell>Event</TableCell>
        <TableCell>Source</TableCell><TableCell>Status transition</TableCell><TableCell>Playtime</TableCell>
        <TableCell>Story progress</TableCell><TableCell>Notes / metadata</TableCell><TableCell>More</TableCell>
      </TableRow></TableHead>
      <TableBody>
        {items.map((event) => (
          <LogRow key={event.id} event={event} timeZone={timeZone} expanded={expanded === event.id} onToggle={() => setExpanded(expanded === event.id ? null : event.id)} />
        ))}
        {!items.length && <TableRow><TableCell colSpan={9} align="center">No log entries match these filters.</TableCell></TableRow>}
      </TableBody>
    </TableFrame>
  );
}

function LogRow({
  event,
  timeZone,
  expanded,
  onToggle,
}: {
  event: ActivityFeedItem;
  timeZone: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const status = event.fromStatus || event.toStatus
    ? `${event.fromStatus ?? "—"} → ${event.toStatus ?? "—"}`
    : "—";
  return <>
    <TableRow hover>
      <TableCell sx={{ whiteSpace: "nowrap" }} title={`Recorded ${formatTimestamp(event.recordedAt, timeZone)}`}>{formatTimestamp(event.occurredAt, timeZone)}</TableCell>
      <TableCell sx={{ minWidth: 160, fontWeight: 600 }}>{event.gameTitle}</TableCell>
      <TableCell sx={{ textTransform: "capitalize", minWidth: 140 }}>{eventLabel(event.type)}</TableCell>
      <TableCell>{event.source}</TableCell><TableCell sx={{ minWidth: 170 }}>{status}</TableCell>
      <TableCell sx={{ minWidth: 170, whiteSpace: "nowrap" }}>{eventPlaytime(event)}</TableCell>
      <TableCell sx={{ minWidth: 160, whiteSpace: "nowrap" }}>{eventProgress(event)}</TableCell>
      <TableCell sx={{ maxWidth: 280, whiteSpace: "normal", overflowWrap: "anywhere" }}>{event.note || (event.inferred ? "Inferred provider activity" : "—")}</TableCell>
      <TableCell><IconButton size="small" aria-label={expanded ? "Hide event details" : "Show event details"} aria-expanded={expanded} onClick={onToggle}><ExpandMoreRounded sx={{ transform: expanded ? "rotate(180deg)" : undefined, transition: "transform .16s" }} /></IconButton></TableCell>
    </TableRow>
    <TableRow>
      <TableCell colSpan={9} sx={{ p: 0, borderBottom: expanded ? undefined : 0 }}>
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box sx={{ px: 2, py: 1.5, bgcolor: "action.hover" }}>
            <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 1 }}>
              <Chip size="small" label={`Event ID · ${event.id}`} />
              <Chip size="small" label={`Game ID · ${event.gameId}`} />
              <Chip size="small" label={`Recorded · ${formatTimestamp(event.recordedAt, timeZone)}`} />
              {event.platform && <Chip size="small" label={`Platform · ${event.platform}`} />}
              {event.genres?.map((genre) => <Chip key={genre} size="small" label={`Genre · ${genre}`} />)}
              {event.tags?.map((tag) => <Chip key={tag} size="small" label={`Tag · ${tag}`} />)}
              {event.inferred && <Chip size="small" color="warning" label="Inferred" />}
            </Stack>
          </Box>
        </Collapse>
      </TableCell>
    </TableRow>
  </>;
}
