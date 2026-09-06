"use client";
import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import type { Game, ScoreBreakdown } from "@/types/game";
import { useLibrary } from "../library-context";
export function ReviewForm({
  game,
  onClose,
}: {
  game: Game;
  onClose: () => void;
}) {
  const { saveGame } = useLibrary();
  const [review, setReview] = useState(game.review ?? "");
  const [rating, setRating] = useState(game.rating?.toString() ?? "");
  const [scores, setScores] = useState<ScoreBreakdown>(
    game.scoreBreakdown ?? {},
  );
  const [pros, setPros] = useState(game.reviewPros ?? "");
  const [cons, setCons] = useState(game.reviewCons ?? "");
  const [spoiler, setSpoiler] = useState(game.reviewSpoiler ?? false);
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          saveGame({
            ...game,
            review: review.trim() || undefined,
            rating: rating === "" ? undefined : Number(rating),
            scoreBreakdown: scores,
            reviewPros: pros,
            reviewCons: cons,
            reviewSpoiler: spoiler,
          });
          onClose();
        }}
      >
        <DialogTitle>Your review · {game.title}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label="Overall score / 10"
              type="number"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              slotProps={{ htmlInput: { min: 0, max: 10, step: 0.1 } }}
              helperText="Your overall score is independent of the categories below."
            />
            <Typography variant="subtitle2">
              Optional category scores
            </Typography>
            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
            >
              {(
                ["story", "gameplay", "atmosphere", "visuals", "sound"] as const
              ).map((key) => (
                <TextField
                  key={key}
                  label={key[0].toUpperCase() + key.slice(1)}
                  type="number"
                  value={scores[key] ?? ""}
                  onChange={(e) =>
                    setScores((s) => ({
                      ...s,
                      [key]:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    }))
                  }
                  slotProps={{ htmlInput: { min: 0, max: 10, step: 0.1 } }}
                />
              ))}
            </Box>
            <TextField
              label="Your thoughts"
              multiline
              minRows={5}
              value={review}
              onChange={(e) => setReview(e.target.value)}
            />
            <TextField
              label="What worked"
              multiline
              value={pros}
              onChange={(e) => setPros(e.target.value)}
            />
            <TextField
              label="What didn't"
              multiline
              value={cons}
              onChange={(e) => setCons(e.target.value)}
            />
            <FormControlLabel
              label="Contains spoilers"
              control={
                <Switch checked={spoiler} onChange={(_, v) => setSpoiler(v)} />
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            Save review
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
