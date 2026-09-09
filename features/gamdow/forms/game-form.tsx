"use client";
import { SteamLibraryImport } from "../steam/steam-library-import";
import { SteamPicker } from "../steam/steam-picker";
import { GameImage } from "@/components/game-image";
import { TagField } from "@/components/ui/tag-field";
import { normalizeTags } from "@/lib/tags";
import { DateField } from "@/components/ui";
import { ImageUpload } from "@/components/ui";
import { imagePresets } from "@/lib/image";

import {
  Autocomplete,
  Button,
  Dialog,
  MenuItem,
  Switch,
  TextField,
} from "@/components/ui";
import { useState } from "react";
import {
  Alert,
  Box,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Typography,
} from "@mui/material";
import type { Game, GameInput } from "@/types/game";
import { plans, statuses } from "@/services/library-repository";
import { newId, useLibrary } from "../library-context";
const empty: GameInput = {
  title: "",
  tags: [],
  genres: [],
  platform: "PC",
  status: "Not started",
  plan: "None",
  favorite: false,
  description: "",
  coverImage: "",
  journalEntries: [],
  edition: "Main game",
};
export function GameForm({
  game,
  onClose,
}: {
  game?: Game;
  onClose: () => void;
}) {
  const { data, saveGame, saveCollection } = useLibrary();
  const [mode, setMode] = useState<"steam" | "manual" | "import">(
    game ? "manual" : "steam",
  );
  const [draft, setDraft] = useState<GameInput>(game ?? empty);
  const [collectionIds, setCollectionIds] = useState(
    data.collections
      .filter((c) => game && c.gameIds.includes(game.id))
      .map((c) => c.id),
  );
  const [error, setError] = useState("");
  const field = <K extends keyof GameInput>(key: K, value: GameInput[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.title.trim()) return setError("A game title is required.");
    if (
      draft.startedAt &&
      draft.completedAt &&
      draft.completedAt < draft.startedAt
    )
      return setError("Finish date must be on or after the start date.");
    const id = game?.id ?? newId();
    saveGame({
      ...draft,
      id,
      title: draft.title.trim(),
      genres: draft.genres.map((g) => g.trim()).filter(Boolean),
      updatedAt: new Date().toISOString(),
    });
    data.collections.forEach((c) => {
      const included = collectionIds.includes(c.id);
      if (included !== c.gameIds.includes(id))
        saveCollection({
          ...c,
          gameIds: included
            ? [...c.gameIds, id]
            : c.gameIds.filter((g) => g !== id),
        });
    });
    onClose();
  }
  if (!game && mode === "import")
    return <SteamLibraryImport onClose={() => setMode("steam")} />;
  if (!game && mode === "steam")
    return (
      <Dialog open onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>Add a game</DialogTitle>
        <DialogContent dividers>
          <SteamPicker onAdded={onClose} />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={() => setMode("import")}>
            Import from Steam
          </Button>
          <Button variant="outlined" onClick={() => setMode("manual")}>
            Add manually
          </Button>
        </DialogActions>
      </Dialog>
    );
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <Box component="form" onSubmit={submit}>
        <DialogTitle>
          {game ? "Edit game" : "Add a new game"}
          <Typography variant="body2" color="text.secondary">
            Only a title is required. The rest can come with the journey.
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            {error && <Alert severity="error">{error}</Alert>}
            {!game && (
              <Button
                sx={{ alignSelf: "flex-start" }}
                onClick={() => setMode("steam")}
              >
                Search Steam instead
              </Button>
            )}
            {draft.source === "STEAM" && (
              <Alert severity="info">
                Game metadata comes from Steam. Edit your experience below, or
                unlink from the Steam section to customize game metadata.
              </Alert>
            )}
            <Typography variant="h5">Game details</Typography>
            <TextField
              autoFocus
              disabled={draft.source === "STEAM"}
              label="Game title"
              required
              value={draft.title}
              onChange={(e) => field("title", e.target.value)}
            />
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { sm: "minmax(0,1fr) minmax(0,1fr)" },
                gap: 2,
              }}
            >
              <TextField
                disabled={draft.source === "STEAM"}
                label="Release year"
                type="number"
                slotProps={{ htmlInput: { min: 1950, max: 2200 } }}
                value={draft.releaseYear ?? ""}
                onChange={(e) =>
                  field(
                    "releaseYear",
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
              />
              <TextField
                select
                label="Edition"
                value={draft.edition ?? "Main game"}
                onChange={(e) =>
                  field("edition", e.target.value as Game["edition"])
                }
              >
                {["Main game", "DLC", "Remake", "Remaster"].map((x) => (
                  <MenuItem key={x} value={x}>
                    {x}
                  </MenuItem>
                ))}
              </TextField>
              <Autocomplete
                disabled={draft.source === "STEAM"}
                multiple
                freeSolo
                options={data.genres.map((genre) => genre.name)}
                value={draft.genres}
                onChange={(_, value) => field("genres", value)}
                renderInput={(p) => (
                  <TextField
                    {...p}
                    label="Genres"
                    helperText="Type a genre and press Enter"
                  />
                )}
              />
              <Autocomplete
                freeSolo
                options={data.series.map((series) => series.name)}
                inputValue={draft.series ?? ""}
                onInputChange={(_, v) => field("series", v)}
                renderInput={(p) => <TextField {...p} label="Series" />}
              />
            </Box>
            {draft.source !== "STEAM" && (
              <DateField
                label="Release date (optional)"
                value={draft.releaseDate ?? ""}
                onValueChange={(v) => field("releaseDate", v)}
              />
            )}
            <TagField
              label="Tags & alternate names"
              value={draft.tags}
              suggestions={normalizeTags(data.games.flatMap((g) => g.tags))}
              onChange={(tags) => field("tags", tags)}
            />
            <TextField
              disabled={draft.source === "STEAM"}
              label="Description"
              multiline
              minRows={3}
              value={draft.description}
              onChange={(e) => field("description", e.target.value)}
            />
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { sm: "minmax(0,1fr) minmax(0,1fr)" },
                gap: 2,
              }}
            >
              {draft.source === "STEAM" ? (
                <GameImage
                  src={draft.coverImage}
                  alt="Steam cover"
                  sx={{ width: "100%", height: 160, objectFit: "contain" }}
                />
              ) : (
                <ImageUpload
                  label="Cover"
                  preset={imagePresets.cover}
                  value={draft.coverImage}
                  onImages={(images) => field("coverImage", images[0].src)}
                  onRemove={() => field("coverImage", "")}
                />
              )}
              {draft.source === "STEAM" ? (
                <GameImage
                  src={draft.heroImage}
                  alt="Steam banner"
                  sx={{ width: "100%", height: 160, objectFit: "cover" }}
                />
              ) : (
                <ImageUpload
                  label="Banner"
                  preset={imagePresets.banner}
                  value={draft.heroImage}
                  onImages={(images) => field("heroImage", images[0].src)}
                  onRemove={() => field("heroImage", "")}
                />
              )}
            </Box>
            <Typography variant="h5">Your experience</Typography>
            <TextField
              label="Manual game progress / 100"
              type="number"
              slotProps={{ htmlInput: { min: 0, max: 100 } }}
              value={draft.manualProgress ?? ""}
              helperText="Your own estimate. Separate from Steam playtime and achievements."
              onChange={(e) =>
                field(
                  "manualProgress",
                  e.target.value === "" ? undefined : Number(e.target.value),
                )
              }
            />
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { sm: "minmax(0,1fr) minmax(0,1fr)" },
                gap: 2,
              }}
            >
              <TextField
                label="Platform"
                value={draft.platform}
                onChange={(e) => field("platform", e.target.value)}
              />
              <TextField
                select
                label="Status"
                value={draft.status}
                onChange={(e) =>
                  field("status", e.target.value as Game["status"])
                }
              >
                {statuses.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Manually logged hours"
                type="number"
                slotProps={{ htmlInput: { min: 0, step: 0.1 } }}
                value={draft.hoursPlayed ?? ""}
                onChange={(e) =>
                  field(
                    "hoursPlayed",
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
              />
              <TextField
                label="Personal score / 10"
                type="number"
                slotProps={{ htmlInput: { min: 0, max: 10, step: 0.1 } }}
                value={draft.rating ?? ""}
                onChange={(e) =>
                  field(
                    "rating",
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
              />
              {(
                [
                  ["startedAt", "Started on"],
                  ["completedAt", "Finished on"],
                  ["plannedAt", "Planned start"],
                ] as const
              ).map(([key, label]) => (
                <DateField
                  key={key}
                  label={label}
                  value={draft[key] ?? ""}
                  onValueChange={(value) => field(key, value)}
                />
              ))}
              <TextField
                select
                label="Play plan"
                value={draft.plan}
                onChange={(e) => field("plan", e.target.value as Game["plan"])}
              >
                {plans.map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <TextField
              label="Planning note"
              value={draft.planNote ?? ""}
              onChange={(e) => field("planNote", e.target.value)}
            />
            <Autocomplete
              multiple
              options={data.collections}
              getOptionLabel={(c) => c.name}
              value={data.collections.filter((c) =>
                collectionIds.includes(c.id),
              )}
              onChange={(_, value) => setCollectionIds(value.map((c) => c.id))}
              renderInput={(p) => <TextField {...p} label="Collections" />}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={draft.favorite}
                  onChange={(_, v) => field("favorite", v)}
                />
              }
              label="Mark as a favorite"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            {game ? "Save changes" : "Add to library"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
