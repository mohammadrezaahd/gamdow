"use client";
import { useState } from "react";
import {
  Box,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  EditRounded,
  NorthEastRounded,
  PlayArrowRounded,
} from "@mui/icons-material";
import {
  Button,
  DateField,
  Dialog,
  IconButton,
  MenuItem,
  SortableBoard,
  TextField,
} from "@/components/ui";
import { SectionTitle } from "@/components/page-parts";
import { GameImage } from "@/components/game-image";
import type { Game, PlayPlan } from "@/types/game";
import { plans } from "@/services/library-repository";
import { today, useLibrary } from "../library-context";
import type { OrderGroup } from "@/lib/order";
export function PlannerPage({
  onGame,
  onAdd,
}: {
  onGame: (id: string) => void;
  onAdd: () => void;
}) {
  const { data, saveGame, reorderGames } = useLibrary();
  const [editing, setEditing] = useState<Game | null>(null);
  const [picker, setPicker] = useState(false);
  const [id, setId] = useState("");
  const categories: PlayPlan[] = [
    "Up next",
    "Soon",
    "Someday",
    "Not interested",
  ];
  const groups: OrderGroup[] = categories.map((plan, i) => ({
    id: `plan-${i}`,
    title: plan,
    description: [
      "Your next chapter.",
      "Keep these close.",
      "No rush. It'll be here.",
      "It's fine to pass.",
    ][i],
    itemIds: data.games
      .filter((g) => g.plan === plan)
      .sort((a, b) => (a.planOrder ?? 0) - (b.planOrder ?? 0))
      .map((g) => g.id),
  }));
  const update = (groups: OrderGroup[]) => {
    const positions = new Map(
      groups.flatMap((group) =>
        group.itemIds.map(
          (id, order) =>
            [id, { plan: group.title as PlayPlan, planOrder: order }] as const,
        ),
      ),
    );
    reorderGames(
      data.games.map((g) =>
        positions.has(g.id) ? { ...g, ...positions.get(g.id) } : g,
      ),
    );
  };
  return (
    <>
      <SectionTitle
        title="The next chapter."
        eyebrow="PLAY PLANNER /"
        action={
          <Button
            variant="contained"
            endIcon={<NorthEastRounded />}
            onClick={() => setPicker(true)}
          >
            Plan a game
          </Button>
        }
      />
      <Typography color="text.secondary" sx={{ mb: 3, fontSize: 13 }}>
        Pick up the grip to move a game between shelves or change its order. On
        a keyboard, press Space, then use the arrow keys.
      </Typography>
      <SortableBoard
        groups={groups}
        onChange={update}
        getLabel={(id) => data.games.find((g) => g.id === id)?.title ?? "game"}
        renderItem={(id) => {
          const g = data.games.find((g) => g.id === id);
          if (!g) return null;
          return (
            <Paper
              sx={{
                overflow: "hidden",
                background: "#1b211a",
                borderRadius: 2,
              }}
            >
              <GameImage
                src={g.heroImage || g.coverImage}
                sx={{
                  width: "100%",
                  height: 135,
                  objectFit: "cover",
                  objectPosition: "center 25%",
                  display: "block",
                }}
              />
              <Box sx={{ p: 2 }}>
                <Typography variant="overline" color="text.secondary">
                  {g.platform} / {g.status}
                </Typography>
                <Button
                  onClick={() => onGame(g.id)}
                  sx={{
                    display: "block",
                    p: 0,
                    mt: 0.5,
                    color: "text.primary",
                    fontFamily: "Space Grotesk",
                    fontSize: 16,
                    textAlign: "left",
                  }}
                >
                  {g.title}
                </Button>
                {g.plannedAt && (
                  <Typography
                    variant="caption"
                    color="primary.main"
                    sx={{ display: "block", mt: 1 }}
                  >
                    {g.plannedAt}
                  </Typography>
                )}
                {g.planNote && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1, fontSize: 12 }}
                  >
                    {g.planNote}
                  </Typography>
                )}
                <Stack
                  direction="row"
                  sx={{
                    justifyContent: "space-between",
                    mt: 2,
                    pt: 1,
                    borderTop: 1,
                    borderColor: "divider",
                  }}
                >
                  <Button
                    size="small"
                    startIcon={<PlayArrowRounded />}
                    disabled={g.status === "Playing"}
                    onClick={() =>
                      saveGame({
                        ...g,
                        status: "Playing",
                        startedAt: today(),
                        completedAt: undefined,
                        plan: "None",
                        plannedAt: undefined,
                      })
                    }
                  >
                    Start playing
                  </Button>
                  <IconButton
                    size="small"
                    aria-label={`Edit plan for ${g.title}`}
                    onClick={() => setEditing(g)}
                  >
                    <EditRounded fontSize="small" />
                  </IconButton>
                </Stack>
              </Box>
            </Paper>
          );
        }}
      />
      <Dialog
        open={picker}
        onClose={() => setPicker(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Choose your next story</DialogTitle>
        <DialogContent>
          <TextField
            select
            label="Game"
            value={id}
            onChange={(e) => setId(e.target.value)}
            sx={{ mt: 1 }}
          >
            {data.games.map((g) => (
              <MenuItem key={g.id} value={g.id}>
                {g.title}
              </MenuItem>
            ))}
          </TextField>
          <Button
            onClick={() => {
              setPicker(false);
              onAdd();
            }}
            sx={{ mt: 2 }}
          >
            Add a new game
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPicker(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!id}
            onClick={() => {
              const g = data.games.find((g) => g.id === id);
              if (g)
                setEditing({
                  ...g,
                  plan: g.plan === "None" ? "Up next" : g.plan,
                });
              setPicker(false);
            }}
          >
            Continue
          </Button>
        </DialogActions>
      </Dialog>
      {editing && (
        <Dialog open onClose={() => setEditing(null)} fullWidth maxWidth="sm">
          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              saveGame(editing);
              setEditing(null);
            }}
          >
            <DialogTitle>Plan / {editing.title}</DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2.5}>
                <TextField
                  select
                  label="Shelf"
                  value={editing.plan}
                  onChange={(e) =>
                    setEditing({ ...editing, plan: e.target.value as PlayPlan })
                  }
                >
                  {plans.map((p) => (
                    <MenuItem key={p} value={p}>
                      {p === "None" ? "Remove from planner" : p}
                    </MenuItem>
                  ))}
                </TextField>
                <DateField
                  label="Planned start"
                  value={editing.plannedAt ?? ""}
                  onValueChange={(v) =>
                    setEditing({ ...editing, plannedAt: v })
                  }
                />
                <TextField
                  label="A note to your future self"
                  multiline
                  minRows={3}
                  value={editing.planNote ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, planNote: e.target.value })
                  }
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" variant="contained">
                Save plan
              </Button>
            </DialogActions>
          </Box>
        </Dialog>
      )}
    </>
  );
}
