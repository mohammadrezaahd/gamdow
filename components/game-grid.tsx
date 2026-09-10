import { Box } from "@mui/material";
import type { Game } from "@/types/game";
import { GameCard } from "./game-card";

type GameGridProps = {
  games: Game[];
  onRemove?: (game: Game) => void;
  onSelect: (game: Game) => void;
  onFavorite: (id: string) => void;
};

export function GameGrid({
  games,
  onSelect,
  onFavorite,
  onRemove,
}: GameGridProps) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "repeat(2,minmax(0,1fr))",
          sm: "repeat(3,minmax(0,1fr))",
          lg: "repeat(auto-fill,minmax(170px,1fr))",
        },
        gap: { xs: 2, md: 2.5 },
      }}
    >
      {games.map((game) => (
        <GameCard
          key={game.id}
          game={game}
          onRemove={onRemove}
          onSelect={onSelect}
          onFavorite={onFavorite}
        />
      ))}
    </Box>
  );
}
