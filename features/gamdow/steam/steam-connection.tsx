"use client";
import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { Button, Chip } from "@/components/ui";
import { ConfirmDialog } from "@/components/page-parts";
import { steamRepository } from "@/services/steam-repository";
import type { SteamConnection } from "@/types/steam";
import { useLibrary } from "../library-context";
import { SteamLibraryImport } from "./steam-library-import";
import { SteamSyncSummary } from "./steam-sync-result";
import { useSteamSync, pendingSteamJob } from "./use-steam-sync";
export function SteamConnectionPanel() {
  const { hasUnsavedChanges, notify } = useLibrary();
  const flow = useSteamSync();
  const { job, setJob } = flow;
  const [importOpen, setImportOpen] = useState(false);
  const [connection, setConnection] = useState<SteamConnection | null>(null);
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
    await flow.run();
    await load();
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
            {flow.error && (
              <Alert severity="error" onClose={() => flow.setError("")}>
                {flow.error} Saved progress can be resumed.
              </Alert>
            )}
            {job && <SteamSyncSummary job={job} busy={flow.busy} />}
            <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 1 }}>
              <Button
                variant="contained"
                disabled={
                  hasUnsavedChanges ||
                  loading ||
                  flow.busy ||
                  !connection.configured
                }
                onClick={() => setImportOpen(true)}
              >
                Browse / import Steam games
              </Button>
              <Button
                variant="outlined"
                disabled={
                  hasUnsavedChanges ||
                  loading ||
                  flow.busy ||
                  !connection.configured
                }
                onClick={sync}
              >
                {pendingSteamJob(job) ? "Resume sync" : "Sync imported games"}
              </Button>
              {pendingSteamJob(job) && (
                <Button disabled={flow.busy} onClick={flow.cancel}>
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
      {importOpen && (
        <SteamLibraryImport
          onClose={() => {
            setImportOpen(false);
            void load();
          }}
        />
      )}
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
