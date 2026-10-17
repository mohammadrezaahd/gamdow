"use client";
import {
  Button,
  Chip,
  Autocomplete,
  Dialog,
  SortableBoard,
  MenuItem,
  Tab,
  Tabs,
  TextField,
} from "@/components/ui";
import { TaxonomyManager } from "../components/taxonomy-manager";
import { useState } from "react";
import { Box, Card, CardActionArea, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import { ArrowBackRounded } from "@mui/icons-material";
import {
  ConfirmDialog,
  EmptyState,
  SectionTitle,
} from "@/components/page-parts";
import { GameCard } from "@/components/game-card";
import { GameImage } from "@/components/game-image";
import { GameGrid } from "@/components/game-grid";
import { CollectionForm } from "../forms/collection-form";
import { useLibrary } from "../library-context";
import type { Game, GameCollection } from "@/types/game";
export function BrowsePage({ onGame }: { onGame: (id: string) => void }) {
  const { data, saveGame, saveCollection, deleteCollection } = useLibrary();
  const [tab, setTab] = useState(0);
  const [managing, setManaging] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<GameCollection | "new" | null>(null);
  const [focusGames, setFocusGames] = useState(false);
  const [assigningGames, setAssigningGames] = useState(false);
  const [gamesToAssign, setGamesToAssign] = useState<Game[]>([]);
  const [remove, setRemove] = useState(false);
  const [status, setStatus] = useState("All");
  const [sort, setSort] = useState("default");
  const collection =
    tab === 0 ? data.collections.find((c) => c.id === selected) : undefined;
  const groups =
    tab === 0
      ? data.collections.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          ids: c.gameIds,
        }))
      : (tab === 1 ? data.genres : data.series).map((entry) => ({
          id: entry.id,
          name: entry.name,
          description:
            entry.description ||
            (tab === 1
              ? "Explore this genre"
              : "Your journey through the series"),
          ids: data.games
            .filter((game) =>
              tab === 1
                ? game.genreIds?.includes(entry.id)
                : game.seriesId === entry.id,
            )
            .map((game) => game.id),
        }));
  const group = groups.find((g) => g.id === selected);
  const availableGames = group
    ? data.games.filter((game) =>
        tab === 1 ? !game.genreIds?.includes(group.id) : game.seriesId !== group.id,
      )
    : [];
  const games = (group?.ids ?? [])
    .map((id) => data.games.find((g) => g.id === id))
    .filter((g) => g !== undefined)
    .filter((g) => status === "All" || g.status === status)
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : sort === "rating"
          ? (b.rating ?? -1) - (a.rating ?? -1)
          : tab === 2
            ? (a.releaseYear ?? 0) - (b.releaseYear ?? 0)
            : 0,
    );
  return (
    <>
      {selected && (
        <Button
          startIcon={<ArrowBackRounded />}
          onClick={() => setSelected(null)}
          sx={{ mb: 2 }}
        >
          Back to browse
        </Button>
      )}
      <SectionTitle
        title={group?.name ?? "Browse your world"}
        eyebrow="CURATED SHELVES"
        action={
          collection ? (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button variant="contained" disabled={!data.games.length} onClick={() => { setFocusGames(true); setForm(collection); }}>
                Add games
              </Button>
              <Button variant="outlined" onClick={() => { setFocusGames(false); setForm(collection); }}>
                Edit details
              </Button>
              <Button color="error" onClick={() => setRemove(true)}>
                Delete
              </Button>
            </Stack>
          ) : group && tab !== 0 ? (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button variant="contained" disabled={!availableGames.length} onClick={() => { setGamesToAssign([]); setAssigningGames(true); }}>
                Add games
              </Button>
              <Button variant="outlined" onClick={() => setManaging(true)}>
                Manage categories
              </Button>
            </Stack>
          ) : (
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ flexWrap: "wrap" }}
            >
              <Button variant="outlined" onClick={() => setManaging(true)}>
                Manage categories
              </Button>
              <Button variant="contained" onClick={() => { setFocusGames(false); setForm("new"); }}>
                Create collection
              </Button>
            </Stack>
          )
        }
      />
      {!selected && (
        <Tabs
          value={tab}
          onChange={(_, v) => {
            setTab(v);
            setStatus("All");
            setSort("default");
          }}
          sx={{ mb: 3 }}
        >
          <Tab label="Collections" />
          <Tab label="Genres" />
          <Tab label="Series" />
        </Tabs>
      )}
      {group ? (
        <>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {group.description}
          </Typography>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ mb: 2 }}
          >
            <TextField
              select
              size="small"
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              {[
                "All",
                "Not started",
                "Playing",
                "On hold",
                "Completed",
                "Dropped",
              ].map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="default">
                {tab === 2 ? "Release order" : "Collection order"}
              </MenuItem>
              <MenuItem value="title">Title</MenuItem>
              <MenuItem value="rating">Score</MenuItem>
            </TextField>
          </Stack>
          {!games.length ? (
            <EmptyState
              title="No games here yet"
              description={collection
                ? data.games.length ? "Choose Add games to put titles on this shelf." : "Add games to your library first, then choose Add games here."
                : group && tab !== 0 && status === "All"
                  ? availableGames.length ? "Choose Add games to assign titles to this category." : "Every game in your library is already assigned here."
                  : "Adjust your filters to see more games."}
            />
          ) : collection && status === "All" && sort === "default" ? (
            <>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 2 }}
              >
                Drag the grip to arrange your shelf. Space + arrow keys work
                too.
              </Typography>
              <SortableBoard
                layout="grid"
                groups={[
                  {
                    id: `collection-${collection.id}`,
                    title: collection.name,
                    itemIds: collection.gameIds,
                  },
                ]}
                onChange={(groups) =>
                  saveCollection({ ...collection, gameIds: groups[0].itemIds })
                }
                getLabel={(id) =>
                  data.games.find((g) => g.id === id)?.title ?? "game"
                }
                renderItem={(id) => {
                  const game = data.games.find((g) => g.id === id);
                  return game ? (
                    <GameCard
                      game={game}
                      onSelect={(g) => onGame(g.id)}
                      onFavorite={() =>
                        saveGame({ ...game, favorite: !game.favorite })
                      }
                    />
                  ) : null;
                }}
              />
            </>
          ) : (
            <GameGrid
              games={games}
              onSelect={(g) => onGame(g.id)}
              onFavorite={(id) => {
                const g = data.games.find((g) => g.id === id);
                if (g) saveGame({ ...g, favorite: !g.favorite });
              }}
            />
          )}
        </>
      ) : groups.length ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              sm: "repeat(2,minmax(0,1fr))",
              xl: "repeat(3,minmax(0,1fr))",
            },
            gap: 2,
          }}
        >
          {groups.map((g, i) => (
            <Card key={g.id}>
              <CardActionArea
                onClick={() => setSelected(g.id)}
                sx={{
                  p: 3,
                  minHeight: 280,
                  background: "#161c15",
                }}
              >
                <Stack
                  direction="row"
                  sx={{ justifyContent: "space-between", alignItems: "center" }}
                >
                  <Typography variant="overline" color="text.secondary">
                    SHELF / {String(i + 1).padStart(2, "0")}
                  </Typography>
                  <Chip size="small" label={`${g.ids.length} games`} />
                </Stack>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    height: 145,
                    pt: 3,
                    pb: 1,
                  }}
                >
                  {g.ids.slice(0, 3).map((id, index) => (
                    <GameImage
                      key={id}
                      src={
                        data.games.find((game) => game.id === id)?.coverImage
                      }
                      sx={{
                        height: 120,
                        width: 80,
                        objectFit: "cover",
                        borderRadius: 0.5,
                        transform: `rotate(${(index - 1) * 10}deg) translateY(${index === 1 ? -8 : 0}px)`,
                        ml: index ? -1.5 : 0,
                        boxShadow: "0 12px 20px #0009",
                        border: "1px solid #fff2",
                      }}
                    />
                  ))}
                </Box>
                <Typography variant="h5" sx={{ mt: 3 }}>
                  {g.name}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  {g.description}
                </Typography>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      ) : (
        <EmptyState
          title="Your shelves are waiting"
          description="Create a collection or add genres and series to your games."
        />
      )}
      {managing && (
        <TaxonomyManager
          initialKind={tab === 2 ? "series" : "genre"}
          onClose={() => setManaging(false)}
        />
      )}
      {assigningGames && group && tab !== 0 && (
        <Dialog open onClose={() => setAssigningGames(false)} fullWidth maxWidth="sm">
          <DialogTitle>Add games to {group.name}</DialogTitle>
          <DialogContent dividers>
            <Autocomplete
              multiple
              filterSelectedOptions
              options={availableGames}
              value={gamesToAssign}
              getOptionLabel={(game) => game.title}
              onChange={(_, value) => setGamesToAssign(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  autoFocus
                  label="Select games"
                  placeholder="Search your library"
                  helperText={tab === 1
                    ? "Selected titles will be added to this genre."
                    : "A game can belong to one series; adding it here changes its current series."}
                />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAssigningGames(false)}>Cancel</Button>
            <Button
              variant="contained"
              disabled={!gamesToAssign.length}
              onClick={() => {
                for (const game of gamesToAssign) {
                  if (tab === 1)
                    saveGame({ ...game, genres: [...new Set([...game.genres, group.name])] });
                  else saveGame({ ...game, series: group.name });
                }
                setAssigningGames(false);
                setGamesToAssign([]);
              }}
            >
              Add {gamesToAssign.length || "games"}
            </Button>
          </DialogActions>
        </Dialog>
      )}
      {form && (
        <CollectionForm
          collection={form === "new" ? undefined : form}
          focusGames={focusGames}
          onClose={() => { setForm(null); setFocusGames(false); }}
        />
      )}
      {remove && collection && (
        <ConfirmDialog
          title="Delete collection?"
          description="Your games remain in the library."
          onClose={() => setRemove(false)}
          onConfirm={() => {
            deleteCollection(collection.id);
            setRemove(false);
            setSelected(null);
          }}
        />
      )}
    </>
  );
}
