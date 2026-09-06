"use client";
import { useState } from "react";
import {
  Alert,
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
import type { GalleryItem } from "@/types/game";
import { newId, today, useLibrary } from "../library-context";
import { GameImage } from "@/components/game-image";
const readFile = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.readAsDataURL(file);
  });
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
  const [url, setUrl] = useState(photo?.image ?? "");
  const [images, setImages] = useState<string[]>([]);
  const [caption, setCaption] = useState(photo?.caption ?? "");
  const [date, setDate] = useState(photo?.capturedAt ?? today());
  const [spoiler, setSpoiler] = useState(photo?.spoiler ?? false);
  const [favorite, setFavorite] = useState(photo?.favorite ?? false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!selected || (!url.trim() && !images.length))
            return setError("Select a game and add an image.");
          savePhotos(
            (images.length ? images : [url.trim()]).map((image, i) => ({
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
          {photo ? "Edit screenshot" : "Add screenshots"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              select
              label="Game"
              required
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {data.games.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.title}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Image URL"
              type={url.startsWith("data:") ? "text" : "url"}
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setImages([]);
              }}
            />
            <Button component="label" variant="outlined" disabled={busy}>
              Choose {photo ? "image" : "images"}
              <input
                hidden
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple={!photo}
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  setError("");
                  if (!files.length) return;
                  if (
                    files.some(
                      (f) =>
                        ![
                          "image/png",
                          "image/jpeg",
                          "image/webp",
                          "image/gif",
                        ].includes(f.type),
                    ) ||
                    files.reduce((n, f) => n + f.size, 0) > 2 * 1024 * 1024
                  )
                    return setError(
                      "Choose PNG, JPEG, WebP or GIF images, up to 2 MB total. For larger images use a URL.",
                    );
                  setBusy(true);
                  try {
                    setImages(await Promise.all(files.map(readFile)));
                    setUrl("");
                  } catch {
                    setError("The selected images could not be read.");
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </Button>
            <Typography variant="caption" color="text.secondary">
              Up to 2 MB per batch. Images are saved in this browser.
            </Typography>
            {(images[0] || url) && (
              <GameImage
                src={images[0] || url}
                sx={{
                  width: "100%",
                  maxHeight: 180,
                  objectFit: "contain",
                  borderRadius: 2,
                }}
              />
            )}
            {images.length > 1 && (
              <Typography>{images.length} images selected</Typography>
            )}
            <TextField
              label="Caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
            <TextField
              type="date"
              label="Captured on"
              required
              slotProps={{ inputLabel: { shrink: true } }}
              value={date}
              onChange={(e) => setDate(e.target.value)}
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
            disabled={busy || !data.games.length}
          >
            Save screenshots
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
