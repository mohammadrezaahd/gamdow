import { Box, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import { EmptyState, Metric, SectionTitle } from "@/components/page-parts";
import { statuses } from "@/services/library-repository";
import { useLibrary } from "../library-context";
export function StatisticsPage() {
  const { data } = useLibrary();
  const games = data.games;
  const rated = games.filter((g) => g.rating !== undefined);
  const tracked = games.filter((g) => g.hoursPlayed !== undefined);
  const year = String(new Date().getFullYear());
  const finished = games.filter(
    (g) => g.status === "Completed" && g.completedAt?.startsWith(year),
  );
  const genres = Array.from(new Set(games.flatMap((g) => g.genres)))
    .map((name) => ({
      name,
      count: games.filter((g) => g.genres.includes(name)).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  return (
    <>
      <SectionTitle title="Statistics" eyebrow="THE STORIES ADD UP" />
      {!games.length ? (
        <EmptyState
          title="Your story is just beginning"
          description="Add games to see your play history."
        />
      ) : (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "minmax(0,1fr) minmax(0,1fr)",
                lg: "repeat(4,minmax(0,1fr))",
              },
              gap: 2,
              mb: 3,
            }}
          >
            <Metric
              value={
                rated.length
                  ? (
                      rated.reduce((n, g) => n + g.rating!, 0) / rated.length
                    ).toFixed(1)
                  : "—"
              }
              label={`Average · ${rated.length} rated games`}
            />
            <Metric
              value={games.filter((g) => g.favorite).length}
              label="Favorites"
            />
            <Metric
              value={finished.length}
              label={`Finished in ${year} · dated entries`}
            />
            <Metric
              value={
                tracked.length
                  ? `${tracked.reduce((n, g) => n + g.hoursPlayed!, 0).toFixed(1)}h`
                  : "—"
              }
              label={`Tracked · ${tracked.length} games`}
            />
          </Box>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { lg: "minmax(0,1fr) minmax(0,1fr)" },
              gap: 3,
            }}
          >
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5">Status breakdown</Typography>
              <Stack spacing={2.5} sx={{ mt: 3 }}>
                {statuses.map((s) => {
                  const count = games.filter((g) => g.status === s).length;
                  return (
                    <Box key={s}>
                      <Stack
                        direction="row"
                        sx={{ justifyContent: "space-between" }}
                      >
                        <Typography variant="body2">{s}</Typography>
                        <Typography variant="body2">{count}</Typography>
                      </Stack>
                      <LinearProgress
                        aria-label={`${s}: ${count} games`}
                        variant="determinate"
                        value={(count / games.length) * 100}
                        sx={{ mt: 1, height: 7, borderRadius: 5 }}
                      />
                    </Box>
                  );
                })}
              </Stack>
            </Paper>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5">Most explored genres</Typography>
              <Stack spacing={2.5} sx={{ mt: 3 }}>
                {genres.map((g) => (
                  <Box key={g.name}>
                    <Stack
                      direction="row"
                      sx={{ justifyContent: "space-between" }}
                    >
                      <Typography variant="body2">{g.name}</Typography>
                      <Typography variant="body2">{g.count}</Typography>
                    </Stack>
                    <LinearProgress
                      aria-label={`${g.name}: ${g.count} games`}
                      color="secondary"
                      variant="determinate"
                      value={(g.count / games.length) * 100}
                      sx={{ mt: 1, height: 7, borderRadius: 5 }}
                    />
                  </Box>
                ))}
              </Stack>
            </Paper>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5">Your highest scores</Typography>
              <Stack spacing={2} sx={{ mt: 3 }}>
                {[...rated]
                  .sort((a, b) => b.rating! - a.rating!)
                  .slice(0, 5)
                  .map((g) => (
                    <Stack
                      key={g.id}
                      direction="row"
                      spacing={2}
                      sx={{ justifyContent: "space-between" }}
                    >
                      <Typography>{g.title}</Typography>
                      <Typography color="primary.main">
                        {g.rating}/10
                      </Typography>
                    </Stack>
                  ))}
                {!rated.length && (
                  <Typography color="text.secondary">
                    No scores recorded yet.
                  </Typography>
                )}
              </Stack>
            </Paper>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5">Completions · {year}</Typography>
              <Typography variant="caption" color="text.secondary">
                Only games with a recorded finish date are included.
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(3,minmax(0,1fr))",
                    sm: "repeat(4,minmax(0,1fr))",
                  },
                  gap: 2,
                  mt: 3,
                }}
              >
                {Array.from({ length: 12 }, (_, i) => {
                  const month = `${year}-${String(i + 1).padStart(2, "0")}`;
                  const count = finished.filter((g) =>
                    g.completedAt?.startsWith(month),
                  ).length;
                  return (
                    <Box key={month}>
                      <Typography
                        color={count ? "primary.main" : "text.secondary"}
                        sx={{ fontWeight: 700 }}
                      >
                        {count}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(2020, i, 1).toLocaleDateString("en", {
                          month: "short",
                        })}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Paper>
          </Box>
        </>
      )}
    </>
  );
}
