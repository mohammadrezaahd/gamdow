"use client";
import {
  Button,
  Chip,
  SortableBoard,
  MenuItem,
  Tab,
  Tabs,
  TextField,
} from "@/components/ui";
import { useState } from "react";
import { Box, Card, CardActionArea, Stack, Typography } from "@mui/material";
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
import type { GameCollection } from "@/types/game";
export function BrowsePage({ onGame }: { onGame: (id: string) => void }) {
  const { data, saveGame, saveCollection, deleteCollection } = useLibrary();
  const [tab, setTab] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<GameCollection | "new" | null>(null);
  const [remove, setRemove] = useState(false);
  const [status, setStatus] = useState("All");
  const [sort, setSort] = useState("default");
  const collection = data.collections.find((c) => c.id === selected);
  const groups =
    tab === 0
      ? data.collections.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          ids: c.gameIds,
        }))
      : Array.from(
          new Set(
            tab === 1
              ? data.games.flatMap((g) => g.genres)
              : data.games.map((g) => g.series).filter((s): s is string => !!s),
          ),
        ).map((s) => ({
          id: s,
          name: s,
          description:
            tab === 1
              ? "Explore this genre"
              : "Your journey through the series",
          ids: data.games
            .filter((g) => (tab === 1 ? g.genres.includes(s) : g.series === s))
            .map((g) => g.id),
        }));
  const group = groups.find((g) => g.id === selected);
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
            <Stack direction="row">
              <Button onClick={() => setForm(collection)}>
                Edit collection
              </Button>
              <Button color="error" onClick={() => setRemove(true)}>
                Delete
              </Button>
            </Stack>
          ) : (
            <Button variant="contained" onClick={() => setForm("new")}>
              Create collection
            </Button>
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
              description="Edit this collection to choose games, or adjust your filters."
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
            gridTemplateColumns: { sm: "repeat(2,1fr)", xl: "repeat(3,1fr)" },
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
      {form && (
        <CollectionForm
          collection={form === "new" ? undefined : form}
          onClose={() => setForm(null)}
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
