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
import type { EpicConnection } from "@/types/epic";
import { epicRepository } from "@/services/epic-repository";
import { useLibrary } from "../library-context";
export function EpicConnectionPanel() {
  const { hasUnsavedChanges } = useLibrary();
  const [status, setStatus] = useState<EpicConnection>();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false),
    [retry, setRetry] = useState(0);
  const [callback, setCallback] = useState("");
  useEffect(() => {
    let active = true;
    setError("");
    setCallback(new URLSearchParams(location.search).get("epic") || "");
    epicRepository
      .status()
      .then((s) => {
        if (active) setStatus(s);
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "Could not load Epic connection.",
          );
      });
    return () => {
      active = false;
    };
  }, [retry]);
  return (
    <Paper sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
      <Stack spacing={2}>
        <Stack
          direction="row"
          useFlexGap
          sx={{ justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}
        >
          <Box>
            <Typography variant="overline" color="primary.main">
              EPIC GAMES
            </Typography>
            <Typography variant="h5">
              Another part of your collection
            </Typography>
          </Box>
          <Chip
            label={status?.connected ? "Account connected" : "Not connected"}
          />
        </Stack>
        {!status && !error && (
          <CircularProgress size={24} aria-label="Loading Epic connection" />
        )}
        {error && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" onClick={() => setRetry((v) => v + 1)}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}
        {callback && (
          <Alert
            severity={callback === "connected" ? "success" : "warning"}
            onClose={() => setCallback("")}
          >
            {callback === "connected"
              ? "Epic account connected."
              : callback === "already_connected"
                ? "That Epic account is already connected to another gamdow account."
                : "Epic connection was cancelled or could not be verified. Please try again."}
          </Alert>
        )}
        {status?.connected && (
          <Typography sx={{ overflowWrap: "anywhere" }}>
            {status.displayName} · {status.accountId}
          </Typography>
        )}
        <Typography color="text.secondary">
          Connect your Epic identity to your gamdow profile. Automatic Epic
          library import, playtime and achievement sync are not available in
          gamdow yet. You can still add Epic games manually and record your
          time, reviews and progress.
        </Typography>
        {status && !status.configured && (
          <Alert severity="info">
            Epic account connection has not been enabled for this site yet.
          </Alert>
        )}
        <Box>
          <Button
            variant="outlined"
            disabled={
              !status ||
              busy ||
              hasUnsavedChanges ||
              (!status.connected && !status.configured)
            }
            onClick={async () => {
              if (status?.connected) {
                setConfirm(true);
                return;
              }
              setBusy(true);
              setError("");
              try {
                const { url } = await epicRepository.connect();
                window.location.assign(url);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Could not connect Epic.",
                );
                setBusy(false);
              }
            }}
          >
            {busy
              ? "Please wait…"
              : status?.connected
                ? "Disconnect Epic"
                : "Connect Epic Games"}
          </Button>
        </Box>
      </Stack>
      {confirm && (
        <ConfirmDialog
          title="Disconnect Epic?"
          description="Your games and personal history stay in gamdow. To also revoke gamdow’s permission at Epic, use Apps and Accounts in your Epic account settings."
          onClose={() => setConfirm(false)}
          onConfirm={async () => {
            setConfirm(false);
            setBusy(true);
            setError("");
            try {
              await epicRepository.disconnect();
              setStatus(await epicRepository.status());
              setCallback("");
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Could not disconnect Epic.",
              );
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </Paper>
  );
}
