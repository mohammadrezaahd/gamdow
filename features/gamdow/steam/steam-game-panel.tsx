"use client";
import { OfficialImages } from "../storage/official-images";
import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { Button, Chip, Dialog } from "@/components/ui";
import { ConfirmDialog } from "@/components/page-parts";
import { GameImage } from "@/components/game-image";
import type { Game } from "@/types/game";
import type { SteamGameDetails, SteamMetadata } from "@/types/steam";
import { steamRepository } from "@/services/steam-repository";
import { useLibrary } from "../library-context";
import { SteamPicker } from "./steam-picker";
export function SteamGamePanel({
  game,
  onMetadata,
}: {
  game: Game;
  onMetadata: (metadata: SteamMetadata) => void;
}) {
  const { runServerOperation, hasUnsavedChanges, notify } = useLibrary();
  const [details, setDetails] = useState<SteamGameDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [retry, setRetry] = useState(0);
  const [visibleCount, setVisibleCount] = useState(40);
  const [showHidden, setShowHidden] = useState(false);
  useEffect(() => {
    let active = true;
    if (!game.steamAppId) {
      setDetails(null);
      return;
    }
    setDetails(null);
    setLoading(true);
    setError("");
    steamRepository
      .details(game.steamAppId, retry > 0)
      .then((result) => {
        if (active) {
          setDetails(result);
          if (result.metadata) onMetadata(result.metadata);
        }
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "Could not load Steam data.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [game.steamAppId, retry, onMetadata]);
  useEffect(() => {
    const update = () => setRetry((n) => n + 1);
    window.addEventListener("gamdow:steam-updated", update);
    return () => window.removeEventListener("gamdow:steam-updated", update);
  }, []);
  if (!game.steamAppId)
    return (
      <Paper variant="outlined" sx={{ p: 3, mt: 3 }}>
        <Stack spacing={2}>
          <Chip
            label="MANUAL GAME"
            size="small"
            sx={{ alignSelf: "flex-start" }}
          />
          <Typography variant="h5">Your game, your details</Typography>
          <Typography color="text.secondary">
            This entry is fully editable. Link it to Steam to use official
            metadata while keeping your personal history.
          </Typography>
          <Button
            variant="outlined"
            disabled={hasUnsavedChanges}
            sx={{ alignSelf: "flex-start" }}
            onClick={() => setLinking(true)}
          >
            Find on Steam
          </Button>
        </Stack>
        {linking && (
          <Dialog
            open
            fullWidth
            maxWidth="md"
            onClose={() => setLinking(false)}
          >
            <DialogTitle>Link {game.title}</DialogTitle>
            <DialogContent>
              <SteamPicker
                manualGameId={game.id}
                onAdded={() => setLinking(false)}
              />
              <Button sx={{ mt: 2 }} onClick={() => setLinking(false)}>
                Close
              </Button>
            </DialogContent>
          </Dialog>
        )}
      </Paper>
    );
  const a = details?.achievements;
  const m = details?.metadata;
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mt: 3 }}>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ justifyContent: "space-between" }}
        >
          <Box>
            <Typography variant="overline" color="primary.main">
              STEAM / {game.steamAppId}
            </Typography>
            <Typography variant="h5">Beyond your play journal</Typography>
          </Box>
          <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 1 }}>
            {details?.ownership?.state === "owned" && (
              <Button
                component="a"
                variant="contained"
                href={`steam://run/${game.steamAppId}`}
              >
                Play in Steam
              </Button>
            )}
            <Button
              component="a"
              href={`https://store.steampowered.com/app/${game.steamAppId}/`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {details?.ownership?.state === "not_owned" && m && !m.isFree
                ? "Purchase on Steam ↗"
                : "Steam store ↗"}
            </Button>
            <Button
              disabled={loading || hasUnsavedChanges}
              onClick={async () => {
                setLoading(true);
                setError("");
                try {
                  const result = await runServerOperation(
                    () => steamRepository.details(game.steamAppId!, true),
                    "Refreshing Steam metadata and achievements…",
                  );
                  setDetails(result);
                  if (result.metadata) onMetadata(result.metadata);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Refresh failed.");
                } finally {
                  setLoading(false);
                }
              }}
            >
              Refresh
            </Button>
          </Stack>
        </Stack>
        {details?.ownership?.state === "owned" && (
          <Typography variant="caption" color="text.secondary">
            Opens the Steam app on this device. Steam must be installed and
            signed in to the account that owns this game.
          </Typography>
        )}
        {details?.ownership?.state === "not_owned" && (
          <Typography variant="caption" color="text.secondary">
            This game was not found in your connected account’s latest Steam
            library. Purchases are completed on Steam.
          </Typography>
        )}
        {loading && (
          <Stack direction="row" spacing={1} role="status">
            <CircularProgress size={20} />
            <Typography>Loading Steam data…</Typography>
          </Stack>
        )}
        {error && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" onClick={() => setRetry((v) => v + 1)}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}
        {details?.warning && (
          <Alert severity="warning">{details.warning}</Alert>
        )}
        {details?.metadataStale && (
          <Alert severity="info">
            Showing cached Steam metadata. The latest refresh was unavailable.
          </Alert>
        )}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(3,minmax(0,1fr))" },
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="overline" color="text.secondary">
              MANUAL GAME PROGRESS
            </Typography>
            <Typography variant="h4">
              {game.manualProgress === undefined
                ? "Not set"
                : `${game.manualProgress}%`}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Your estimate · editable in Edit game
            </Typography>
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary">
              STEAM PLAYTIME
            </Typography>
            <Typography variant="h4">
              {details?.playtime?.totalMinutes === undefined
                ? "Unavailable"
                : `${(details.playtime.totalMinutes / 60).toFixed(1)} h`}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {details?.playtime?.recentMinutes === undefined
                ? "Sync your library in Profile"
                : `${(details.playtime.recentMinutes / 60).toFixed(1)} h in the last two weeks`}
            </Typography>
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary">
              ACHIEVEMENTS
            </Typography>
            <Typography variant="h4">
              {a?.state === "available" ? `${a.percentage}%` : "—"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {a?.state === "available"
                ? `${a.unlocked} / ${a.total} unlocked`
                : "Separate from story progress"}
            </Typography>
          </Box>
        </Box>
        {m && (
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              {[
                m.developers.join(", "),
                m.publishers.length
                  ? `Published by ${m.publishers.join(", ")}`
                  : "",
                m.release.date,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Typography>
            <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 1 }}>
              {Object.entries(m.platforms)
                .filter(([, supported]) => supported)
                .map(([platform]) => (
                  <Chip key={platform} size="small" label={platform} />
                ))}
              {m.metacritic && (
                <Chip size="small" label={`Metacritic ${m.metacritic.score}`} />
              )}
              {m.categories.map((c) => (
                <Chip size="small" key={c.id} label={c.name} />
              ))}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Metadata synced · {new Date(m.steamLastSyncAt).toLocaleString()}
            </Typography>
          </Stack>
        )}
        {details?.playtime?.lastSyncAt && (
          <Typography variant="caption" color="text.secondary">
            Playtime synced ·{" "}
            {new Date(details.playtime.lastSyncAt).toLocaleString()}
          </Typography>
        )}
        {a?.message && (
          <Alert severity={a.state === "private" ? "warning" : "info"}>
            {a.message}
          </Alert>
        )}
        {a?.state === "available" && (
          <Box>
            <Stack
              direction="row"
              sx={{ justifyContent: "space-between", mb: 1 }}
            >
              <Typography variant="h6">
                {a.unlocked} / {a.total} Achievements
              </Typography>
              <Typography color="primary.main">{a.percentage}%</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={a.percentage ?? 0} />
            {a.lastSyncAt && (
              <Typography variant="caption" color="text.secondary">
                {a.stale ? "Cached result" : "Last synced"} ·{" "}
                {new Date(a.lastSyncAt).toLocaleString()}
              </Typography>
            )}
            <Button
              size="small"
              sx={{ display: "block", mt: 1 }}
              onClick={() => setShowHidden((v) => !v)}
            >
              {showHidden
                ? "Hide secret achievement details"
                : "Reveal secret achievement details"}
            </Button>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "minmax(0,1fr) minmax(0,1fr)",
                },
                gap: 1,
                mt: 2,
              }}
            >
              {a.items.slice(0, visibleCount).map((item) => {
                const hidden = item.hidden && !item.unlocked && !showHidden;
                return (
                  <Stack
                    key={item.apiName}
                    direction="row"
                    spacing={2}
                    sx={{
                      p: 1.5,
                      border: "1px solid",
                      borderColor: item.unlocked ? "#d3fc7230" : "divider",
                      borderRadius: 2,
                      alignItems: "center",
                      opacity: item.unlocked ? 1 : 0.7,
                    }}
                  >
                    <GameImage
                      src={item.unlocked ? item.icon : item.iconLocked}
                      sx={{ width: 48, height: 48, borderRadius: 1 }}
                    />
                    <Box>
                      <Typography sx={{ fontWeight: 600 }}>
                        {hidden ? "Secret achievement" : item.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {hidden
                          ? "Unlock to reveal its story."
                          : item.description}
                      </Typography>
                      {item.unlockedAt && (
                        <Typography variant="caption" color="primary.main">
                          Unlocked{" "}
                          {new Date(item.unlockedAt).toLocaleDateString()}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                );
              })}
            </Box>
            {a.items.length > visibleCount && (
              <Button
                sx={{ mt: 2 }}
                onClick={() => setVisibleCount((v) => v + 40)}
              >
                Show more achievements
              </Button>
            )}
          </Box>
        )}
        {m && <OfficialImages game={game} metadata={m} />}
        <Button
          size="small"
          sx={{ alignSelf: "flex-start" }}
          disabled={hasUnsavedChanges || loading}
          onClick={() => setUnlinking(true)}
        >
          Unlink and make manual
        </Button>
      </Stack>
      {unlinking && (
        <ConfirmDialog
          title="Make this game manual?"
          description="Your personal data stays. Original manual metadata will be restored if this entry was linked; otherwise Steam artwork is removed and you can upload your own."
          onClose={() => setUnlinking(false)}
          onConfirm={async () => {
            setUnlinking(false);
            try {
              await runServerOperation(
                (revision) => steamRepository.unlink(game.id, revision),
                "Restoring manual game…",
              );
              notify("Game is now manual");
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Could not unlink this game.",
              );
            }
          }}
        />
      )}
    </Paper>
  );
}
