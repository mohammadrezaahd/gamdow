"use client";

import FavoriteBorderRounded from "@mui/icons-material/FavoriteBorderRounded";
import FavoriteRounded from "@mui/icons-material/FavoriteRounded";
import StarRounded from "@mui/icons-material/StarRounded";
import { Box, Card, CardActionArea, Chip, IconButton, Stack, Typography } from "@mui/material";
import type { Game } from "@/types/game";

type GameCardProps = {
  game: Game;
  onSelect: (game: Game) => void;
  onFavorite: (id: string) => void;
};

export function GameCard({ game, onSelect, onFavorite }: GameCardProps) {
  return (
    <Card sx={{ overflow: "hidden", position: "relative", minHeight: 286 }}>
      <CardActionArea onClick={() => onSelect(game)} sx={{ height: "100%", alignItems: "stretch" }}>
        <Box sx={{ height: 212, position: "relative", overflow: "hidden", bgcolor: "background.paper" }}>
          <Box component="img" src={game.coverUrl} alt={game.title} sx={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform .25s", ".MuiCardActionArea-root:hover &": { transform: "scale(1.04)" } }} />
          <Chip label={game.status.replace("-", " ")} size="small" sx={{ position: "absolute", top: 10, left: 10, bgcolor: "rgba(12,16,29,.82)", textTransform: "capitalize" }} />
        </Box>
        <Stack spacing={0.5} sx={{ p: 1.5, alignItems: "flex-start" }}>
          <Typography fontWeight={800} noWrap width="100%">{game.title}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>{game.genres.slice(0, 2).join(" · ")}</Typography>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <StarRounded color="warning" fontSize="small" />
            <Typography variant="body2" fontWeight={800}>{game.rating ? game.rating.toFixed(1) : "Unrated"}</Typography>
            <Typography variant="caption" color="text.secondary">· {game.platforms[0]}</Typography>
          </Stack>
        </Stack>
      </CardActionArea>
      <IconButton aria-label="Toggle favorite" onClick={() => onFavorite(game.id)} sx={{ position: "absolute", top: 6, right: 6, bgcolor: "rgba(12,16,29,.82)", "&:hover": { bgcolor: "rgba(12,16,29,.96)" } }}>
        {game.favorite ? <FavoriteRounded color="secondary" fontSize="small" /> : <FavoriteBorderRounded fontSize="small" />}
      </IconButton>
    </Card>
  );
}
