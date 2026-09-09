"use client";
import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { SearchRounded } from "@mui/icons-material";
import { Button, Chip, TextField } from "@/components/ui";
import { GameImage } from "@/components/game-image";
import { steamRepository } from "@/services/steam-repository";
import type { SteamSearchResult } from "@/types/steam";
import { useLibrary } from "../library-context";
export function SteamPicker({
  onAdded,
  manualGameId,
}: {
  onAdded: () => void;
  manualGameId?: string;
}) {
  const { data, hasUnsavedChanges, runServerOperation, notify } = useLibrary();
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [result, setResult] = useState<SteamSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    if (query.trim().length < 2) {
      setResult(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      steamRepository
        .search(query.trim(), offset, abort.signal)
        .then((value) => {
          if (!abort.signal.aborted) setResult(value);
        })
        .catch((e) => {
          if (!abort.signal.aborted)
            setError(e instanceof Error ? e.message : "Search failed.");
        })
        .finally(() => {
          if (!abort.signal.aborted) setLoading(false);
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [query, offset, attempt]);
  return (
    <Stack spacing={2}>
      <Typography color="text.secondary">
        {manualGameId
          ? "Link this entry to Steam. Your review, tags, status, gallery and notes stay with it. Original manual metadata is retained for unlinking."
          : "Find a game in the Steam catalog, or add your own game manually."}
      </Typography>
      <TextField
        autoFocus
        fullWidth
        label="Game name or Steam App ID"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOffset(0);
          setResult(null);
        }}
        slotProps={{
          input: {
            startAdornment: (
              <SearchRounded sx={{ mr: 1, color: "text.secondary" }} />
            ),
          },
        }}
      />
      {hasUnsavedChanges && (
        <Alert severity="info">
          Waiting for your archive changes to finish saving.
        </Alert>
      )}
      {loading && (
        <Stack direction="row" spacing={1} role="status">
          <CircularProgress size={20} />
          <Typography>Searching Steam…</Typography>
        </Stack>
      )}
      {error && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" onClick={() => setAttempt((v) => v + 1)}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      {!loading && result?.warning && (
        <Alert severity="info">{result.warning}</Alert>
      )}
      {!loading && result && !result.items.length && (
        <Typography color="text.secondary">
          No matching games. Try another name or an App ID; manual games are
          always available.
        </Typography>
      )}
      {!result && !loading && !error && (
        <Box sx={{ py: 5, textAlign: "center" }}>
          <Typography variant="h5">Your next story starts here</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Search the catalog by title or App ID.
          </Typography>
        </Box>
      )}
      {!loading &&
        result?.items.map((item) => {
          const existing = data.games.some(
            (g) => g.steamAppId === item.steamAppId,
          );
          return (
            <Paper key={item.steamAppId} variant="outlined" sx={{ p: 1.5 }}>
              <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                <GameImage
                  src={item.image}
                  alt={item.name}
                  sx={{
                    width: { xs: 76, sm: 120 },
                    height: 65,
                    objectFit: "cover",
                    borderRadius: 1,
                  }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600 }}>{item.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    STEAM / {item.steamAppId}
                    {item.releaseYear ? ` · ${item.releaseYear}` : ""}
                  </Typography>
                </Box>
                {existing ? (
                  <Chip size="small" label="In library" />
                ) : (
                  <Button
                    variant="outlined"
                    disabled={hasUnsavedChanges}
                    onClick={async () => {
                      setError("");
                      try {
                        await runServerOperation(
                          (revision) =>
                            steamRepository.add(
                              item.steamAppId,
                              revision,
                              manualGameId,
                            ),
                          manualGameId
                            ? "Linking to Steam…"
                            : "Adding Steam game…",
                        );
                        notify(
                          manualGameId
                            ? "Game linked to Steam"
                            : "Steam game added",
                        );
                        onAdded();
                      } catch (e) {
                        setError(
                          e instanceof Error
                            ? e.message
                            : "Could not add this game.",
                        );
                      }
                    }}
                  >
                    {manualGameId ? "Link" : "Add"}
                  </Button>
                )}
              </Stack>
            </Paper>
          );
        })}
      {result && (offset > 0 || result.hasMore) && (
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Button
            disabled={!offset || loading}
            onClick={() => setOffset((v) => Math.max(0, v - 20))}
          >
            Previous
          </Button>
          <Button
            disabled={!result.hasMore || loading}
            onClick={() => setOffset((v) => v + 20)}
          >
            Next results
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
