"use client";
import {
  Button,
  Chip,
  IconButton,
  MenuItem,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@/components/ui";
import { useState } from "react";
import { Box, FormControlLabel, Paper, Stack, Typography } from "@mui/material";
import {
  EditRounded,
  GridViewRounded,
  ViewListRounded,
} from "@mui/icons-material";
import type { Game } from "@/types/game";
import { GameGrid } from "@/components/game-grid";
import { GameImage } from "@/components/game-image";
import { EmptyState, SectionTitle } from "@/components/page-parts";
import { statuses } from "@/services/library-repository";
import { useLibrary } from "../library-context";
export interface LibraryFilters {
  status: string;
  genre: string;
  series: string;
  platform: string;
  favorites: boolean;
  minimumRating: string;
  sort: string;
}
export const defaultFilters: LibraryFilters = {
  status: "All",
  genre: "All",
  series: "All",
  platform: "All",
  favorites: false,
  minimumRating: "",
  sort: "updated",
};
export function LibraryPage({
  search,
  onSearch,
  filters,
  onFilters,
  onGame,
  onAdd,
  onEdit,
}: {
  search: string;
  onSearch: (v: string) => void;
  filters: LibraryFilters;
  onFilters: (v: LibraryFilters) => void;
  onGame: (id: string) => void;
  onAdd: () => void;
  onEdit: (game: Game) => void;
}) {
  const { data, saveGame } = useLibrary();
  const [view, setView] = useState(data.preferences.defaultLibraryView);
  const set = (key: keyof LibraryFilters, value: string | boolean) =>
    onFilters({ ...filters, [key]: value });
  const games = data.games
    .filter(
      (g) =>
        g.title.toLowerCase().includes(search.toLowerCase()) &&
        (filters.status === "All" || g.status === filters.status) &&
        (filters.genre === "All" || g.genres.includes(filters.genre)) &&
        (filters.series === "All" || g.series === filters.series) &&
        (filters.platform === "All" || g.platform === filters.platform) &&
        (!filters.favorites || g.favorite) &&
        (!filters.minimumRating ||
          (g.rating !== undefined &&
            g.rating >= Number(filters.minimumRating))),
    )
    .sort((a, b) =>
      filters.sort === "title"
        ? a.title.localeCompare(b.title)
        : filters.sort === "rating"
          ? (b.rating ?? -1) - (a.rating ?? -1)
          : filters.sort === "finished"
            ? (b.completedAt ?? "").localeCompare(a.completedAt ?? "")
            : b.updatedAt.localeCompare(a.updatedAt),
    );
  return (
    <>
      <SectionTitle
        title="Library"
        eyebrow="YOUR COLLECTION"
        action={
          <Button variant="contained" onClick={onAdd}>
            Add a game
          </Button>
        }
      />
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", lg: "repeat(4,1fr)" },
            gap: 2,
          }}
        >
          <TextField
            label="Search library"
            size="small"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            sx={{ gridColumn: "span 2" }}
          />
          <TextField
            size="small"
            select
            label="Status"
            value={filters.status}
            onChange={(e) => set("status", e.target.value)}
          >
            {["All", ...statuses].map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            select
            label="Sort by"
            value={filters.sort}
            onChange={(e) => set("sort", e.target.value)}
          >
            {[
              ["updated", "Recently updated"],
              ["title", "Title"],
              ["rating", "Highest score"],
              ["finished", "Finish date"],
            ].map(([v, l]) => (
              <MenuItem key={v} value={v}>
                {l}
              </MenuItem>
            ))}
          </TextField>
          {(
            [
              [
                "genre",
                Array.from(new Set(data.games.flatMap((g) => g.genres))),
              ],
              [
                "series",
                Array.from(
                  new Set(
                    data.games
                      .map((g) => g.series)
                      .filter((s): s is string => !!s),
                  ),
                ),
              ],
              [
                "platform",
                Array.from(new Set(data.games.map((g) => g.platform))),
              ],
            ] as ["genre" | "series" | "platform", string[]][]
          ).map(([key, options]) => (
            <TextField
              key={key}
              select
              size="small"
              label={key[0].toUpperCase() + key.slice(1)}
              value={filters[key]}
              onChange={(e) => set(key, e.target.value)}
            >
              {["All", ...options].map((v) => (
                <MenuItem key={v} value={v}>
                  {v}
                </MenuItem>
              ))}
            </TextField>
          ))}
          <TextField
            label="Minimum score"
            size="small"
            type="number"
            value={filters.minimumRating}
            onChange={(e) => set("minimumRating", e.target.value)}
            slotProps={{ htmlInput: { min: 0, max: 10, step: 0.5 } }}
          />
        </Box>
        <Stack
          direction="row"
          sx={{
            ...{ mt: 1 },
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <FormControlLabel
            label="Favorites"
            control={
              <Switch
                checked={filters.favorites}
                onChange={(_, v) => set("favorites", v)}
              />
            }
          />
          <Button
            onClick={() => {
              onFilters(defaultFilters);
              onSearch("");
            }}
          >
            Reset filters
          </Button>
        </Stack>
      </Paper>
      <Stack
        direction="row"
        sx={{
          ...{ mb: 2 },
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography color="text.secondary" variant="body2">
          {games.length} games
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={view}
          onChange={(_, v) => v && setView(v)}
          aria-label="Library view"
        >
          <ToggleButton value="grid" aria-label="Grid view">
            <GridViewRounded fontSize="small" />
          </ToggleButton>
          <ToggleButton value="list" aria-label="List view">
            <ViewListRounded fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      {!games.length ? (
        <EmptyState
          title="No games found"
          description="Try a different search or add something new to your library."
          action={<Button onClick={onAdd}>Add a game</Button>}
        />
      ) : view === "grid" ? (
        <GameGrid
          games={games}
          onSelect={(g) => onGame(g.id)}
          onFavorite={(id) => {
            const g = data.games.find((g) => g.id === id);
            if (g) saveGame({ ...g, favorite: !g.favorite });
          }}
        />
      ) : (
        <Stack spacing={1.5}>
          {games.map((g) => (
            <Paper
              key={g.id}
              sx={{ p: 1.5, display: "flex", gap: 2, alignItems: "center" }}
            >
              <GameImage
                src={g.coverImage}
                sx={{
                  width: 45,
                  height: 62,
                  objectFit: "cover",
                  borderRadius: 1,
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Button
                  onClick={() => onGame(g.id)}
                  sx={{
                    p: 0,
                    textAlign: "left",
                    color: "text.primary",
                    justifyContent: "flex-start",
                  }}
                >
                  {g.title}
                </Button>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block" }}
                >
                  {g.platform} · {g.rating ?? "Unrated"}
                  {g.rating !== undefined && "/10"}
                </Typography>
              </Box>
              <Chip
                size="small"
                label={g.status}
                sx={{ display: { xs: "none", sm: "flex" } }}
              />
              <IconButton
                aria-label={`Edit ${g.title}`}
                onClick={() => onEdit(g)}
              >
                <EditRounded />
              </IconButton>
            </Paper>
          ))}
        </Stack>
      )}
    </>
  );
}
