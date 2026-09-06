"use client";

import AddRounded from "@mui/icons-material/AddRounded";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import StarRounded from "@mui/icons-material/StarRounded";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControlLabel, LinearProgress, MenuItem, Paper, Select, Stack, Switch, Tab, Tabs, TextField, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { AppShell, type AppPage } from "@/components/app-shell";
import { GameCard } from "@/components/game-card";
import { fakeCollections, fakeGalleryItems, fakeGames, fakePreferences } from "@/data/fake-data";
import type { Game, GameStatus } from "@/types/game";

const statusColors: Record<GameStatus, "default" | "primary" | "success" | "warning" | "error"> = {
  "Not started": "default", Playing: "primary", "On hold": "warning", Completed: "success", Dropped: "error",
};

function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "flex-end" }} spacing={1.5} sx={{ mb: 3 }}>
    <Box>{eyebrow && <Typography variant="overline" color="primary.main" fontWeight={900}>{eyebrow}</Typography>}<Typography variant="h3">{title}</Typography></Box>{action}
  </Stack>;
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}><Typography variant="h4">{value}</Typography><Typography variant="body2" color="text.secondary">{label}</Typography></Paper>;
}

export function GamdowApp() {
  const [page, setPage] = useState<AppPage>("dashboard");
  const [games, setGames] = useState<Game[]>(fakeGames);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [statusFilter, setStatusFilter] = useState<GameStatus | "All">("All");
  const [addOpen, setAddOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");

  const completed = games.filter((game) => game.status === "Completed");
  const playing = games.filter((game) => game.status === "Playing");
  const planned = games.filter((game) => game.plan !== "None" && game.plan !== "Not interested");
  const displayedGames = useMemo(() => statusFilter === "All" ? games : games.filter((game) => game.status === statusFilter), [games, statusFilter]);

  const toggleFavorite = (id: string) => {
    setGames((current) => current.map((game) => game.id === id ? { ...game, favorite: !game.favorite } : game));
    setSelectedGame((current) => current?.id === id ? { ...current, favorite: !current.favorite } : current);
  };

  const createGame = () => {
    const title = draftTitle.trim();
    if (!title) return;
    const game: Game = { id: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`, title, releaseYear: new Date().getFullYear(), genres: ["Unsorted"], platform: "PC", status: "Not started", plan: "Soon", favorite: false, description: "A new game waiting for its first note.", journalEntries: [], coverImage: games[0]?.coverImage ?? "", updatedAt: new Date().toISOString().slice(0, 10) };
    setGames((current) => [game, ...current]);
    setDraftTitle("");
    setAddOpen(false);
    setPage("library");
  };

  const shell = (children: React.ReactNode) => <AppShell page={page} onPageChange={(next) => { setSelectedGame(null); setPage(next); }}>{children}</AppShell>;

  if (selectedGame) {
    return shell(<GameDetail game={selectedGame} onBack={() => setSelectedGame(null)} onFavorite={toggleFavorite} />);
  }

  if (page === "dashboard") return shell(<>
    <SectionTitle eyebrow="PERSONAL GAME SPACE" title={`Good evening, ${fakePreferences.displayName}.`} action={<Button variant="contained" startIcon={<AddRounded />} onClick={() => setAddOpen(true)}>Add a game</Button>} />
    <Paper sx={{ p: { xs: 2.5, md: 4 }, mb: 3, overflow: "hidden", position: "relative", background: "linear-gradient(115deg, #3f2d87 0%, #171b38 52%, #0f1122 100%)" }}>
      <Box sx={{ position: "relative", zIndex: 1, maxWidth: 560 }}><Typography variant="overline" sx={{ color: "#b9acff", fontWeight: 900 }}>CONTINUE YOUR JOURNEY</Typography><Typography variant="h2" sx={{ mt: 1 }}>Elden Ring</Typography><Typography color="text.secondary" sx={{ mt: 1.5, maxWidth: 460 }}>112 hours in. The next path is still yours to choose.</Typography><Stack direction="row" spacing={1.2} sx={{ mt: 3 }}><Button variant="contained" startIcon={<PlayArrowRounded />} onClick={() => setSelectedGame(games[0])}>Open game</Button><Button variant="outlined" onClick={() => setPage("planner")}>View planner</Button></Stack></Box>
      <Box component="img" src={games[0]?.heroImage ?? games[0]?.coverImage} alt="" sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.26, maskImage: "linear-gradient(90deg, transparent 35%, black)" }} />
    </Paper>
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 1.5, mb: 4, "& > *": { gridColumn: { xs: "span 2", sm: "span 1" } } }}><Metric value={games.length} label="Games in library" /><Metric value={completed.length} label="Completed" /><Metric value={playing.length} label="Playing now" /><Metric value="274h" label="Tracked time" /></Box>
    <SectionTitle title="Recently updated" action={<Button endIcon={<ArrowForwardRounded />} onClick={() => setPage("library")}>All library</Button>} />
    <GameGrid games={games.slice(0, 4)} onSelect={setSelectedGame} onFavorite={toggleFavorite} />
  </>);

  if (page === "library") return shell(<>
    <SectionTitle eyebrow="YOUR COLLECTION" title="Library" action={<Button variant="contained" startIcon={<AddRounded />} onClick={() => setAddOpen(true)}>Add a game</Button>} />
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 3 }}><TextField size="small" placeholder="Search library" sx={{ minWidth: 230 }} /><Select size="small" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as GameStatus | "All")} sx={{ minWidth: 160 }}>{["All", "Playing", "Not started", "On hold", "Completed", "Dropped"].map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}</Select></Stack>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{displayedGames.length} games · Organize by status, genre or series.</Typography>
    <GameGrid games={displayedGames} onSelect={setSelectedGame} onFavorite={toggleFavorite} />
  </>);

  if (page === "planner") return shell(<>
    <SectionTitle eyebrow="WHAT'S NEXT" title="Play planner" action={<Button variant="contained" startIcon={<AddRounded />} onClick={() => setAddOpen(true)}>Plan a game</Button>} />
    <Box sx={{ display: "grid", gridTemplateColumns: { md: "repeat(3, 1fr)" }, gap: 2 }}>
      {[["Up next", planned.filter((game) => game.plan === "Up next")], ["Soon", planned.filter((game) => game.plan === "Soon")], ["Someday", planned.filter((game) => game.plan === "Someday")]].map(([title, items]) => <Paper key={String(title)} variant="outlined" sx={{ p: 2, minHeight: 280 }}><Typography fontWeight={900}>{String(title)}</Typography><Typography variant="caption" color="text.secondary">{(items as Game[]).length} games</Typography><Stack spacing={1.2} sx={{ mt: 2 }}>{(items as Game[]).map((game) => <Paper key={game.id} variant="outlined" onClick={() => setSelectedGame(game)} sx={{ p: 1.2, cursor: "pointer", display: "flex", gap: 1.2, alignItems: "center" }}><Box component="img" src={game.coverImage} alt="" sx={{ width: 36, height: 48, objectFit: "cover", borderRadius: 1 }} /><Box><Typography fontWeight={800} variant="body2">{game.title}</Typography><Typography variant="caption" color="text.secondary">{game.genres[0]}</Typography></Box></Paper>)}</Stack></Paper>)}
    </Box>
  </>);

  if (page === "collections") return shell(<>
    <SectionTitle eyebrow="CURATED SHELVES" title="Collections" action={<Button variant="outlined">Create collection</Button>} />
    <Box sx={{ display: "grid", gridTemplateColumns: { sm: "repeat(3,1fr)" }, gap: 2 }}>{fakeCollections.map((collection, index) => <Paper key={collection.id} variant="outlined" sx={{ p: 2.5, minHeight: 220, background: index === 0 ? "linear-gradient(145deg,#35226d,#15182e)" : "background.paper" }}><AutoAwesomeRounded color="secondary" /><Typography variant="h5" sx={{ mt: 4 }}>{collection.name}</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>{collection.description}</Typography><Typography variant="caption" sx={{ display: "block", mt: 2 }}>{collection.gameIds.length} games</Typography></Paper>)}</Box>
  </>);

  if (page === "reviews") return shell(<>
    <SectionTitle eyebrow="YOUR WORDS" title="Reviews" />
    <Stack spacing={1.5}>{games.filter((game) => game.review).map((game) => <Paper key={game.id} variant="outlined" onClick={() => setSelectedGame(game)} sx={{ p: 2, display: "flex", gap: 2, cursor: "pointer" }}><Box component="img" src={game.coverImage} alt="" sx={{ width: 55, height: 76, objectFit: "cover", borderRadius: 1 }} /><Box><Stack direction="row" spacing={1} alignItems="center"><Typography fontWeight={900}>{game.title}</Typography>{game.rating && <Chip icon={<StarRounded />} label={game.rating} size="small" color="secondary" />}</Stack><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{game.review}</Typography></Box></Paper>)}</Stack>
  </>);

  if (page === "gallery") return shell(<>
    <SectionTitle eyebrow="MOMENTS WORTH KEEPING" title="Gallery" action={<Button variant="outlined">Add screenshot</Button>} />
    <Box sx={{ columns: { xs: 1, sm: 2, lg: 3 }, gap: 2 }}>{fakeGalleryItems.map((item) => <Paper key={item.id} sx={{ mb: 2, overflow: "hidden", breakInside: "avoid" }}><Box component="img" src={item.image} alt={item.caption} sx={{ display: "block", width: "100%" }} /><Box sx={{ p: 1.4 }}><Typography fontWeight={800}>{item.caption}</Typography><Typography variant="caption" color="text.secondary">{item.capturedAt}</Typography></Box></Paper>)}</Box>
  </>);

  if (page === "statistics") return shell(<>
    <SectionTitle eyebrow="THE YEAR IN GAMES" title="Statistics" />
    <Box sx={{ display: "grid", gridTemplateColumns: { sm: "repeat(3,1fr)" }, gap: 2, mb: 3 }}><Metric value="8.9" label="Average rating" /><Metric value="4" label="Favorite games" /><Metric value={completed.length} label="Finished this year" /></Box>
    <Paper variant="outlined" sx={{ p: 3 }}><Typography variant="h5">Status breakdown</Typography><Stack spacing={2.2} sx={{ mt: 3 }}>{(["Completed", "Playing", "Not started", "On hold"] as GameStatus[]).map((status) => { const count = games.filter((game) => game.status === status).length; return <Box key={status}><Stack direction="row" justifyContent="space-between"><Typography variant="body2">{status}</Typography><Typography variant="body2" color="text.secondary">{count} games</Typography></Stack><LinearProgress variant="determinate" value={(count / games.length) * 100} color={statusColors[status] === "default" ? "primary" : statusColors[status]} sx={{ mt: 0.8, height: 8, borderRadius: 8 }} /></Box>; })}</Stack></Paper>
  </>);

  return shell(<>
    <SectionTitle eyebrow="YOUR SPACE" title="Settings" />
    <Paper variant="outlined" sx={{ p: 3, maxWidth: 640 }}><Typography variant="h5">Library preferences</Typography><Divider sx={{ my: 2.5 }} /><FormControlLabel control={<Switch defaultChecked />} label="Hide spoiler-marked screenshots" /><FormControlLabel control={<Switch defaultChecked />} label="Use compact game cards" /><Alert severity="info" sx={{ mt: 2 }}>This is fake local data for now. The interfaces are ready to connect to APIs later.</Alert></Paper>
  </>);
  
  // The dialog is rendered below using a portal in the component return path.
}
