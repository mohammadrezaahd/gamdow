"use client";
import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  ArrowDownwardRounded,
  ArrowUpwardRounded,
  EditRounded,
} from "@mui/icons-material";
import { SectionTitle } from "@/components/page-parts";
import type { Game, PlayPlan } from "@/types/game";
import { plans } from "@/services/library-repository";
import { today, useLibrary } from "../library-context";
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
  const groups: PlayPlan[] = ["Up next", "Soon", "Someday", "Not interested"];
  const reorder = (game: Game, offset: number) => {
    const list = data.games
      .filter((g) => g.plan === game.plan)
      .sort((a, b) => (a.planOrder ?? 0) - (b.planOrder ?? 0));
    const i = list.findIndex((g) => g.id === game.id);
    const next = i + offset;
    if (!list[next]) return;
    [list[i], list[next]] = [list[next], list[i]];
    const order = new Map(list.map((g, i) => [g.id, i]));
    reorderGames(
      data.games.map((g) =>
        order.has(g.id) ? { ...g, planOrder: order.get(g.id) } : g,
      ),
    );
  };
  return (
    <>
      <SectionTitle
        title="Play planner"
        eyebrow="ONE MORE ADVENTURE"
        action={
          <Button variant="contained" onClick={() => setPicker(true)}>
            Plan a game
          </Button>
        }
      />
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        A place for your next chapter. Move games between groups and choose when
        to begin.
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { lg: "repeat(3,minmax(0,1fr))" },
          gap: 2,
        }}
      >
        {groups.map((plan) => {
          const list = data.games
            .filter((g) => g.plan === plan)
            .sort((a, b) => (a.planOrder ?? 0) - (b.planOrder ?? 0));
          return (
            <Paper
              key={plan}
              sx={{
                p: 2,
                gridColumn: plan === "Not interested" ? "1 / -1" : undefined,
              }}
            >
              <Typography variant="h5">
                {plan}{" "}
                <Typography component="span" color="text.secondary">
                  · {list.length}
                </Typography>
              </Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                {!list.length && (
                  <Typography
                    color="text.secondary"
                    variant="body2"
                    sx={{ py: 3 }}
                  >
                    No games in this group.
                  </Typography>
                )}
                {list.map((g, i) => (
                  <Paper key={g.id} sx={{ p: 2 }}>
                    <Button
                      onClick={() => onGame(g.id)}
                      sx={{ p: 0, color: "text.primary", textAlign: "left" }}
                    >
                      {g.title}
                    </Button>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block" }}
                    >
                      {g.status}
                      {g.plannedAt ? ` · ${g.plannedAt}` : ""}
                    </Typography>
                    {g.planNote && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {g.planNote}
                      </Typography>
                    )}
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Move to"
                      value={g.plan}
                      onChange={(e) =>
                        saveGame({
                          ...g,
                          plan: e.target.value as PlayPlan,
                          planOrder: Date.now(),
                        })
                      }
                      sx={{ mt: 2 }}
                    >
                      {plans.map((p) => (
                        <MenuItem key={p} value={p}>
                          {p === "None" ? "Remove from planner" : p}
                        </MenuItem>
                      ))}
                    </TextField>
                    <Stack
                      direction="row"
                      sx={{ ...{ mt: 1 }, justifyContent: "space-between" }}
                    >
                      <Button
                        size="small"
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
                      <Stack direction="row">
                        <IconButton
                          size="small"
                          aria-label={`Edit plan for ${g.title}`}
                          onClick={() => setEditing(g)}
                        >
                          <EditRounded fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          aria-label={`Move ${g.title} up`}
                          disabled={i === 0}
                          onClick={() => reorder(g, -1)}
                        >
                          <ArrowUpwardRounded fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          aria-label={`Move ${g.title} down`}
                          disabled={i === list.length - 1}
                          onClick={() => reorder(g, 1)}
                        >
                          <ArrowDownwardRounded fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Paper>
          );
        })}
      </Box>
      <Dialog
        open={picker}
        onClose={() => setPicker(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Choose a game to plan</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
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
            Add a new game instead
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPicker(false)}>Cancel</Button>
          <Button
            disabled={!id}
            onClick={() => {
              const game = data.games.find((g) => g.id === id);
              if (game)
                setEditing({
                  ...game,
                  plan: game.plan === "None" ? "Up next" : game.plan,
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
            <DialogTitle>Plan · {editing.title}</DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2}>
                <TextField
                  select
                  label="Group"
                  value={editing.plan}
                  onChange={(e) =>
                    setEditing({ ...editing, plan: e.target.value as PlayPlan })
                  }
                >
                  {plans.map((p) => (
                    <MenuItem key={p} value={p}>
                      {p}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  type="date"
                  label="Planned start"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={editing.plannedAt ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, plannedAt: e.target.value })
                  }
                />
                <TextField
                  label="Planning note"
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
