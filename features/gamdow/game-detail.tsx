"use client";

import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import FavoriteBorderRounded from "@mui/icons-material/FavoriteBorderRounded";
import FavoriteRounded from "@mui/icons-material/FavoriteRounded";
import StarRounded from "@mui/icons-material/StarRounded";
import { Box, Button, Chip, Divider, IconButton, Paper, Stack, Tab, Tabs, Typography } from "@mui/material";
import { useState } from "react";
import type { Game } from "@/types/game";

type GameDetailProps = { game: Game; onBack: () => void; onFavorite: (id: string) => void };

export function GameDetail({ game, onBack, onFavorite }: GameDetailProps) {
  const [tab, setTab] = useState(0);
  return <Box>
    <Button startIcon={<ArrowBackRounded />} onClick={onBack} sx={{ mb: 2 }}>Back to library</Button>
    <Paper sx={{ overflow: "hidden", position: "relative", minHeight: 360, display: "flex", alignItems: "end", p: { xs: 2.5, md: 4 }, background: "linear-gradient(90deg,#111326 20%,rgba(17,19,38,.64)), #111326" }}>
      <Box component="img" src={game.heroImage ?? game.coverImage} alt="" sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: .38, zIndex: 0 }} />
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5} alignItems={{ sm: "end" }} sx={{ zIndex: 1 }}>
        <Box component="img" src={game.coverImage} alt={game.title} sx={{ width: 120, height: 170, objectFit: "cover", borderRadius: 2, boxShadow: 8 }} />
        <Box><Stack direction="row" alignItems="center" spacing={1}><Chip size="small" color={game.status === "Completed" ? "success" : "primary"} label={game.status} /><Typography variant="body2">{game.releaseYear} · {game.platform}</Typography></Stack><Typography variant="h2" sx={{ mt: 1 }}>{game.title}</Typography><Typography color="text.secondary" sx={{ mt: 1, maxWidth: 650 }}>{game.description}</Typography><Stack direction="row" spacing={1} sx={{ mt: 2 }}>{game.rating && <Chip icon={<StarRounded />} label={`${game.rating}/10`} color="secondary" />}<Chip label={game.genres.join(" · ")} /></Stack></Box>
      </Stack>
      <IconButton aria-label="Toggle favorite" onClick={() => onFavorite(game.id)} sx={{ position: "absolute", top: 16, right: 16, bgcolor: "rgba(10,12,24,.65)" }}>{game.favorite ? <FavoriteRounded color="secondary" /> : <FavoriteBorderRounded />}</IconButton>
    </Paper>
    <Paper variant="outlined" sx={{ mt: 2, p: { xs: 2, md: 3 } }}>
      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}><Tab label="Overview" /><Tab label="Review" /><Tab label="Journal" /></Tabs><Divider sx={{ mb: 2.5 }} />
      {tab === 0 && <Stack spacing={2}><Typography>{game.description}</Typography><Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 1.5 }}><Paper variant="outlined" sx={{ p: 1.5 }}><Typography variant="caption" color="text.secondary">Status</Typography><Typography fontWeight={800}>{game.status}</Typography></Paper><Paper variant="outlined" sx={{ p: 1.5 }}><Typography variant="caption" color="text.secondary">Play plan</Typography><Typography fontWeight={800}>{game.plan}</Typography></Paper><Paper variant="outlined" sx={{ p: 1.5 }}><Typography variant="caption" color="text.secondary">Hours</Typography><Typography fontWeight={800}>{game.hoursPlayed ?? 0}h</Typography></Paper></Box></Stack>}
      {tab === 1 && <Typography color={game.review ? "text.primary" : "text.secondary"}>{game.review ?? "No review yet. Add your thoughts when you are ready."}</Typography>}
      {tab === 2 && <Stack spacing={1.5}>{game.journalEntries.length ? game.journalEntries.map((entry) => <Paper key={entry.id} variant="outlined" sx={{ p: 1.5 }}><Typography variant="caption" color="primary.main">{entry.date}</Typography><Typography sx={{ mt: .5 }}>{entry.text}</Typography></Paper>) : <Typography color="text.secondary">No journal entries yet.</Typography>}</Stack>}
    </Paper>
  </Box>;
}
