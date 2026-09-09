"use client";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import {
  Autocomplete,
  Button,
  Checkbox,
  Chip,
  Dialog,
  MenuItem,
  TextField,
} from "@/components/ui";
import { GameImage } from "@/components/game-image";
import { steamRepository } from "@/services/steam-repository";
import type {
  SteamConnection,
  SteamImportSelection,
  SteamLibraryFilter,
  SteamLibraryItem,
  SteamLibraryPage,
} from "@/types/steam";
import { useLibrary } from "../library-context";
import { pendingSteamJob, useSteamSync } from "./use-steam-sync";
import { SteamSyncSummary } from "./steam-sync-result";

export function SteamLibraryImport({ onClose }: { onClose: () => void }) {
  const { data, hasUnsavedChanges, runServerOperation, notify } = useLibrary();
  const sync = useSteamSync();
  const [connection, setConnection] = useState<SteamConnection>();
  const [page, setPage] = useState<SteamLibraryPage>();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SteamLibraryFilter>("all");
  const [offset, setOffset] = useState(0);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [allMatching, setAllMatching] = useState(false);
  const [ids, setIds] = useState<Set<number>>(new Set()); // selected IDs, or exclusions in all-matching mode
  const [linking, setLinking] = useState<SteamLibraryItem>();
  const [manualId, setManualId] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const signature = useRef("");
  const refreshRequested = useRef(false);
  const activeJob = pendingSteamJob(sync.job);
  const disabled = loading || sync.busy || linkBusy || hasUnsavedChanges;
  const manualGames = data.games.filter((g) => g.source !== "STEAM");
  function clearSelection() {
    setIds(new Set());
    setAllMatching(false);
  }
  useEffect(() => {
    let live = true;
    steamRepository
      .connection()
      .then((c) => {
        if (live) {
          setConnection(c);
          sync.setJob(c.sync);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (live) {
          setError(
            e instanceof Error
              ? e.message
              : "Steam connection could not be loaded.",
          );
          setLoading(false);
        }
      });
    return () => {
      live = false;
    };
  }, []); // The connection is re-established on returning from Steam to Profile.
  useEffect(() => {
    if (!connection?.connected) return;
    const abort = new AbortController();
    setLoading(true);
    setError("");
    const timer = setTimeout(async () => {
      const refresh = refreshRequested.current;
      refreshRequested.current = false;
      try {
        const result = await steamRepository.library(
          query.trim(),
          filter,
          offset,
          refresh,
          AbortSignal.any([abort.signal, AbortSignal.timeout(60000)]),
        );
        if (abort.signal.aborted) return;
        const nextSignature = `${result.snapshotId}:${result.revision}`;
        if (signature.current && signature.current !== nextSignature)
          clearSelection();
        signature.current = nextSignature;
        setPage(result);
      } catch (e) {
        if (!abort.signal.aborted) {
          setPage(undefined);
          setError(
            e instanceof Error
              ? e.message
              : "Steam library could not be loaded.",
          );
        }
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [connection?.connected, query, filter, offset, reload]);
  function reloadPage(refresh = false) {
    refreshRequested.current = refresh;
    clearSelection();
    setReload((n) => n + 1);
  }
  const selectedCount = allMatching
    ? Math.max(0, (page?.matching ?? 0) - ids.size)
    : ids.size;
  function toggle(id: number) {
    setIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  async function importGames(all = false) {
    if (!page) return;
    setConfirmAll(false);
    const selection: SteamImportSelection = all
      ? { kind: "all", query: "", filter: "all", excludedAppIds: [] }
      : allMatching
        ? { kind: "all", query: query.trim(), filter, excludedAppIds: [...ids] }
        : { kind: "selected", appIds: [...ids] };
    await sync.run({
      mode: "import",
      requestId: crypto.randomUUID(),
      snapshotId: page.snapshotId,
      revision: page.revision,
      selection,
    });
    reloadPage();
  }
  async function linkManual() {
    if (!linking || !manualId) return;
    setLinkBusy(true);
    setError("");
    try {
      await runServerOperation(
        (revision) =>
          steamRepository.add(linking.steamAppId, revision, manualId),
        "Linking your manual game to Steam…",
      );
      setLinking(undefined);
      setManualId("");
      notify("Game linked. Your personal data is preserved.");
      reloadPage();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not link this game.");
    } finally {
      setLinkBusy(false);
    }
  }
  return (
    <Dialog
      open
      onClose={sync.busy || linkBusy ? undefined : onClose}
      fullWidth
      maxWidth="md"
      aria-labelledby="steam-import-title"
    >
      <DialogTitle id="steam-import-title">
        <Typography
          component="span"
          variant="overline"
          color="primary.main"
          sx={{ display: "block" }}
        >
          YOUR CONNECTED ARCHIVE
        </Typography>
        Steam Library
        <Typography variant="body2" color="text.secondary">
          Choose what belongs in gamdow. Your Steam story progress is never
          guessed.
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && (
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  onClick={() =>
                    connection ? reloadPage() : window.location.reload()
                  }
                >
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          )}
          {sync.error && (
            <Alert severity="error" onClose={() => sync.setError("")}>
              {sync.error} Successful steps are saved.
            </Alert>
          )}
          {connection && !connection.connected && (
            <Alert
              severity="info"
              action={
                <Button
                  component="a"
                  href="/?page=profile"
                  disabled={hasUnsavedChanges}
                  onClick={onClose}
                >
                  Open Profile
                </Button>
              }
            >
              {connection.configured
                ? "Connect securely by signing in through Steam in Profile. You do not need to enter a Steam ID."
                : "Steam is not configured on this server yet. Manual games remain available."}
            </Alert>
          )}
          {sync.job && <SteamSyncSummary job={sync.job} busy={sync.busy} />}
          {activeJob && (
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                disabled={disabled}
                onClick={async () => {
                  await sync.run();
                  reloadPage();
                }}
              >
                Resume saved job
              </Button>
              <Button disabled={sync.busy || linkBusy} onClick={sync.cancel}>
                Cancel remaining steps
              </Button>
            </Stack>
          )}
          {connection?.connected && (
            <>
              <Stack
                direction="row"
                sx={{
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Box>
                  <Typography variant="h6">
                    {page
                      ? `${page.total.toLocaleString()} games found`
                      : "Your owned games"}
                  </Typography>
                  {page && (
                    <Typography variant="caption" color="text.secondary">
                      Library fetched{" "}
                      {new Date(page.fetchedAt).toLocaleString()}
                    </Typography>
                  )}
                </Box>
                <Button disabled={disabled} onClick={() => reloadPage(true)}>
                  Refresh from Steam
                </Button>
              </Stack>
              {page?.stale && (
                <Alert severity="info">
                  Showing your saved Steam library. Refresh to check new
                  purchases or privacy changes. Refresh requests are cached for
                  five minutes.
                </Alert>
              )}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <TextField
                  fullWidth
                  label="Search your Steam library"
                  value={query}
                  slotProps={{ htmlInput: { maxLength: 100 } }}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setOffset(0);
                    clearSelection();
                  }}
                />
                <TextField
                  select
                  label="Show"
                  value={filter}
                  sx={{ minWidth: 200 }}
                  onChange={(e) => {
                    setFilter(e.target.value as SteamLibraryFilter);
                    setOffset(0);
                    clearSelection();
                  }}
                >
                  <MenuItem value="all">All games</MenuItem>
                  <MenuItem value="new">Not imported</MenuItem>
                  <MenuItem value="imported">Already imported</MenuItem>
                </TextField>
              </Stack>
              <Stack
                direction="row"
                useFlexGap
                sx={{ flexWrap: "wrap", alignItems: "center", gap: 1 }}
              >
                <Button
                  disabled={disabled || activeJob || !page?.matching}
                  onClick={() => {
                    setAllMatching(true);
                    setIds(new Set());
                  }}
                >
                  Select all {page?.matching ?? 0} matches
                </Button>
                <Button disabled={disabled} onClick={clearSelection}>
                  Select none
                </Button>
                <Chip label={`${selectedCount} selected`} size="small" />
              </Stack>
              {loading && (
                <Box role="status">
                  <CircularProgress
                    size={24}
                    aria-label="Loading Steam library"
                  />
                </Box>
              )}
              {!loading && page && !page.items.length && (
                <Alert severity="info">
                  {page.total
                    ? "No games match these filters. Try another search or show all games."
                    : "Steam returned an empty public library. You can still add games manually."}
                </Alert>
              )}
              {!loading && page && (
                <Stack spacing={1}>
                  {page.items.map((game) => (
                    <Box
                      key={game.steamAppId}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: { xs: 1, sm: 2 },
                        p: 1.25,
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 2,
                        bgcolor: "background.paper",
                      }}
                    >
                      <Checkbox
                        checked={
                          allMatching
                            ? !ids.has(game.steamAppId)
                            : ids.has(game.steamAppId)
                        }
                        disabled={disabled || activeJob}
                        onChange={() => toggle(game.steamAppId)}
                        slotProps={{
                          input: { "aria-label": `Select ${game.name}` },
                        }}
                      />
                      <GameImage
                        src={game.image}
                        alt=""
                        sx={{
                          width: { xs: 42, sm: 80 },
                          height: 48,
                          objectFit: "cover",
                          borderRadius: 1,
                        }}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{ overflowWrap: "anywhere" }}
                        >
                          {game.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {game.totalMinutes === undefined
                            ? "Playtime unavailable"
                            : `${(game.totalMinutes / 60).toFixed(1)} h played`}{" "}
                          · App {game.steamAppId}
                        </Typography>
                        <Box>
                          <Chip
                            size="small"
                            label={
                              game.imported
                                ? "In your collection"
                                : "Not imported"
                            }
                            color={game.imported ? "primary" : "default"}
                          />
                        </Box>
                        {!game.imported && manualGames.length > 0 && (
                          <Button
                            size="small"
                            disabled={disabled || activeJob}
                            onClick={() => {
                              setLinking(game);
                              setManualId("");
                            }}
                          >
                            Link an existing manual game
                          </Button>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
              {page && (
                <Stack
                  direction="row"
                  sx={{ justifyContent: "space-between", alignItems: "center" }}
                >
                  <Button
                    disabled={disabled || offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - 40))}
                  >
                    Previous
                  </Button>
                  <Typography variant="caption">
                    {page.matching
                      ? `${page.offset + 1}–${Math.min(page.offset + 40, page.matching)} of ${page.matching}`
                      : "0 matches"}
                  </Typography>
                  <Button
                    disabled={disabled || !page.hasMore}
                    onClick={() => setOffset(offset + 40)}
                  >
                    Next
                  </Button>
                </Stack>
              )}
              <Typography variant="caption" color="text.secondary">
                Import keeps existing games and personal data. New games get
                Steam metadata; achievements update in a separate, resumable
                stage. Profile and Game Details must be public. No name-based
                auto-linking.
              </Typography>
            </>
          )}
          {hasUnsavedChanges && (
            <Alert severity="info">
              Waiting for your current edits to save…
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
        <Button onClick={onClose} disabled={sync.busy || linkBusy}>
          Close
        </Button>
        <Button
          variant="outlined"
          disabled={disabled || activeJob || !page?.total}
          onClick={() => setConfirmAll(true)}
        >
          Import all {page?.total ?? ""}
        </Button>
        <Button
          variant="contained"
          disabled={disabled || activeJob || !selectedCount || !page}
          onClick={() => importGames()}
        >
          Import selected ({selectedCount})
        </Button>
      </DialogActions>
      <Dialog
        open={confirmAll}
        onClose={() => setConfirmAll(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Import your entire Steam library?</DialogTitle>
        <DialogContent>
          All {page?.total} owned games will be considered, including games
          outside the current filter. Existing entries are updated without
          duplicates; non-game apps are excluded.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmAll(false)}>Cancel</Button>
          <Button
            disabled={disabled || activeJob}
            variant="contained"
            onClick={() => importGames(true)}
          >
            Import all
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={!!linking}
        onClose={linkBusy ? undefined : () => setLinking(undefined)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Link to {linking?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info">
              Choose the exact manual entry. Steam replaces public metadata;
              your score, review, notes, dates, progress, tags, galleries and
              collections stay. Original manual metadata is kept for unlinking.
            </Alert>
            <Autocomplete
              options={manualGames}
              value={manualGames.find((g) => g.id === manualId) ?? null}
              getOptionLabel={(g) => g.title}
              getOptionKey={(g) => g.id}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              onChange={(_, game) => setManualId(game?.id ?? "")}
              renderInput={(params) => (
                <TextField {...params} label="Manual game to link" />
              )}
            />
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={linkBusy} onClick={() => setLinking(undefined)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={linkBusy || !manualId || hasUnsavedChanges}
            onClick={linkManual}
          >
            {linkBusy ? "Linking…" : "Confirm link"}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
