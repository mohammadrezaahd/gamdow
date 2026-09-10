"use client";
import { useEffect, useState } from "react";
import { Alert, Paper, Stack, Typography } from "@mui/material";
import { Button } from "@/components/ui";
import { ConfirmDialog } from "@/components/page-parts";
import { useLibrary } from "../library-context";
import { useStorage } from "./storage-context";
import { formatBytes } from "@/lib/storage";
import { apiRequest } from "@/services/http-client";
import {
  openBackup,
  exportZip,
  importZip,
  chooseBackupDestination,
  type OpenBackup,
} from "@/services/zip-backup";
export function BackupPanel() {
  const { data, runServerOperation, hasUnsavedChanges, notify } = useLibrary(),
    { refresh, usage } = useStorage();
  const [backup, setBackup] = useState<OpenBackup | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [activeId, setActiveId] = useState<string | null>(null);
  const checkActive = () =>
    apiRequest<{ activeId: string | null }>("/api/backups/import")
      .then((v) => setActiveId(v.activeId))
      .catch(() => {});
  useEffect(() => {
    void checkActive();
  }, []);
  const required = backup?.manifest.assets.reduce((n, a) => n + a.size, 0) ?? 0;
  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h5">Portable ZIP backup</Typography>
        <Typography color="text.secondary">
          Export your games, reviews, tags, collections and personal images
          together. Profile details, connected accounts, Steam identity, payment
          data and storage purchases are excluded. Official artwork stays as
          remote links unless you have saved a copy.
        </Typography>
        <Button
          variant="outlined"
          disabled={busy || hasUnsavedChanges}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const destination = await chooseBackupDestination();
              await runServerOperation(
                (_, control) => exportZip(control, destination),
                "Preparing ZIP backup…",
              );
              notify("ZIP backup exported");
            } catch (e) {
              if (!(e instanceof DOMException && e.name === "AbortError"))
                setError(e instanceof Error ? e.message : "Export failed.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Export ZIP with images
        </Button>
        <Button
          variant="outlined"
          component="label"
          disabled={busy || hasUnsavedChanges || !!activeId}
        >
          Import ZIP
          <input
            hidden
            type="file"
            accept=".zip,application/zip"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setError("");
              setBusy(true);
              try {
                setBackup(await openBackup(file, data));
              } catch (e) {
                setError(e instanceof Error ? e.message : "Invalid backup.");
              } finally {
                setBusy(false);
              }
            }}
          />
        </Button>
        {busy && <Typography role="status">Preparing backup…</Typography>}
        {hasUnsavedChanges && (
          <Alert severity="info">
            Wait for your changes to save before backing up or restoring.
          </Alert>
        )}
        {activeId && (
          <Alert
            severity="warning"
            action={
              <Button
                color="inherit"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await apiRequest(`/api/backups/${activeId}`, {
                      method: "DELETE",
                    });
                    await checkActive();
                    await refresh();
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "Cancellation failed.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Cancel import
              </Button>
            }
          >
            An unfinished import has reserved storage. Cancel it before starting
            another.
          </Alert>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        <Typography variant="caption" color="text.secondary">
          Restore replaces the current collection only after every image passes
          validation. Export first to keep both. Keep this tab open during
          transfer; cancelled or interrupted imports do not replace your
          collection.
        </Typography>
        {backup && (
          <ConfirmDialog
            title="Restore this ZIP backup?"
            description={`Replace your collection with ${backup.manifest.library.games.length} games and ${backup.manifest.library.gallery.length} gallery images? ${formatBytes(required)} of additional free space is needed during import${usage ? `; you have ${formatBytes(usage.availableBytes)}` : ""}. Your account and storage plan stay unchanged.`}
            onClose={() => {
              void backup.close();
              setBackup(null);
            }}
            onConfirm={async () => {
              const selected = backup;
              setBackup(null);
              setBusy(true);
              setError("");
              try {
                if (usage && required > usage.availableBytes)
                  throw new Error(
                    "Not enough storage. Delete files or buy a storage pack before importing.",
                  );
                await runServerOperation(
                  (revision, control) => importZip(selected, revision, control),
                  "Preparing ZIP import…",
                );
                notify("ZIP backup restored");
              } catch (e) {
                setError(e instanceof Error ? e.message : "Import failed.");
              } finally {
                await selected.close();
                await refresh();
                await checkActive();
                setBusy(false);
              }
            }}
          />
        )}
      </Stack>
    </Paper>
  );
}
