"use client";
import { useRef, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import {
  ArrowBackRounded,
  ArrowForwardRounded,
  NorthEastRounded,
} from "@mui/icons-material";
import { Button, Chip, IconButton } from "@/components/ui";
import { GameImage } from "@/components/game-image";
import { EmptyState } from "@/components/page-parts";
import type { Game } from "@/types/game";

export interface InProgressCarouselProps {
  games: Game[];
  onGame: (id: string) => void;
  onLibrary: () => void;
}
export function InProgressCarousel({
  games,
  onGame,
  onLibrary,
}: InProgressCarouselProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const gesture = useRef<{ x: number; y: number } | null>(null);
  const index = Math.max(
    0,
    games.findIndex((game) => game.id === selectedId),
  );
  const select = (offset: number) => {
    if (games.length)
      setSelectedId(games[(index + offset + games.length) % games.length].id);
  };
  if (!games.length)
    return (
      <EmptyState
        title="Between adventures."
        description="Mark a game as Playing and your current stories will appear here."
        action={<Button onClick={onLibrary}>Find your next game</Button>}
      />
    );
  return (
    <Box
      component="section"
      role="region"
      aria-roledescription="carousel"
      aria-label="Games in progress"
      tabIndex={games.length > 1 ? 0 : undefined}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "ArrowRight") {
          event.preventDefault();
          select(1);
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          select(-1);
        }
      }}
      sx={{
        minWidth: 0,
        outlineOffset: 5,
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "primary.main",
        },
      }}
    >
      <Box sx={{ pt: games.length > 1 ? 3 : 0, pr: games.length > 1 ? 2 : 0 }}>
        <Box
          onPointerDown={(event) => {
            if (
              event.pointerType === "mouse" ||
              (event.target as HTMLElement).closest("button")
            )
              return;
            gesture.current = { x: event.clientX, y: event.clientY };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerUp={(event) => {
            const start = gesture.current;
            gesture.current = null;
            if (
              start &&
              Math.abs(event.clientX - start.x) > 50 &&
              Math.abs(event.clientY - start.y) < 70
            )
              select(event.clientX < start.x ? 1 : -1);
          }}
          onPointerCancel={() => {
            gesture.current = null;
          }}
          sx={{
            position: "relative",
            height: { xs: 390, sm: 410 },
            touchAction: "pan-y",
          }}
        >
          {games.map((game, i) => {
            const depth = (i - index + games.length) % games.length;
            const front = depth === 0;
            return (
              <Box
                key={game.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${games.length}: ${game.title}`}
                aria-hidden={!front}
                sx={{
                  position: "absolute",
                  inset: 0,
                  zIndex: games.length - depth,
                  visibility: depth < 3 ? "visible" : "hidden",
                  pointerEvents: front ? "auto" : "none",
                  overflow: "hidden",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: front ? "#dcebc839" : "#d3fc7245",
                  background: "#162016",
                  boxShadow: front ? "0 20px 40px #0005" : "0 4px 16px #0005",
                  transformOrigin: "center top",
                  transform: `translate(${depth * 7}px, ${depth * -11}px) scale(${1 - Math.min(depth, 3) * 0.025}) rotate(${depth * 1.2}deg)`,
                  transition:
                    "transform .45s cubic-bezier(.22,.8,.3,1), border-color .3s",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  p: { xs: 2.5, md: 3.5 },
                }}
              >
                <GameImage
                  src={game.heroImage || game.coverImage}
                  sx={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center 35%",
                  }}
                />
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    background: front
                      ? "linear-gradient(0deg,#0b100bf5 2%,#0b100b80 45%,#0b100b30)"
                      : "#0b100b70",
                  }}
                />
                {front && (
                  <>
                    <Stack
                      direction="row"
                      sx={{
                        position: "relative",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Chip
                        label="● IN PROGRESS"
                        sx={{
                          bgcolor: "#111311b3",
                          backdropFilter: "blur(14px)",
                          color: "primary.main",
                          borderColor: "#d3fc7233",
                          px: 1,
                        }}
                      />
                      <Typography
                        variant="overline"
                        sx={{ color: "#fff9", whiteSpace: "nowrap" }}
                      >
                        CHAPTER / {String(i + 1).padStart(2, "0")}
                      </Typography>
                    </Stack>
                    <Box sx={{ position: "relative" }}>
                      <Typography
                        variant="overline"
                        sx={{ color: "#d8dec5", mb: 1, display: "block" }}
                      >
                        {game.platform} · {game.genres[0] || "Unsorted"}
                        {game.hoursPlayed !== undefined
                          ? ` · ${game.hoursPlayed} HOURS`
                          : ""}
                      </Typography>
                      <Typography
                        variant="h3"
                        sx={{
                          maxWidth: 500,
                          fontSize: { xs: 37, md: 52 },
                          color: "#fff",
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {game.title}
                      </Typography>
                      <Button
                        variant="contained"
                        endIcon={<NorthEastRounded />}
                        sx={{ mt: 3 }}
                        onClick={() => onGame(game.id)}
                      >
                        Continue the story
                      </Button>
                    </Box>
                  </>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
      {games.length > 1 && (
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            mt: 2,
            gap: 1,
          }}
        >
          <Stack
            direction="row"
            sx={{ alignItems: "center", flexWrap: "wrap", minWidth: 0 }}
          >
            {games.map((game, i) => (
              <IconButton
                key={game.id}
                size="small"
                aria-label={`Show ${game.title}`}
                aria-pressed={i === index}
                onClick={() => setSelectedId(game.id)}
                sx={{ width: 30, height: 32 }}
              >
                <Box
                  sx={{
                    width: i === index ? 22 : 7,
                    height: 4,
                    borderRadius: 2,
                    bgcolor: i === index ? "primary.main" : "#c7d9b43b",
                    transition: "width .2s",
                  }}
                />
              </IconButton>
            ))}
          </Stack>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", flexShrink: 0 }}
          >
            <Typography variant="overline" color="text.secondary">
              {String(index + 1).padStart(2, "0")} /{" "}
              {String(games.length).padStart(2, "0")}
            </Typography>
            <IconButton
              aria-label="Previous in-progress game"
              onClick={() => select(-1)}
              sx={{ border: 1, borderColor: "divider" }}
            >
              <ArrowBackRounded fontSize="small" />
            </IconButton>
            <IconButton
              aria-label="Next in-progress game"
              onClick={() => select(1)}
              sx={{ border: 1, borderColor: "divider" }}
            >
              <ArrowForwardRounded fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      )}
      <Box
        aria-live="polite"
        aria-atomic="true"
        sx={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clipPath: "inset(50%)",
        }}
      >
        {games[index].title}, {index + 1} of {games.length}
      </Box>
    </Box>
  );
}
