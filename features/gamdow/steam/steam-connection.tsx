"use client";
import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { Button, Chip } from "@/components/ui";
import { ConfirmDialog } from "@/components/page-parts";
import { steamRepository } from "@/services/steam-repository";
import type { SteamConnection, SteamSyncResult } from "@/types/steam";
import { useLibrary } from "../library-context";
export function SteamConnectionPanel() {
  const { hasUnsavedChanges, runServerOperation, notify } = useLibrary();
  const [connection, setConnection] = useState<SteamConnection | null>(null);
  const [job, setJob] = useState<SteamSyncResult | undefined>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [callback, setCallback] = useState("");
  async function load() {
    setLoading(true);
    try {
      const c = await steamRepository.connection();
      setConnection(c);
      setJob(c.sync);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Connection could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    setCallback(new URLSearchParams(location.search).get("steam") || "");
  }, []);
  async function sync() {
    setError("");
    try {
      await runServerOperation(async (_revision, control) => {
        let current =
          job && ["pending", "running"].includes(job.status)
            ? job
            : await steamRepository.startSync();
        setJob(current);
        while (
          ["pending", "running"].includes(current.status) &&
          !control.cancelled()
        ) {
          control.report(
            `Syncing Steam library · ${current.processed} / ${current.total}`,
          );
          current = await steamRepository.continueSync(current.id);
          setJob(current);
          if (current.status !== "completed")
            await new Promise((resolve) => setTimeout(resolve, 600));
        }
        notify(
          current.status === "completed"
            ? "Steam library sync finished"
            : "Sync paused. You can resume it here.",
        );
      }, "Reading your Steam library…");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Steam sync failed. You can resume the saved job.",
      );
    } finally {
      await load();
    }
  }
  return (
    <Paper
      sx={{
        p: { xs: 2.5, md: 3 },
        my: 3,
        background:
          "radial-gradient(ellipse at top right,#71b8ff12,transparent 70%),#191e1c",
      }}
    >
      <Stack spacing={2}>
        <Stack
          direction="row"
          sx={{ alignItems: "center", justifyContent: "space-between" }}
        >
          <Box>
            <Typography variant="overline" color="primary.main">
              CONNECTED LIBRARY
            </Typography>
            <Typography variant="h5">Steam</Typography>
          </Box>
          <Chip
            label={connection?.connected ? "Connected" : "Not connected"}
            color={connection?.connected ? "primary" : "default"}
          />
        </Stack>
        <Typography color="text.secondary">
          Bring your Steam games, playtime and achievements into your archive.
          Your personal progress, reviews and notes remain yours.
        </Typography>
        {callback && (
          <Alert
            severity={callback === "connected" ? "success" : "warning"}
            onClose={() => setCallback("")}
          >
            {callback === "connected"
              ? "Steam account connected successfully."
              : callback === "already_connected"
                ? "This Steam account is already linked. Disconnect the existing connection first."
                : "Steam sign-in was cancelled, expired or could not be verified. Please try again."}
          </Alert>
        )}
        {error && (
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                onClick={() => {
                  setError("");
                  void load();
                }}
              >
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}
        {loading && (
          <CircularProgress size={22} aria-label="Loading Steam connection" />
        )}
        {connection && !connection.configured && (
          <Alert severity="info">
            Steam is not configured on this server yet. Your manual library
            remains available.
          </Alert>
        )}
        {connection?.connected ? (
          <>
            <Typography variant="body2">
              Steam ID · {connection.steamId}
            </Typography>
            {connection.lastLibrarySyncAt && (
              <Typography variant="caption" color="text.secondary">
                Last library sync ·{" "}
                {new Date(connection.lastLibrarySyncAt).toLocaleString()}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              Your Steam Profile and Game Details must be Public to read your
              library. Hidden playtime is shown as unavailable.
            </Typography>
            {job && (
              <Box role="status">
                <Stack
                  direction="row"
                  sx={{ justifyContent: "space-between", mb: 1 }}
                >
                  <Typography variant="body2">
                    {job.status === "completed"
                      ? "Sync complete"
                      : job.status === "cancelled"
                        ? "Sync cancelled"
                        : "Sync ready to resume"}
                  </Typography>
                  <Typography variant="body2">
                    {job.processed} / {job.total}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={job.total ? (job.processed / job.total) * 100 : 100}
                />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {job.added} added · {job.existing} already collected ·{" "}
                  {job.skipped} excluded · {job.failed} unavailable
                </Typography>
                {job.errors.map((e) => (
                  <Typography
                    key={e.steamAppId}
                    variant="caption"
                    sx={{ display: "block" }}
                    color="text.secondary"
                  >
                    App {e.steamAppId}: {e.message}
                  </Typography>
                ))}
              </Box>
            )}
            <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 1 }}>
              <Button
                variant="contained"
                disabled={
                  hasUnsavedChanges || loading || !connection.configured
                }
                onClick={sync}
              >
                {job && ["pending", "running"].includes(job.status)
                  ? "Resume sync"
                  : "Sync Steam library"}
              </Button>
              {job && ["pending", "running"].includes(job.status) && (
                <Button
                  onClick={async () => {
                    try {
                      await steamRepository.cancelSync(job.id);
                      await load();
                    } catch (e) {
                      setError(
                        e instanceof Error
                          ? e.message
                          : "Could not cancel sync.",
                      );
                    }
                  }}
                >
                  Cancel remaining sync
                </Button>
              )}
              <Button
                variant="outlined"
                disabled={hasUnsavedChanges || loading}
                onClick={() => setDisconnecting(true)}
              >
                Disconnect
              </Button>
            </Stack>
          </>
        ) : (
          <Button
            variant="contained"
            disabled={hasUnsavedChanges || loading || !connection?.configured}
            sx={{ alignSelf: "flex-start" }}
            onClick={async () => {
              setLoading(true);
              setError("");
              try {
                const { url } = await steamRepository.connect();
                window.location.assign(url);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Could not connect Steam.",
                );
                setLoading(false);
              }
            }}
          >
            Sign in through Steam
          </Button>
        )}
        {hasUnsavedChanges && (
          <Typography variant="caption" color="text.secondary">
            Waiting for your current edits to save…
          </Typography>
        )}
      </Stack>
      {disconnecting && (
        <ConfirmDialog
          title="Disconnect Steam?"
          description="Your gamdow games, reviews and notes stay. Steam account access, cached personal playtime and achievement data will be removed."
          onClose={() => setDisconnecting(false)}
          onConfirm={async () => {
            setDisconnecting(false);
            try {
              await steamRepository.disconnect();
              await load();
              notify("Steam disconnected");
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Could not disconnect Steam.",
              );
            }
          }}
        />
      )}
    </Paper>
  );
}
