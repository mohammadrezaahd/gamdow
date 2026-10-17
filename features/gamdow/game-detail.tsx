"use client";
import { PlaytimeControl } from "./components/playtime-control";
import { ProgressControl } from "./components/progress-control";
import { GameProgressHistory } from "./components/game-progress-history";
import { SteamGamePanel } from "./steam/steam-game-panel";
import type { SteamMetadata } from "@/types/steam";
import { DateField } from "@/components/ui";
import {
  Button,
  Chip,
  IconButton,
  MenuItem,
  Tab,
  Tabs,
  TextField,
} from "@/components/ui";
import { useState } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Box, Divider, FormControl, InputLabel, Paper, Select, Stack, Typography } from "@mui/material";
import {
  ArrowBackRounded,
  DeleteOutlineRounded,
  EditRounded,
  FavoriteBorderRounded,
  FavoriteRounded,
  ExpandMoreRounded,
} from "@mui/icons-material";
import type { Game, JournalEntry } from "@/types/game";
import { GameImage } from "@/components/game-image";
import { ConfirmDialog } from "@/components/page-parts";
import { statuses } from "@/services/library-repository";
import { newId, today, useLibrary } from "./library-context";
import { ReviewForm } from "./forms/review-form";
import { GalleryPage } from "./pages/gallery-page";
export function GameDetail({
  game,
  onBack,
  onEdit,
  initialTab = 0,
  onGame,
}: {
  game: Game;
  onBack: () => void;
  onEdit: () => void;
  initialTab?: number;
  onGame: (id: string) => void;
}) {
  const { data, saveGame, deleteGame } = useLibrary();
  const [steamMetadata, setSteamMetadata] = useState<SteamMetadata | null>(
    null,
  );
  const visibleMetadata = game.source === "STEAM" ? steamMetadata : null;
  const [tab, setTab] = useState(initialTab);
  const [review, setReview] = useState(false);
  const [remove, setRemove] = useState<"game" | "review" | JournalEntry | null>(
    null,
  );
  const [entry, setEntry] = useState<JournalEntry>({
    id: newId(),
    date: today(),
    text: "",
  });
  const [reveal, setReveal] = useState(false);
  const resetEntry = () => setEntry({ id: newId(), date: today(), text: "" });
  return (
    <Box>
      <Stack
        direction="row"
        sx={{ ...{ mb: 2 }, justifyContent: "space-between" }}
      >
        <Button startIcon={<ArrowBackRounded />} onClick={onBack}>
          Back
        </Button>
        <Stack direction="row">
          <Button startIcon={<EditRounded />} onClick={onEdit}>
            Edit game
          </Button>
          <IconButton
            aria-label="Delete game"
            onClick={() => setRemove("game")}
          >
            <DeleteOutlineRounded />
          </IconButton>
        </Stack>
      </Stack>
      <Paper
        sx={{
          overflow: "hidden",
          position: "relative",
          minHeight: { xs: 250, sm: 300, md: 340 },
          display: "flex",
          alignItems: "end",
          p: { xs: 2.5, md: 4 },
        }}
      >
        <GameImage
          src={
            game.savedHeroImage ||
            visibleMetadata?.images.background ||
            visibleMetadata?.images.header ||
            game.heroImage ||
            game.coverImage
          }
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.35,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(0deg, #0d181bee, #0d181b11)",
          }}
        />
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={3}
          sx={{
            ...{ position: "relative", width: "100%" },
            alignItems: { sm: "end" },
          }}
        >
          <GameImage
            src={
              game.savedCoverImage ||
              visibleMetadata?.images.cover ||
              game.coverImage
            }
            alt={game.title}
            sx={{
              width: 110,
              height: 155,
              objectFit: "cover",
              borderRadius: 2,
              boxShadow: 8,
            }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ flexWrap: "wrap" }}
            >
              <Chip size="small" color="primary" label={game.status} />
              <Typography variant="body2">
                {[
                  visibleMetadata?.release.year ?? game.releaseYear,
                  game.platform,
                  game.edition,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Typography>
            </Stack>
            <Typography variant="h2" sx={{ mt: 1, fontSize: { xs: "2rem", sm: "2.75rem", md: "3.5rem" }, lineHeight: 1.05, overflowWrap: "anywhere" }}>
              {visibleMetadata?.name || game.title}
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              sx={{ ...{ mt: 2 }, flexWrap: "wrap" }}
              useFlexGap
            >
              {game.rating !== undefined && (
                <Chip color="primary" label={`${game.rating} / 10`} />
              )}
              {(visibleMetadata
                ? visibleMetadata.genres.map((g) => g.name)
                : game.genres
              ).map((g) => (
                <Chip key={g} label={g} />
              ))}
            </Stack>
          </Box>
        </Stack>
        <IconButton
          aria-label="Toggle favorite"
          onClick={() => saveGame({ ...game, favorite: !game.favorite })}
          sx={{ position: "absolute", top: 16, right: 16 }}
        >
          {game.favorite ? (
            <FavoriteRounded color="primary" />
          ) : (
            <FavoriteBorderRounded />
          )}
        </IconButton>
      </Paper>
      <Paper sx={{ mt: 2, p: { xs: 2, md: 3 } }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          allowScrollButtonsMobile
          sx={{ mb: 3 }}
        >
          <Tab label="Overview" />
          <Tab label="Review" />
          <Tab label="Gallery" />
          <Tab label="Journal" />
        </Tabs>
        {tab === 0 && (
          <Stack spacing={{ xs: 2.5, md: 3 }}>
            {(visibleMetadata?.description || game.description) && (
              <Typography color="text.secondary" sx={{ maxWidth: 820, lineHeight: 1.8 }}>
                {visibleMetadata?.description || game.description}
              </Typography>
            )}
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", sm: "repeat(2,minmax(0,1fr))", lg: "repeat(3,minmax(0,1fr))" }, gap: 1.5 }}>
              <Paper sx={{ p: 2, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <Typography variant="caption" color="text.secondary">Status</Typography>
                <Chip size="small" color="primary" label={game.status} sx={{ mt: 1, alignSelf: "flex-start" }} />
                <FormControl variant="standard" fullWidth sx={{ mt: 2 }}>
                  <InputLabel id={`game-status-${game.id}`}>Change status</InputLabel>
                  <Select
                    labelId={`game-status-${game.id}`}
                    value={game.status}
                    label="Change status"
                    onChange={(e) => saveGame({ ...game, status: e.target.value as Game["status"] })}
                  >
                    {statuses.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
              </Paper>
              <PlaytimeControl game={game} />
              <ProgressControl game={game} />
            </Box>
            <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 1, alignItems: "center" }}>
              {game.startedAt && <Chip size="small" label={`Started ${game.startedAt}`} />}
              {game.completedAt && <Chip size="small" label={`Finished ${game.completedAt}`} />}
              {game.plan && <Chip size="small" label={game.planNote ? `${game.plan} · ${game.planNote}` : game.plan} />}
              {game.series && <Chip size="small" label={game.series} />}
              {data.collections.filter((c) => c.gameIds.includes(game.id)).map((c) => <Chip key={c.id} size="small" label={c.name} />)}
              {game.tags.map((tag) => <Chip key={tag} size="small" label={tag} />)}
            </Stack>
            <GameProgressHistory game={game} compact onOpenJournal={() => setTab(3)} />
            <Accordion disableGutters sx={{ border: 1, borderColor: "divider", borderRadius: "8px !important", overflow: "hidden", "&::before": { display: "none" } }}>
              <AccordionSummary expandIcon={<ExpandMoreRounded />}>
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{game.steamAppId ? "Steam details" : "Connect this game to Steam"}</Typography>
                  <Typography variant="body2" color="text.secondary">{game.steamAppId ? "Play, achievements and store links" : "Find this game in the Steam catalog"}</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: { xs: 1.25, md: 2 } }}>
                <SteamGamePanel game={game} onMetadata={setSteamMetadata} />
              </AccordionDetails>
            </Accordion>
            <Button variant="outlined" onClick={onEdit} sx={{ alignSelf: "flex-start" }}>
              Edit game details
            </Button>
          </Stack>
        )}
        {tab === 1 && (
          <Stack spacing={2}>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography variant="h5">
                Your verdict
                {game.rating !== undefined ? ` · ${game.rating}/10` : ""}
              </Typography>
              <Button onClick={() => setReview(true)}>
                {game.review ? "Edit review" : "Write review"}
              </Button>
            </Stack>
            {game.reviewSpoiler && data.preferences.hideSpoilers && !reveal ? (
              <Box sx={{ position: "relative", overflow: "hidden", borderRadius: 2, border: 1, borderColor: "divider", p: 2 }}>
                <Typography aria-hidden="true" sx={{ whiteSpace: "pre-wrap", filter: "blur(7px)", userSelect: "none" }}>
                  {game.review || "Review text"}
                  {game.reviewPros && `\nWhat worked: ${game.reviewPros}`}
                  {game.reviewCons && `\nWhat didn’t: ${game.reviewCons}`}
                </Typography>
                <Button variant="contained" onClick={() => setReveal(true)} sx={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", whiteSpace: "nowrap" }}>
                  Reveal spoiler
                </Button>
              </Box>
            ) : (
              <>
                <Typography sx={{ whiteSpace: "pre-wrap" }}>
                  {game.review ||
                    "What stayed with you? Put your experience into words."}
                </Typography>
                {game.reviewPros && (
                  <Typography sx={{ whiteSpace: "pre-wrap" }}>
                    What worked: {game.reviewPros}
                  </Typography>
                )}
                {game.reviewCons && (
                  <Typography sx={{ whiteSpace: "pre-wrap" }}>
                    What didn’t: {game.reviewCons}
                  </Typography>
                )}
              </>
            )}
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ flexWrap: "wrap" }}
            >
              {Object.entries(game.scoreBreakdown ?? {})
                .filter(([, value]) => value !== undefined)
                .map(([key, value]) => (
                  <Chip key={key} label={`${key}: ${value}/10`} />
                ))}
            </Stack>
            {game.review && (
              <Box>
                <Button color="error" onClick={() => setRemove("review")}>
                  Delete review
                </Button>
              </Box>
            )}
          </Stack>
        )}
        {tab === 2 && <GalleryPage gameId={game.id} onGame={onGame} />}
        {tab === 3 && (
          <Stack spacing={{ xs: 2, md: 3 }}>
            <Box>
              <Typography variant="h5">Your play history</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>
                Status, playtime and progress changes, grouped by day.
              </Typography>
            </Box>
            <GameProgressHistory game={game} />
            <Paper component="form" variant="outlined" onSubmit={(e) => {
              e.preventDefault();
              if (!entry.text.trim()) return;
              saveGame({ ...game, journalEntries: [...game.journalEntries.filter((j) => j.id !== entry.id), { ...entry, text: entry.text.trim() }].sort((a, b) => b.date.localeCompare(a.date)) });
              resetEntry();
            }} sx={{ p: { xs: 2, md: 2.5 } }}>
              <Typography variant="h6" sx={{ mb: 2 }}>{game.journalEntries.some((j) => j.id === entry.id) ? "Edit a note" : "Add a note"}</Typography>
              <Stack spacing={2}>
                <DateField label="Date" required value={entry.date} onValueChange={(value) => setEntry((j) => ({ ...j, date: value }))} />
                <TextField label="A quick note" placeholder="What happened in this session?" required multiline minRows={2} value={entry.text} onChange={(e) => setEntry((j) => ({ ...j, text: e.target.value }))} />
                <Stack direction="row" spacing={1}>
                  <Button type="submit" variant="contained">{game.journalEntries.some((j) => j.id === entry.id) ? "Save note" : "Add note"}</Button>
                  {game.journalEntries.some((j) => j.id === entry.id) && <Button onClick={resetEntry}>Cancel</Button>}
                </Stack>
              </Stack>
            </Paper>
            <Divider />
            {game.journalEntries.length ? (
              game.journalEntries.map((j) => (
                <Paper key={j.id} sx={{ p: 2 }}>
                  <Stack
                    direction="row"
                    sx={{ justifyContent: "space-between" }}
                  >
                    <Typography color="primary.main" variant="caption">
                      {j.date}
                    </Typography>
                    <Stack direction="row">
                      <IconButton
                        size="small"
                        aria-label="Edit journal entry"
                        onClick={() => setEntry(j)}
                      >
                        <EditRounded fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label="Delete journal entry"
                        onClick={() => setRemove(j)}
                      >
                        <DeleteOutlineRounded fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                  <Typography sx={{ whiteSpace: "pre-wrap" }}>
                    {j.text}
                  </Typography>
                </Paper>
              ))
            ) : (
              <Typography color="text.secondary">Your notes will appear here.</Typography>
            )}
          </Stack>
        )}
      </Paper>
      {review && <ReviewForm game={game} onClose={() => setReview(false)} />}
      {remove && (
        <ConfirmDialog
          title={`Delete ${remove === "game" ? "game" : remove === "review" ? "review" : "journal entry"}?`}
          description={
            remove === "game"
              ? "This also removes its review, journal, gallery images and collection memberships."
              : "This entry will be removed from your game."
          }
          onClose={() => setRemove(null)}
          onConfirm={() => {
            if (remove === "game") {
              deleteGame(game.id);
              onBack();
            } else if (remove === "review")
              saveGame({
                ...game,
                review: undefined,
                reviewPros: undefined,
                reviewCons: undefined,
                reviewSpoiler: false,
                scoreBreakdown: undefined,
              });
            else {
              saveGame({
                ...game,
                journalEntries: game.journalEntries.filter(
                  (j) => j.id !== remove.id,
                ),
              });
              if (entry.id === remove.id) resetEntry();
            }
            setRemove(null);
          }}
        />
      )}
    </Box>
  );
}
