"use client";
import { useState } from "react";
import {
  Alert,
  Box,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { Button, Dialog, IconButton } from "@/components/ui";
import {
  CloseRounded,
  ChevronLeftRounded,
  ChevronRightRounded,
} from "@mui/icons-material";
import { GameImage } from "@/components/game-image";
import type { Game } from "@/types/game";
import type { SteamMetadata } from "@/types/steam";
import { apiRequest } from "@/services/http-client";
import { useLibrary } from "../library-context";
import { useStorage } from "./storage-context";
export function OfficialImages({
  game,
  metadata,
}: {
  game: Game;
  metadata: SteamMetadata;
}) {
  const { runServerOperation, hasUnsavedChanges, notify, saveGame, data } =
      useLibrary(),
    { refresh } = useStorage();
  const [index, setIndex] = useState<number | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [revealed, setRevealed] = useState(!data.preferences.hideSpoilers);
  const images = metadata.screenshots,
    selected = index === null ? null : images[index];
  const move = (delta: number) =>
    setIndex((i) =>
      i === null || !images.length
        ? null
        : (i + delta + images.length) % images.length,
    );
  const save = async (
    kind: "cover" | "background" | "screenshot",
    screenshotId?: number,
  ) => {
    setBusy(true);
    setError("");
    try {
      await runServerOperation(
        (revision) =>
          apiRequest("/api/storage/official", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              gameId: game.id,
              kind,
              screenshotId,
              revision,
              requestId: crypto.randomUUID(),
            }),
            signal: AbortSignal.timeout(60000),
          }),
        "Saving official artwork to your storage…",
      );
      notify(
        kind === "screenshot"
          ? "Screenshot is in your gallery"
          : "Artwork saved to your storage",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this image.");
    } finally {
      setBusy(false);
      await refresh();
    }
  };
  return (
    <Stack spacing={2}>
      <Typography variant="h6">Official artwork</Typography>
      <Typography variant="body2" color="text.secondary">
        Preview for free. Save a personal copy to include it in ZIP backups;
        saved copies use your storage and are optimized to fit within 1600
        pixels.
      </Typography>
      <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 1 }}>
        <Button
          disabled={busy || hasUnsavedChanges}
          onClick={() =>
            game.savedCoverImage
              ? saveGame({ ...game, savedCoverImage: undefined })
              : void save("cover")
          }
        >
          {game.savedCoverImage
            ? "Remove saved cover · use Steam"
            : "Save cover to my storage"}
        </Button>
        <Button
          disabled={busy || hasUnsavedChanges}
          onClick={() =>
            game.savedHeroImage
              ? saveGame({ ...game, savedHeroImage: undefined })
              : void save("background")
          }
        >
          {game.savedHeroImage
            ? "Remove saved background · use Steam"
            : "Save background to my storage"}
        </Button>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {!images.length ? (
        <Typography color="text.secondary">
          No official screenshots available.
        </Typography>
      ) : !revealed ? (
        <Button onClick={() => setRevealed(true)}>
          Show official screenshots
        </Button>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2,minmax(0,1fr))",
              md: "repeat(4,minmax(0,1fr))",
            },
            gap: 1,
          }}
        >
          {images.map((s, i) => (
            <Button
              key={s.id}
              aria-label={`Preview ${game.title} screenshot ${i + 1}`}
              onClick={() => setIndex(i)}
              sx={{ p: 0, minWidth: 0 }}
            >
              <GameImage
                src={s.thumbnail || s.full}
                alt={`${game.title} screenshot ${i + 1}`}
                sx={{
                  width: "100%",
                  aspectRatio: "16/9",
                  objectFit: "cover",
                  borderRadius: 1,
                }}
              />
            </Button>
          ))}
        </Box>
      )}
      <Dialog
        open={!!selected}
        fullWidth
        maxWidth="lg"
        onClose={busy ? undefined : () => setIndex(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") move(-1);
          if (e.key === "ArrowRight") move(1);
        }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography sx={{ flex: 1, minWidth: 0 }} noWrap>
            {game.title} · {(index ?? 0) + 1} / {images.length}
          </Typography>
          <IconButton
            aria-label="Close image"
            disabled={busy}
            onClick={() => setIndex(null)}
          >
            <CloseRounded />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selected && (
            <GameImage
              src={selected.full}
              alt={`${game.title} official screenshot ${(index ?? 0) + 1}`}
              sx={{
                display: "block",
                width: "100%",
                height: "min(65dvh,700px)",
                objectFit: "contain",
              }}
            />
          )}
          <Stack
            direction="row"
            sx={{
              justifyContent: "space-between",
              alignItems: "center",
              mt: 2,
              gap: 1,
            }}
          >
            <IconButton
              aria-label="Previous image"
              disabled={images.length < 2}
              onClick={() => move(-1)}
            >
              <ChevronLeftRounded />
            </IconButton>
            <Button
              variant="contained"
              disabled={busy || hasUnsavedChanges || !selected}
              onClick={() => selected && void save("screenshot", selected.id)}
            >
              {busy ? "Saving…" : "Copy to my gallery"}
            </Button>
            <IconButton
              aria-label="Next image"
              disabled={images.length < 2}
              onClick={() => move(1)}
            >
              <ChevronRightRounded />
            </IconButton>
          </Stack>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
