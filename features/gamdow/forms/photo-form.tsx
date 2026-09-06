"use client";
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
import {
  Button,
  DateField,
  Dialog,
  ImageUpload,
  MenuItem,
  Switch,
  TextField,
} from "@/components/ui";
import type { GalleryItem } from "@/types/game";
import { newId, today, useLibrary } from "../library-context";
import { imagePresets } from "@/lib/image";
export function PhotoForm({
  photo,
  gameId,
  onClose,
}: {
  photo?: GalleryItem;
  gameId?: string;
  onClose: () => void;
}) {
  const { data, savePhotos } = useLibrary();
  const [selected, setSelected] = useState(
    photo?.gameId ?? gameId ?? data.games[0]?.id ?? "",
  );
  const [images, setImages] = useState<string[]>(photo ? [photo.image] : []);
  const [caption, setCaption] = useState(photo?.caption ?? "");
  const [date, setDate] = useState(photo?.capturedAt ?? today());
  const [spoiler, setSpoiler] = useState(photo?.spoiler ?? false);
  const [favorite, setFavorite] = useState(photo?.favorite ?? false);
  const [error, setError] = useState("");
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!selected || !images.length || !date)
            return setError("Choose a game, an image and a capture date.");
          savePhotos(
            images.map((image, i) => ({
              id: photo?.id ?? newId(),
              gameId: selected,
              image,
              caption: caption.trim() || `Screenshot ${i + 1}`,
              capturedAt: date,
              spoiler,
              favorite,
            })),
          );
          onClose();
        }}
      >
        <DialogTitle>
          {photo ? "Edit the moment" : "Keep a moment"}
          <Typography variant="body2" color="text.secondary">
            Upload, frame, and add it to your story.
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              select
              label="Game"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              required
            >
              {data.games.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.title}
                </MenuItem>
              ))}
            </TextField>
            <ImageUpload
              label="Screenshots"
              preset={imagePresets.screenshot}
              multiple={!photo}
              value={images[0]}
              onImages={(items) => setImages(items.map((i) => i.src))}
              onRemove={() => setImages([])}
            />
            {images.length > 1 && (
              <Typography variant="caption" color="primary.main">
                {images.length} cropped screenshots ready. Caption and flags
                apply to all.
              </Typography>
            )}
            <TextField
              label="Caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
            <DateField
              label="Captured on"
              value={date}
              required
              onValueChange={setDate}
            />
            <FormControlLabel
              label="Contains spoilers"
              control={
                <Switch checked={spoiler} onChange={(_, v) => setSpoiler(v)} />
              }
            />
            <FormControlLabel
              label="Favorite"
              control={
                <Switch
                  checked={favorite}
                  onChange={(_, v) => setFavorite(v)}
                />
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!data.games.length || !images.length}
          >
            Save screenshots
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
