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
  onClose,
}: {
  collection?: GameCollection;
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
          {collection ? "Edit collection" : "Create collection"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              autoFocus
              label="Collection name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextField
              label="Description"
              multiline
              minRows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
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
                  label="Games"
                  helperText="Games appear in the order you select them."
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={!name.trim()}>
            Save collection
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
