"use client";
import { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  CircularProgress,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { Button, Chip } from "@/components/ui";
import { apiRequest, ApiError } from "@/services/http-client";
import type { SteamProfileStats } from "@/types/steam";
export function SteamProfilePanel() {
  const [data, setData] = useState<SteamProfileStats>(),
    [offset, setOffset] = useState(0),
    [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    let active = true;
    setBusy(true);
    setError("");
    async function load() {
      try {
        const result = await apiRequest<SteamProfileStats>(
          `/api/steam/profile?offset=${offset}`,
          {
            signal: AbortSignal.any([abort.signal, AbortSignal.timeout(60000)]),
          },
        );
        if (active) setData(result);
      } catch (e) {
        if (active)
          setError(
            e instanceof ApiError && e.code === "STEAM_BUSY"
              ? "Steam is updating. This panel will reload when the update finishes."
              : e instanceof Error
                ? e.message
                : "Could not load Steam profile.",
          );
      } finally {
        if (active) setBusy(false);
      }
    }
    void load();
    return () => {
      active = false;
      abort.abort();
    };
  }, [offset, retry]);
  useEffect(() => {
    const update = () => setRetry((n) => n + 1);
    window.addEventListener("gamdow:steam-updated", update);
    return () => window.removeEventListener("gamdow:steam-updated", update);
  }, []);
  if (data && !data.connected) return null;
  return (
    <Paper sx={{ p: { xs: 2, md: 3 }, mb: 3, minWidth: 0 }}>
      <Stack spacing={2}>
        <Stack
          direction="row"
          useFlexGap
          sx={{ justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}
        >
          <Typography variant="h5">Steam player stats</Typography>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await apiRequest("/api/steam/activity", { method: "POST" });
                const result = await apiRequest<SteamProfileStats>(
                  `/api/steam/profile?offset=${offset}`,
                  { method: "POST", signal: AbortSignal.timeout(60000) },
                );
                setData(result);
                setError("");
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not refresh.");
              } finally {
                setBusy(false);
              }
            }}
          >
            Refresh stats
          </Button>
        </Stack>
        {busy && (
          <CircularProgress size={22} aria-label="Loading Steam stats" />
        )}
        {error && (
          <Alert
            severity="warning"
            action={
              <Button color="inherit" onClick={() => setRetry((n) => n + 1)}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}
        {data?.warning && <Alert severity="warning">{data.warning}</Alert>}
        {data?.profile && (
          <Stack
            direction="row"
            spacing={2}
            sx={{ minWidth: 0, alignItems: "center" }}
          >
            <Avatar
              src={data.profile.avatar}
              alt="Steam avatar"
              sx={{ width: 64, height: 64, flexShrink: 0 }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ overflowWrap: "anywhere" }}>
                {data.profile.name}
              </Typography>
              <Button
                component="a"
                href={data.profile.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
              >
                Open Steam profile
              </Button>
              <Stack
                direction="row"
                useFlexGap
                sx={{ flexWrap: "wrap", gap: 1 }}
              >
                {data.profile.level !== undefined && (
                  <Chip size="small" label={`Level ${data.profile.level}`} />
                )}
                {data.profile.xp !== undefined && (
                  <Chip
                    size="small"
                    label={`${data.profile.xp.toLocaleString()} XP`}
                  />
                )}
                {data.profile.badges !== undefined && (
                  <Chip size="small" label={`${data.profile.badges} badges`} />
                )}
              </Stack>
            </Box>
          </Stack>
        )}
        {data?.profile && !data.profile.public && (
          <Alert severity="info">
            This Steam profile is private. Game Details may also be private;
            some stats cannot be read.
          </Alert>
        )}
        {data && (
          <>
            <Typography>
              {data.playtimeKnown
                ? `${(data.totalMinutes / 60).toFixed(1)} hours across ${data.playtimeKnown} imported games`
                : "Steam playtime has not been synced yet."}
            </Typography>
            <Typography color="text.secondary">
              {data.unlockedAchievements} / {data.totalAchievements}{" "}
              achievements · known stats for {data.achievementsKnown} /{" "}
              {data.imported} imported games
            </Typography>
            <Typography variant="caption" color="text.secondary">
              These are cached game achievements, not Steam story progress or a
              profile-wide completion score. Use Sync imported games above to
              refresh all achievements.
            </Typography>
            {data.lastActivitySyncAt && (
              <Typography variant="caption">
                Playtime updated{" "}
                {new Date(data.lastActivitySyncAt).toLocaleString()}
              </Typography>
            )}
            {!data.imported && (
              <Alert severity="info">
                Import games from Steam to see per-game playtime and
                achievements here.
              </Alert>
            )}
            {data.items.map((game) => (
              <Box
                key={game.steamAppId}
                sx={{
                  p: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  minWidth: 0,
                }}
              >
                <Button
                  component="a"
                  href={`/?page=library&game=${encodeURIComponent(game.gameId)}`}
                  sx={{
                    textAlign: "left",
                    overflowWrap: "anywhere",
                    justifyContent: "flex-start",
                  }}
                >
                  {game.name}
                </Button>
                <Typography variant="body2">
                  {game.totalMinutes !== undefined
                    ? `${(game.totalMinutes / 60).toFixed(1)} h played`
                    : "Playtime unavailable"}
                </Typography>
                {game.total !== undefined ? (
                  <>
                    <Typography variant="caption">
                      Achievements · {game.unlocked} / {game.total}
                      {game.percentage !== undefined
                        ? ` · ${game.percentage}%`
                        : ""}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={game.percentage ?? 0}
                      sx={{ mt: 1 }}
                    />
                  </>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    {game.state === "private"
                      ? "Achievements private / inaccessible"
                      : game.state === "unsupported"
                        ? "No Steam achievements"
                        : game.state === "unavailable"
                          ? "Steam achievements currently unavailable"
                          : "Achievements not synced yet"}
                  </Typography>
                )}
              </Box>
            ))}
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Button
                disabled={busy || offset === 0}
                onClick={() => setOffset((n) => Math.max(0, n - 20))}
              >
                Previous
              </Button>
              <Button
                disabled={busy || !data.hasMore}
                onClick={() => setOffset((n) => n + 20)}
              >
                Next
              </Button>
            </Stack>
          </>
        )}
      </Stack>
    </Paper>
  );
}
