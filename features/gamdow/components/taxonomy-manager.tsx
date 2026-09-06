"use client";
import { useState } from "react";
import {
  Alert,
  Box,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import {
  AddRounded,
  CloseRounded,
  DeleteOutlineRounded,
  EditRounded,
} from "@mui/icons-material";
import {
  Button,
  Chip,
  Dialog,
  IconButton,
  Tab,
  Tabs,
  TextField,
} from "@/components/ui";
import { ConfirmDialog, EmptyState } from "@/components/page-parts";
import { useLibrary } from "../library-context";
import type {
  TaxonomyEntry,
  TaxonomyInput,
  TaxonomyKind,
} from "@/types/taxonomy";
import { taxonomyKey } from "@/lib/taxonomy";

function TaxonomyForm({
  kind,
  entry,
  onClose,
}: {
  kind: TaxonomyKind;
  entry?: TaxonomyEntry;
  onClose: () => void;
}) {
  const { saveCategory } = useLibrary();
  const [draft, setDraft] = useState<TaxonomyInput>({
    name: entry?.name ?? "",
    description: entry?.description ?? "",
  });
  const [error, setError] = useState("");
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          try {
            saveCategory({ kind, id: entry?.id, input: draft });
            onClose();
          } catch (error) {
            setError(
              error instanceof Error
                ? error.message
                : "Could not save category.",
            );
          }
        }}
      >
        <DialogTitle>
          {entry ? "Edit" : "New"} {kind === "genre" ? "genre" : "series"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              autoFocus
              label="Name"
              required
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
              slotProps={{ htmlInput: { maxLength: 80 } }}
            />
            <TextField
              label="Description"
              multiline
              minRows={3}
              value={draft.description}
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
              slotProps={{ htmlInput: { maxLength: 1000 } }}
            />
            <Typography variant="caption" color="text.secondary">
              {entry
                ? "Renaming also updates the games assigned to this category."
                : "Available immediately in the game form, even before any games are assigned."}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!draft.name.trim()}
          >
            Save {kind === "genre" ? "genre" : "series"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
export interface TaxonomyManagerProps {
  onClose: () => void;
  initialKind?: TaxonomyKind;
}
export function TaxonomyManager({
  onClose,
  initialKind = "genre",
}: TaxonomyManagerProps) {
  const { data, deleteCategory } = useLibrary();
  const [kind, setKind] = useState<TaxonomyKind>(initialKind);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<TaxonomyEntry | "new" | null>(null);
  const [remove, setRemove] = useState<TaxonomyEntry | null>(null);
  const entries = (kind === "genre" ? data.genres : data.series)
    .filter((entry) => taxonomyKey(entry.name).includes(taxonomyKey(query)))
    .sort((a, b) => a.name.localeCompare(b.name));
  const count = (entry: TaxonomyEntry) =>
    data.games.filter((game) =>
      entry.kind === "genre"
        ? game.genreIds?.includes(entry.id)
        : game.seriesId === entry.id,
    ).length;
  return (
    <>
      <Dialog open onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>
          Manage categories
          <IconButton
            aria-label="Close category manager"
            onClick={onClose}
            sx={{ float: "right" }}
          >
            <CloseRounded />
          </IconButton>
          <Typography variant="body2" color="text.secondary">
            Give every story a place in your archive.
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Tabs
            value={kind}
            onChange={(_, value) => {
              setKind(value);
              setQuery("");
            }}
            sx={{ mb: 3 }}
          >
            <Tab value="genre" label={`Genres · ${data.genres.length}`} />
            <Tab value="series" label={`Series · ${data.series.length}`} />
          </Tabs>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ mb: 3 }}
          >
            <TextField
              size="small"
              label={kind === "genre" ? "Search genres" : "Search series"}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button
              variant="contained"
              startIcon={<AddRounded />}
              onClick={() => setForm("new")}
              sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
            >
              New {kind === "genre" ? "genre" : "series"}
            </Button>
          </Stack>
          <Stack spacing={1.5}>
            {entries.map((entry) => (
              <Box
                key={entry.id}
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 2,
                  p: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack
                    direction="row"
                    spacing={1}
                    useFlexGap
                    sx={{ alignItems: "center", flexWrap: "wrap" }}
                  >
                    <Typography
                      sx={{ fontWeight: 700, overflowWrap: "anywhere" }}
                    >
                      {entry.name}
                    </Typography>
                    <Chip size="small" label={`${count(entry)} games`} />
                  </Stack>
                  {entry.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1, overflowWrap: "anywhere" }}
                    >
                      {entry.description}
                    </Typography>
                  )}
                </Box>
                <IconButton
                  aria-label={`Edit ${entry.name}`}
                  onClick={() => setForm(entry)}
                >
                  <EditRounded fontSize="small" />
                </IconButton>
                <IconButton
                  aria-label={`Delete ${entry.name}`}
                  onClick={() => setRemove(entry)}
                >
                  <DeleteOutlineRounded fontSize="small" />
                </IconButton>
              </Box>
            ))}
            {!entries.length && (
              <EmptyState
                title={query ? "No matching categories" : "Nothing defined yet"}
                description="Create a genre or series to start organizing your games."
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Done</Button>
        </DialogActions>
      </Dialog>
      {form && (
        <TaxonomyForm
          kind={kind}
          entry={form === "new" ? undefined : form}
          onClose={() => setForm(null)}
        />
      )}{" "}
      {remove && (
        <ConfirmDialog
          title={`Delete ${remove.name}?`}
          description={`This removes the category from ${count(remove)} games. The games themselves stay in your library.`}
          onClose={() => setRemove(null)}
          onConfirm={() => {
            deleteCategory(remove.kind, remove.id);
            setRemove(null);
          }}
        />
      )}
    </>
  );
}
