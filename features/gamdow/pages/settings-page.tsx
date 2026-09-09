"use client";
import { Button, MenuItem, Switch, TextField } from "@/components/ui";
import { useState } from "react";
import {
  Alert,
  Box,
  FormControlLabel,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { ConfirmDialog, SectionTitle } from "@/components/page-parts";
import { TaxonomyManager } from "../components/taxonomy-manager";
import { useLibrary } from "../library-context";
import { parseLibrary } from "@/services/library-repository";
import type { LibrarySnapshot } from "@/types/game";
export function SettingsPage({ onProfile }: { onProfile: () => void }) {
  const { data, savePreferences, replace } = useLibrary();
  const [draft, setDraft] = useState(data.preferences);
  const [restore, setRestore] = useState<LibrarySnapshot | null>(null);
  const [error, setError] = useState("");
  const [managing, setManaging] = useState(false);
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `gamdow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <>
      <SectionTitle
        title="Settings"
        eyebrow="MAKE YOURSELF AT HOME"
        action={
          <Button variant="outlined" onClick={() => setManaging(true)}>
            Manage genres & series
          </Button>
        }
      />
      {managing && <TaxonomyManager onClose={() => setManaging(false)} />}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { lg: "minmax(0,1.2fr) minmax(0,1fr)" },
          gap: 3,
        }}
      >
        <Paper
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.displayName.trim()) return;
            savePreferences({
              ...draft,
              displayName: draft.displayName.trim(),
            });
          }}
          sx={{ p: 3 }}
        >
          <Stack spacing={3}>
            <Typography variant="h5">Preferences</Typography>
            <Button variant="outlined" onClick={onProfile}>
              View & edit profile
            </Button>
            <TextField
              select
              label="Default library view"
              value={draft.defaultLibraryView}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  defaultLibraryView: e.target.value as "grid" | "list",
                })
              }
            >
              <MenuItem value="grid">Grid</MenuItem>
              <MenuItem value="list">List</MenuItem>
            </TextField>
            <FormControlLabel
              label="Hide spoiler reviews and screenshots"
              control={
                <Switch
                  checked={draft.hideSpoilers}
                  onChange={(_, v) => setDraft({ ...draft, hideSpoilers: v })}
                />
              }
            />
            <Box>
              <Button type="submit" variant="contained">
                Save preferences
              </Button>
            </Box>
          </Stack>
        </Paper>
        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h5">Your data</Typography>
            <Typography color="text.secondary">
              Your library is saved to your account. Export a metadata backup to
              keep a copy. Image files stay in storage and are referenced by
              this backup.
            </Typography>
            <Button variant="outlined" onClick={download}>
              Export backup
            </Button>
            <Button variant="outlined" component="label">
              Import backup
              <input
                hidden
                type="file"
                accept="application/json,.json"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  setError("");
                  try {
                    if (file.size > 3 * 1024 * 1024)
                      throw new Error("Choose a backup smaller than 3 MB.");
                    setRestore(parseLibrary(JSON.parse(await file.text())));
                  } catch (error) {
                    setError(
                      error instanceof Error
                        ? error.message
                        : "Could not open backup.",
                    );
                  }
                }}
              />
            </Button>
            {error && <Alert severity="error">{error}</Alert>}
            <Typography variant="caption" color="text.secondary">
              Restore replaces the current library after you confirm. Export
              first if you want to keep both.
            </Typography>
          </Stack>
        </Paper>
      </Box>
      {restore && (
        <ConfirmDialog
          title="Restore this backup?"
          description={`Replace the current library with ${restore.games.length} games, ${restore.collections.length} collections and ${restore.gallery.length} screenshots?`}
          onClose={() => setRestore(null)}
          onConfirm={() => {
            replace(restore);
            setDraft(restore.preferences);
            setRestore(null);
          }}
        />
      )}
    </>
  );
}
