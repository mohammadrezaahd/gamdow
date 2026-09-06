"use client";
import { Box, Stack, Typography } from "@mui/material";
import { NorthEastRounded } from "@mui/icons-material";
import { Button } from "@/components/ui";
import { EmptyState, SectionTitle } from "@/components/page-parts";
import { GameGrid } from "@/components/game-grid";
import { GameImage } from "@/components/game-image";
import { archiveTokens as t } from "@/theme/gamdow-theme";
import { InProgressCarousel } from "../components/in-progress-carousel";
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
  const playing = recent.filter((g) => g.status === "Playing");
  const planned = games
    .filter((g) => g.plan === "Up next")
    .sort((a, b) => (a.planOrder ?? 0) - (b.planOrder ?? 0));
  const hours = games.filter((g) => g.hoursPlayed !== undefined);
  const favorites = (id: string) => {
    const g = games.find((g) => g.id === id);
    if (g) saveGame({ ...g, favorite: !g.favorite });
  };
  return (
    <>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{
          justifyContent: "space-between",
          alignItems: { sm: "flex-end" },
          gap: 2,
          mb: 4,
        }}
      >
        <Box>
          <Typography variant="overline" color="text.secondary">
            THE PERSONAL COLLECTION /{" "}
            {data.preferences.displayName.toUpperCase()}
          </Typography>
          <Typography variant="h2" sx={{ mt: 1 }}>
            Never just
            <br />a{" "}
            <Box component="span" sx={{ color: "primary.main" }}>
              game.
            </Box>
          </Typography>
        </Box>
        <Typography
          sx={{
            maxWidth: 240,
            fontSize: 13,
            color: "text.secondary",
            lineHeight: 1.7,
            pb: 0.7,
          }}
        >
          The worlds you got lost in.
          <br />
          The stories that stayed with you.
          <br />
          Keep them all here.
        </Typography>
      </Stack>
      {games.length ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { lg: "minmax(0, 2.4fr) minmax(250px, 1fr)" },
            gap: 3,
            mb: 4,
          }}
        >
          <InProgressCarousel
            games={playing}
            onGame={onGame}
            onLibrary={onLibrary}
          />
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              borderTop: "2px solid",
              borderColor: "primary.main",
              pt: 2,
            }}
          >
            <Stack
              direction="row"
              sx={{
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h5">On the horizon</Typography>
              <Typography variant="overline" color="text.secondary">
                {String(planned.length).padStart(2, "0")} NEXT
              </Typography>
            </Stack>
            {planned.slice(0, 3).map((g, i) => (
              <Box
                key={g.id}
                sx={{
                  display: "flex",
                  gap: 1.5,
                  py: 2,
                  borderBottom: 1,
                  borderColor: "divider",
                  alignItems: "center",
                }}
              >
                <Typography variant="overline" color="text.secondary">
                  0{i + 1}
                </Typography>
                <GameImage
                  src={g.coverImage}
                  sx={{
                    width: 48,
                    height: 65,
                    objectFit: "cover",
                    borderRadius: 0.5,
                  }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Button
                    onClick={() => onGame(g.id)}
                    sx={{
                      p: 0,
                      color: "text.primary",
                      textAlign: "left",
                      justifyContent: "flex-start",
                      fontSize: 13,
                    }}
                  >
                    {g.title}
                  </Button>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 0.5 }}
                  >
                    {g.plannedAt || "When the time is right"}
                  </Typography>
                </Box>
              </Box>
            ))}
            {!planned.length && (
              <Typography color="text.secondary" sx={{ py: 3 }}>
                A little room for your next obsession.
              </Typography>
            )}
            <Button
              endIcon={<NorthEastRounded />}
              onClick={onPlanner}
              sx={{ mt: "auto", alignSelf: "flex-start", px: 0, pt: 3 }}
            >
              Open your planner
            </Button>
          </Box>
        </Box>
      ) : (
        <EmptyState
          title="Start your archive"
          action={
            <Button variant="contained" onClick={onAdd}>
              Add your first game
            </Button>
          }
        />
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4,1fr)" },
          borderTop: 1,
          borderBottom: 1,
          borderColor: "divider",
          my: 4,
        }}
      >
        {[
          [games.length, "IN THE ARCHIVE"],
          [
            games.filter((g) => g.status === "Completed").length,
            "STORIES FINISHED",
          ],
          [
            games.filter((g) => g.status === "Playing").length,
            "CURRENT CHAPTERS",
          ],
          [
            hours.length
              ? `${Math.round(hours.reduce((n, g) => n + g.hoursPlayed!, 0))}h`
              : "—",
            "HOURS WELL SPENT",
          ],
        ].map(([n, label], i) => (
          <Box
            key={label}
            sx={{
              py: 2.5,
              pl: { xs: i % 2 ? 2 : 0, sm: i ? 3 : 0 },
              borderRight: i === 3 ? 0 : 1,
              borderColor: "divider",
            }}
          >
            <Typography
              sx={{
                fontFamily: t.display,
                fontWeight: 700,
                fontSize: 35,
                letterSpacing: "-.06em",
              }}
            >
              {n}
              <Box
                component="span"
                sx={{ color: "primary.main", fontSize: 15, ml: 1 }}
              >
                ↗
              </Box>
            </Typography>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ fontSize: 9 }}
            >
              {label}
            </Typography>
          </Box>
        ))}
      </Box>
      <SectionTitle
        title="Back on the shelf"
        eyebrow="RECENTLY UPDATED /"
        action={
          <Button endIcon={<NorthEastRounded />} onClick={onLibrary}>
            View the archive
          </Button>
        }
      />
      <GameGrid
        games={recent.slice(0, 6)}
        onSelect={(g) => onGame(g.id)}
        onFavorite={favorites}
      />
    </>
  );
}
