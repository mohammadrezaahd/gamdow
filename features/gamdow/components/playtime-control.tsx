"use client";
import { useState } from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { Button, TextField } from "@/components/ui";
import { formatPlaytime, MAX_PLAYTIME_HOURS } from "@/lib/playtime";
import type { Game } from "@/types/game";
import { useLibrary } from "../library-context";
export function PlaytimeControl({ game }: { game: Game }) {
  const { adjustGamePlaytime } = useLibrary();
  const [amount, setAmount] = useState("30");
  const minutes = Number(amount);
  const valid =
    amount.trim() !== "" &&
    Number.isInteger(minutes) &&
    minutes > 0 &&
    minutes <= 1440;
  const total = Math.round((game.hoursPlayed ?? 0) * 60);
  const change = (delta: number) => adjustGamePlaytime(game.id, delta);
  return (
    <Paper sx={{ p: 2, minWidth: 0 }}>
      <Typography variant="caption">
        {game.source === "STEAM" ? "Personally recorded time" : "Time played"}
      </Typography>
      <Typography aria-live="polite" sx={{ fontSize: 22, my: 1 }}>
        {formatPlaytime(game.hoursPlayed)}
      </Typography>
      <Stack
        direction="row"
        useFlexGap
        sx={{ flexWrap: "wrap", gap: 1, mb: 2 }}
      >
        {[15, 30, 60].map((n) => (
          <Button
            key={n}
            size="small"
            variant="outlined"
            disabled={total + n > MAX_PLAYTIME_HOURS * 60}
            onClick={() => change(n)}
          >
            +{n} min
          </Button>
        ))}
      </Stack>
      <TextField
        label="Minutes to adjust"
        type="number"
        size="small"
        fullWidth
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        error={!valid}
        helperText={
          !valid
            ? "Enter 1–1,440 whole minutes."
            : "Add a session or correct your recorded time."
        }
        slotProps={{ htmlInput: { min: 1, max: 1440, step: 1 } }}
      />
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
        <Button
          disabled={!valid || total + minutes > MAX_PLAYTIME_HOURS * 60}
          onClick={() => change(minutes)}
        >
          Add time
        </Button>
        <Button
          disabled={!valid || total < minutes}
          onClick={() => change(-minutes)}
        >
          Subtract time
        </Button>
      </Box>
      {game.source === "STEAM" && (
        <Typography variant="caption" color="text.secondary">
          Independent of Steam playtime and game progress.
        </Typography>
      )}
    </Paper>
  );
}
