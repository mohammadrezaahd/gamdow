"use client";
import { useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import type { Game, GameInput } from "@/types/game";
import { plans, statuses } from "@/services/library-repository";
import { newId, useLibrary } from "../library-context";
const empty: GameInput = {
  title: "",
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
            <Typography variant="h5">Game details</Typography>
            <TextField
              autoFocus
              label="Game title"
              required
              value={draft.title}
              onChange={(e) => field("title", e.target.value)}
            />
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { sm: "1fr 1fr" },
                gap: 2,
              }}
            >
              <TextField
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
                multiple
                freeSolo
                options={Array.from(
                  new Set(data.games.flatMap((g) => g.genres)),
                )}
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
                options={Array.from(
                  new Set(
                    data.games
                      .map((g) => g.series)
                      .filter((s): s is string => !!s),
                  ),
                )}
                inputValue={draft.series ?? ""}
                onInputChange={(_, v) => field("series", v)}
                renderInput={(p) => <TextField {...p} label="Series" />}
              />
            </Box>
            <TextField
              label="Description"
              multiline
              minRows={3}
              value={draft.description}
              onChange={(e) => field("description", e.target.value)}
            />
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { sm: "1fr 1fr" },
                gap: 2,
              }}
            >
              <TextField
                label="Cover image URL"
                type="url"
                value={draft.coverImage}
                onChange={(e) => field("coverImage", e.target.value)}
              />
              <TextField
                label="Banner image URL"
                type="url"
                value={draft.heroImage ?? ""}
                onChange={(e) => field("heroImage", e.target.value)}
              />
            </Box>
            <Typography variant="h5">Your experience</Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { sm: "1fr 1fr" },
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
                label="Hours played"
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
                <TextField
                  key={key}
                  label={label}
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={draft[key] ?? ""}
                  onChange={(e) => field(key, e.target.value)}
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
