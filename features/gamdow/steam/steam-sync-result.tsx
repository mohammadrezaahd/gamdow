"use client";
import { Alert, Box, LinearProgress, Stack, Typography } from "@mui/material";
import type { SteamSyncResult } from "@/types/steam";
import { pendingSteamJob } from "./use-steam-sync";
export function SteamSyncSummary({
  job,
  busy = false,
}: {
  job: SteamSyncResult;
  busy?: boolean;
}) {
  const stats = job.phase === "achievements";
  const processed = stats ? (job.achievementProcessed ?? 0) : job.processed;
  const total = stats ? (job.achievementTotal ?? 0) : job.total;
  const active = pendingSteamJob(job);
  const title =
    job.status === "cancelled"
      ? "Cancelled · imported games kept"
      : active
        ? busy
          ? "Syncing"
          : "Paused · ready to resume"
        : job.outcome === "partial_success"
          ? "Partial success"
          : job.outcome === "failed"
            ? "Failed"
            : "Success";
  return (
    <Box role="status" aria-live="polite">
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", gap: 2, mb: 1 }}
      >
        <Typography variant="subtitle2">{title}</Typography>
        <Typography variant="caption">
          {stats ? "Achievements" : "Games"} · {processed} / {total}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={total ? Math.min(100, (processed / total) * 100) : 100}
      />
      <Typography variant="body2" sx={{ mt: 1 }}>
        {job.added} imported · {job.existing} already in collection ·{" "}
        {job.failed} failed · {job.skipped} excluded / removed
      </Typography>
      {!!job.achievementTotal && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Achievements: {job.achievementSynced ?? 0} updated ·{" "}
          {job.achievementUnsupported ?? 0} unsupported ·{" "}
          {job.achievementUnavailable ?? 0} private / unavailable
        </Typography>
      )}
      {job.completedAt && (
        <Typography variant="caption" color="text.secondary">
          {new Date(job.completedAt).toLocaleString()}
        </Typography>
      )}
      {!!job.errors.length && (
        <Box component="details" sx={{ mt: 1 }}>
          <Box component="summary" sx={{ cursor: "pointer" }}>
            View issues ({job.errors.length}
            {job.errors.length === 50 ? "+" : ""})
          </Box>
          <Alert severity="warning" sx={{ mt: 1 }}>
            Successful imports are saved. Retry failed games from the preview,
            or sync again later for unavailable stats.
          </Alert>
          {job.errors.map((e, i) => (
            <Typography
              key={`${e.steamAppId}:${i}`}
              variant="caption"
              sx={{ display: "block", mt: 0.5 }}
            >
              App {e.steamAppId} · {e.stage || "library"}: {e.message}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
}
