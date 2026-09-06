"use client";
import { useState } from "react";
import {
  Button,
  Card,
  CardActionArea,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { EmptyState, SectionTitle } from "@/components/page-parts";
import { useLibrary } from "../library-context";
import { ReviewForm } from "../forms/review-form";
export function ReviewsPage({
  onGame,
}: {
  onGame: (id: string, tab?: number) => void;
}) {
  const { data } = useLibrary();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [spoilers, setSpoilers] = useState("all");
  const [minimum, setMinimum] = useState("");
  const [picker, setPicker] = useState(false);
  const [id, setId] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const games = data.games
    .filter(
      (g) =>
        g.review &&
        g.title.toLowerCase().includes(search.toLowerCase()) &&
        (spoilers === "all" ||
          (spoilers === "yes" ? g.reviewSpoiler : !g.reviewSpoiler)) &&
        (!minimum || (g.rating !== undefined && g.rating >= Number(minimum))),
    )
    .sort((a, b) =>
      sort === "rating"
        ? (b.rating ?? -1) - (a.rating ?? -1)
        : b.updatedAt.localeCompare(a.updatedAt),
    );
  const game = data.games.find((g) => g.id === editing);
  return (
    <>
      <SectionTitle
        title="Reviews"
        eyebrow="YOUR WORDS, YOUR VERDICT"
        action={
          <Button
            variant="contained"
            onClick={() => setPicker(true)}
            disabled={!data.games.length}
          >
            Write a review
          </Button>
        }
      />
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          label="Search game"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <TextField
          select
          label="Sort"
          size="small"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="recent">Recently updated</MenuItem>
          <MenuItem value="rating">Highest score</MenuItem>
        </TextField>
        <TextField
          select
          label="Spoilers"
          size="small"
          value={spoilers}
          onChange={(e) => setSpoilers(e.target.value)}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="all">All reviews</MenuItem>
          <MenuItem value="yes">With spoilers</MenuItem>
          <MenuItem value="no">Without spoilers</MenuItem>
        </TextField>
        <TextField
          label="Minimum score"
          size="small"
          type="number"
          value={minimum}
          onChange={(e) => setMinimum(e.target.value)}
          slotProps={{ htmlInput: { min: 0, max: 10, step: 0.5 } }}
        />
      </Stack>
      {!games.length ? (
        <EmptyState
          title="No reviews found"
          description="Write about a game you played, or try different filters."
        />
      ) : (
        <Stack spacing={2}>
          {games.map((g) => (
            <Card key={g.id}>
              <CardActionArea onClick={() => onGame(g.id, 1)} sx={{ p: 3 }}>
                <Stack
                  direction="row"
                  spacing={2}
                  useFlexGap
                  sx={{ alignItems: "center", flexWrap: "wrap" }}
                >
                  <Typography variant="h5">{g.title}</Typography>
                  {g.rating !== undefined && (
                    <Chip color="primary" label={`${g.rating}/10`} />
                  )}
                  {g.reviewSpoiler && <Chip size="small" label="Spoilers" />}
                </Stack>
                <Typography
                  color="text.secondary"
                  sx={{
                    mt: 2,
                    whiteSpace: "pre-wrap",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {g.reviewSpoiler && data.preferences.hideSpoilers
                    ? "Spoiler review hidden. Open the game to reveal it."
                    : g.review}
                </Typography>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      )}
      <Dialog
        open={picker}
        onClose={() => setPicker(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Choose a game</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="Game"
            value={id}
            onChange={(e) => setId(e.target.value)}
            sx={{ mt: 1 }}
          >
            {data.games.map((g) => (
              <MenuItem key={g.id} value={g.id}>
                {g.title}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPicker(false)}>Cancel</Button>
          <Button
            disabled={!id}
            onClick={() => {
              setEditing(id);
              setPicker(false);
            }}
          >
            Continue
          </Button>
        </DialogActions>
      </Dialog>
      {game && <ReviewForm game={game} onClose={() => setEditing(null)} />}
    </>
  );
}
