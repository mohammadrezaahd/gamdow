"use client";

import { Paper, Stack, Typography } from "@mui/material";
import { Slider } from "@/components/ui";
import type { Game } from "@/types/game";
import { useLibrary } from "../library-context";

export function ProgressControl({ game }: { game: Game }) {
  const { saveGame } = useLibrary();
  const progress = game.manualProgress ?? 0;

  return (
    <Paper sx={{ p: 2, minWidth: 0 }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", gap: 1 }}>
        <Typography variant="caption">Story progress</Typography>
        <Typography color="primary.main" sx={{ fontWeight: 700 }}>
          {game.manualProgress === undefined ? "Not set" : `${progress}%`}
        </Typography>
      </Stack>
      <Slider
        aria-label={`Story progress for ${game.title}`}
        value={progress}
        min={0}
        max={100}
        step={1}
        valueLabelDisplay="auto"
        valueLabelFormat={(value) => `${value}%`}
        onChangeCommitted={(_, value) => {
          const next = Array.isArray(value) ? value[0] : value;
          saveGame({ ...game, manualProgress: next });
        }}
        sx={{ mt: 2, mb: 1 }}
      />
      <Typography variant="caption" color="text.secondary">
        Drag to record progress. Every change is saved with today&apos;s play history.
      </Typography>
    </Paper>
  );
}
