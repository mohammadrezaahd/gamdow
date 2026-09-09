"use client";
import { Box, CardActionArea, Stack, Typography } from "@mui/material";
import {
  FavoriteBorderRounded,
  FavoriteRounded,
  NorthEastRounded,
} from "@mui/icons-material";
import { Chip, IconButton } from "@/components/ui";
import { GameImage } from "./game-image";
import { archiveTokens as t } from "@/theme/gamdow-theme";
import type { Game } from "@/types/game";
export function GameCard({
  game,
  onSelect,
  onFavorite,
}: {
  game: Game;
  onSelect: (game: Game) => void;
  onFavorite: (id: string) => void;
}) {
  return (
    <Box
      sx={{
        position: "relative",
        minWidth: 0,
        "&:hover .archive-cover": {
          transform: "translateY(-5px)",
          boxShadow: "0 18px 35px #0008",
        },
        "&:hover .archive-open": { opacity: 1, transform: "translate(0,0)" },
      }}
    >
      <CardActionArea
        onClick={() => onSelect(game)}
        sx={{ borderRadius: 1, overflow: "visible" }}
      >
        <Box
          className="archive-cover"
          sx={{
            position: "relative",
            aspectRatio: "2 / 3",
            overflow: "hidden",
            borderRadius: "7px 7px 2px 2px",
            bgcolor: "background.paper",
            border: "1px solid #fff2",
            transition: "transform .25s, box-shadow .25s",
          }}
        >
          <GameImage
            src={game.coverImage}
            alt={game.title}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, #0003, transparent 40%, #0009)",
            }}
          />
          {game.source === "STEAM" && (
            <Chip
              label="Steam"
              size="small"
              sx={{
                position: "absolute",
                top: 10,
                left: 10,
                background: "#111311c9",
                color: "#eeeee5",
                fontSize: 9,
              }}
            />
          )}
          <Chip
            label={game.status}
            size="small"
            sx={{
              position: "absolute",
              bottom: 12,
              left: 10,
              color: "#eeeee5",
              background: "#111311c9",
              backdropFilter: "blur(12px)",
              fontSize: 9,
            }}
          />
          {game.rating !== undefined && (
            <Box
              sx={{
                position: "absolute",
                right: 0,
                bottom: 0,
                bgcolor: "primary.main",
                color: "primary.contrastText",
                p: "7px 10px",
                fontFamily: t.display,
                fontWeight: 700,
                fontSize: 18,
                borderRadius: "8px 0 0 0",
              }}
            >
              {game.rating.toFixed(1)}
            </Box>
          )}
          <Box
            className="archive-open"
            sx={{
              position: "absolute",
              right: 12,
              top: 58,
              color: "primary.main",
              opacity: 0,
              transform: "translate(-4px,4px)",
              transition: "all .2s",
            }}
          >
            <NorthEastRounded />
          </Box>
        </Box>
        <Box sx={{ pt: 1.5, pb: 0.5 }}>
          <Typography
            sx={{
              fontFamily: t.display,
              fontSize: { xs: 13, md: 15 },
              fontWeight: 700,
              letterSpacing: "-.02em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {game.title}
          </Typography>
          <Stack
            direction="row"
            sx={{ justifyContent: "space-between", mt: 0.7, gap: 1 }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              sx={{ fontSize: 10 }}
            >
              {game.genres[0] || "Unsorted"}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontFamily: t.mono, whiteSpace: "nowrap", fontSize: 9 }}
            >
              {game.platform || "—"} / {game.releaseYear || "—"}
            </Typography>
          </Stack>
        </Box>
      </CardActionArea>
      <IconButton
        aria-label={`Favorite ${game.title}`}
        aria-pressed={game.favorite}
        onClick={() => onFavorite(game.id)}
        size="small"
        sx={{
          position: "absolute",
          right: 8,
          top: 8,
          background: "#11131188",
          backdropFilter: "blur(14px)",
          color: game.favorite ? "primary.main" : "#fff9",
        }}
      >
        {game.favorite ? (
          <FavoriteRounded sx={{ fontSize: 16 }} />
        ) : (
          <FavoriteBorderRounded sx={{ fontSize: 16 }} />
        )}
      </IconButton>
    </Box>
  );
}
