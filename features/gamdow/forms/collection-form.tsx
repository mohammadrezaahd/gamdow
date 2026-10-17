"use client";
import { Autocomplete, Button, Dialog, TextField } from "@/components/ui";
import { useState } from "react";
import {
  Box,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from "@mui/material";
import type { GameCollection } from "@/types/game";
import { newId, useLibrary } from "../library-context";
export function CollectionForm({
  collection,
  focusGames = false,
  onClose,
}: {
  collection?: GameCollection;
  focusGames?: boolean;
  onClose: () => void;
}) {
  const { data, saveCollection } = useLibrary();
  const [name, setName] = useState(collection?.name ?? "");
  const [description, setDescription] = useState(collection?.description ?? "");
  const [ids, setIds] = useState(collection?.gameIds ?? []);
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          saveCollection({
            id: collection?.id ?? newId(),
            name: name.trim(),
            description,
            gameIds: ids,
          });
          onClose();
        }}
      >
        <DialogTitle>
          {focusGames ? "Add games" : collection ? "Edit collection" : "Create collection"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {!focusGames && <TextField
              autoFocus={!focusGames}
              label="Collection name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />}
            {!focusGames && <TextField
              label="Description"
              multiline
              minRows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />}
            <Autocomplete
              multiple
              options={data.games}
              getOptionLabel={(g) => g.title}
              value={ids
                .map((id) => data.games.find((g) => g.id === id))
                .filter((g) => g !== undefined)}
              onChange={(_, value) => setIds(value.map((g) => g.id))}
              renderInput={(p) => (
                <TextField
                  {...p}
                  autoFocus={focusGames}
                  label={focusGames ? "Select games to add" : "Games"}
                  helperText={focusGames ? "Existing games stay selected. Add or remove titles, then save." : "Games appear in the order you select them."}
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={focusGames ? !collection : !name.trim()}>
            {focusGames ? "Save games" : "Save collection"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
