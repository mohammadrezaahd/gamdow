"use client";
import { DateField } from "@/components/ui";
import {
  Button,
  Dialog,
  IconButton,
  MenuItem,
  Switch,
  TextField,
} from "@/components/ui";
import { useState } from "react";
import {
  Box,
  Card,
  CardActionArea,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Typography,
} from "@mui/material";
import {
  ArrowBackRounded,
  ArrowForwardRounded,
  CloseRounded,
  DeleteOutlineRounded,
  EditRounded,
  FavoriteBorderRounded,
  FavoriteRounded,
} from "@mui/icons-material";
import {
  ConfirmDialog,
  EmptyState,
  SectionTitle,
} from "@/components/page-parts";
import { GameImage } from "@/components/game-image";
import { useLibrary } from "../library-context";
import { PhotoForm } from "../forms/photo-form";
import type { GalleryItem } from "@/types/game";
export function GalleryPage({
  gameId,
  onGame,
}: {
  gameId?: string;
  onGame: (id: string) => void;
}) {
  const { data, savePhotos, deletePhoto } = useLibrary();
  const [filter, setFilter] = useState(gameId ?? "all");
  const [favorites, setFavorites] = useState(false);
  const [date, setDate] = useState("");
  const [form, setForm] = useState<GalleryItem | "new" | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [remove, setRemove] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<string[]>([]);
  const items = data.gallery.filter(
    (p) =>
      (filter === "all" || p.gameId === filter) &&
      (!favorites || p.favorite) &&
      (!date || p.capturedAt >= date),
  );
  const photo = items.find((p) => p.id === selected);
  const hidden = (p: GalleryItem) =>
    p.spoiler && data.preferences.hideSpoilers && !revealed.includes(p.id);
  const move = (n: number) => {
    if (!items.length) return;
    const i = items.findIndex((p) => p.id === selected);
    setSelected(items[(i + n + items.length) % items.length].id);
  };
  return (
    <>
      <SectionTitle
        title={gameId ? "Game gallery" : "Gallery"}
        eyebrow="MOMENTS WORTH KEEPING"
        action={
          <Button
            variant="contained"
            onClick={() => setForm("new")}
            disabled={!data.games.length}
          >
            Add screenshots
          </Button>
        }
      />
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
        {!gameId && (
          <TextField
            select
            size="small"
            label="Game"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="all">All games</MenuItem>
            {data.games.map((g) => (
              <MenuItem key={g.id} value={g.id}>
                {g.title}
              </MenuItem>
            ))}
          </TextField>
        )}
        <DateField
          label="From date"
          size="small"
          value={date}
          onValueChange={(value) => setDate(value)}
        />
        <FormControlLabel
          label="Favorites only"
          control={
            <Switch checked={favorites} onChange={(_, v) => setFavorites(v)} />
          }
        />
      </Stack>
      {!items.length ? (
        <EmptyState
          title="No screenshots yet"
          description="Keep the moments you want to remember, or adjust your filters."
        />
      ) : (
        <Box sx={{ columns: { xs: 1, sm: 2, xl: 3 }, gap: 2 }}>
          {items.map((p) => (
            <Card key={p.id} sx={{ mb: 2, breakInside: "avoid" }}>
              <CardActionArea onClick={() => setSelected(p.id)}>
                {hidden(p) ? (
                  <Box
                    sx={{ height: 190, display: "grid", placeItems: "center" }}
                  >
                    <Typography>Spoiler · Open to reveal</Typography>
                  </Box>
                ) : (
                  <GameImage
                    src={p.image}
                    alt={p.caption}
                    sx={{ display: "block", width: "100%" }}
                  />
                )}
                <Box sx={{ p: 2 }}>
                  <Typography sx={{ fontWeight: 700 }}>{p.caption}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {data.games.find((g) => g.id === p.gameId)?.title} ·{" "}
                    {p.capturedAt}
                  </Typography>
                </Box>
              </CardActionArea>
              <Stack direction="row" sx={{ px: 1, pb: 1 }}>
                <IconButton
                  aria-label="Favorite screenshot"
                  onClick={() => savePhotos([{ ...p, favorite: !p.favorite }])}
                >
                  {p.favorite ? (
                    <FavoriteRounded color="primary" />
                  ) : (
                    <FavoriteBorderRounded />
                  )}
                </IconButton>
                <IconButton
                  aria-label="Edit screenshot"
                  onClick={() => setForm(p)}
                >
                  <EditRounded />
                </IconButton>
                <IconButton
                  aria-label="Delete screenshot"
                  onClick={() => setRemove(p.id)}
                >
                  <DeleteOutlineRounded />
                </IconButton>
              </Stack>
            </Card>
          ))}
        </Box>
      )}
      {form && (
        <PhotoForm
          photo={form === "new" ? undefined : form}
          gameId={gameId}
          onClose={() => setForm(null)}
        />
      )}
      {remove && (
        <ConfirmDialog
          title="Delete screenshot?"
          description="This removes the screenshot from your gallery."
          onClose={() => setRemove(null)}
          onConfirm={() => {
            deletePhoto(remove);
            setRemove(null);
          }}
        />
      )}
      <Dialog
        open={!!photo}
        onClose={() => setSelected(null)}
        maxWidth="lg"
        fullWidth
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") move(1);
          if (e.key === "ArrowLeft") move(-1);
        }}
      >
        <DialogTitle>
          {photo?.caption}
          <IconButton
            aria-label="Close image"
            onClick={() => setSelected(null)}
            sx={{ float: "right" }}
          >
            <CloseRounded />
          </IconButton>
        </DialogTitle>
        {photo && (
          <DialogContent>
            {hidden(photo) ? (
              <Button onClick={() => setRevealed((r) => [...r, photo.id])}>
                Reveal spoiler
              </Button>
            ) : (
              <GameImage
                src={photo.image}
                alt={photo.caption}
                sx={{ width: "100%", maxHeight: "70vh", objectFit: "contain" }}
              />
            )}
            <Stack
              direction="row"
              sx={{
                ...{ mt: 2 },
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <IconButton aria-label="Previous image" onClick={() => move(-1)}>
                <ArrowBackRounded />
              </IconButton>
              <Button
                onClick={() => {
                  setSelected(null);
                  onGame(photo.gameId);
                }}
              >
                Open game
              </Button>
              <IconButton aria-label="Next image" onClick={() => move(1)}>
                <ArrowForwardRounded />
              </IconButton>
            </Stack>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
