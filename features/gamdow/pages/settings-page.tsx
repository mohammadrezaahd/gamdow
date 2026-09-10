"use client";
import { StoragePanel } from "../storage/storage-panel";
import { BackupPanel } from "../storage/backup-panel";
import { Button, MenuItem, Switch, TextField } from "@/components/ui";
import { useState } from "react";
import { Box, FormControlLabel, Paper, Stack, Typography } from "@mui/material";
import { SectionTitle } from "@/components/page-parts";
import { TaxonomyManager } from "../components/taxonomy-manager";
import { useLibrary } from "../library-context";
export function SettingsPage({ onProfile }: { onProfile: () => void }) {
  const { data, savePreferences } = useLibrary();
  const [draft, setDraft] = useState(data.preferences);
  const [managing, setManaging] = useState(false);
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
      <StoragePanel />
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
        <BackupPanel />
      </Box>
    </>
  );
}
