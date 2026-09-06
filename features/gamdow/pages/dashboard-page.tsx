import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { ArrowForwardRounded, PlayArrowRounded } from "@mui/icons-material";
import { EmptyState, Metric, SectionTitle } from "@/components/page-parts";
import { GameGrid } from "@/components/game-grid";
import { GameImage } from "@/components/game-image";
import { useLibrary } from "../library-context";
export function DashboardPage({
  onGame,
  onLibrary,
  onPlanner,
  onAdd,
}: {
  onGame: (id: string) => void;
  onLibrary: () => void;
  onPlanner: () => void;
  onAdd: () => void;
}) {
  const { data, saveGame } = useLibrary();
  const games = data.games;
  const recent = [...games].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
  const hero = recent.find((g) => g.status === "Playing") ?? recent[0];
  const hours = games.filter((g) => g.hoursPlayed !== undefined);
  const toggle = (id: string) => {
    const game = games.find((g) => g.id === id);
    if (game) saveGame({ ...game, favorite: !game.favorite });
  };
  return (
    <>
      <SectionTitle
        eyebrow="YOUR PERSONAL GAME SPACE"
        title={`Welcome back, ${data.preferences.displayName}.`}
        action={
          <Button variant="contained" onClick={onAdd}>
            Add a game
          </Button>
        }
      />
      {hero ? (
        <Paper
          sx={{
            position: "relative",
            overflow: "hidden",
            p: { xs: 3, md: 5 },
            mb: 3,
            minHeight: { xs: 300, md: 350 },
            display: "flex",
            alignItems: "center",
            background: "linear-gradient(110deg, #193d32cc, #152a3099)",
          }}
        >
          <GameImage
            src={hero.heroImage || hero.coverImage}
            sx={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center 35%",
              opacity: 0.4,
              maskImage: "linear-gradient(90deg, transparent, black)",
            }}
          />
          <Box sx={{ position: "relative", maxWidth: 650 }}>
            <Typography
              variant="overline"
              color="primary.main"
              sx={{ letterSpacing: ".16em" }}
            >
              {hero.status === "Playing"
                ? "CONTINUE YOUR JOURNEY"
                : "FROM YOUR LIBRARY"}
            </Typography>
            <Typography variant="h2" sx={{ mt: 1 }}>
              {hero.title}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 470 }}>
              {hero.hoursPlayed !== undefined
                ? `${hero.hoursPlayed} hours in. `
                : ""}
              {hero.description || "Your next story starts here."}
            </Typography>
            <Stack
              direction="row"
              spacing={1.5}
              useFlexGap
              sx={{ mt: 3, flexWrap: "wrap" }}
            >
              <Button
                variant="contained"
                startIcon={<PlayArrowRounded />}
                onClick={() => onGame(hero.id)}
              >
                Open game
              </Button>
              <Button variant="outlined" onClick={onPlanner}>
                View planner
              </Button>
            </Stack>
          </Box>
        </Paper>
      ) : (
        <EmptyState
          title="Every game starts a story"
          action={<Button onClick={onAdd}>Add your first game</Button>}
        />
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", lg: "repeat(4,1fr)" },
          gap: 2,
          my: 3,
        }}
      >
        <Metric value={games.length} label="Games in library" />
        <Metric
          value={games.filter((g) => g.status === "Completed").length}
          label="Completed"
        />
        <Metric
          value={games.filter((g) => g.status === "Playing").length}
          label="Playing now"
        />
        <Metric
          value={
            hours.length
              ? `${hours.reduce((n, g) => n + g.hoursPlayed!, 0).toFixed(1)}h`
              : "—"
          }
          label="Recorded playtime"
        />
      </Box>
      <SectionTitle
        title="Recently updated"
        action={
          <Button endIcon={<ArrowForwardRounded />} onClick={onLibrary}>
            Your library
          </Button>
        }
      />
      <GameGrid
        games={recent.slice(0, 6)}
        onSelect={(g) => onGame(g.id)}
        onFavorite={toggle}
      />
      <Box sx={{ mt: 4 }}>
        <SectionTitle
          title="Your next chapter"
          action={<Button onClick={onPlanner}>Edit your plan</Button>}
        />
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          {games
            .filter((g) => g.plan === "Up next")
            .sort((a, b) => (a.planOrder ?? 0) - (b.planOrder ?? 0))
            .slice(0, 3)
            .map((g) => (
              <Paper key={g.id} sx={{ p: 2, flex: 1 }}>
                <Button
                  onClick={() => onGame(g.id)}
                  sx={{ p: 0, color: "text.primary" }}
                >
                  {g.title}
                </Button>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  {g.planNote || g.genres.join(" · ")}
                </Typography>
              </Paper>
            ))}
        </Stack>
        {!games.some((g) => g.plan === "Up next") && (
          <Typography color="text.secondary">
            No next game picked yet. Your planner is ready when you are.
          </Typography>
        )}
      </Box>
    </>
  );
}
