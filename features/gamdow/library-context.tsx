"use client";
import { adjustPlaytime, MAX_PLAYTIME_HOURS } from "@/lib/playtime";
import type { ProfileInput } from "@/types/profile";
import { normalizeTags } from "@/lib/tags";
import { Button } from "@/components/ui";
import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
} from "react";
import {
  Alert,
  Snackbar,
  Stack,
  Typography,
  Dialog,
  DialogContent,
  CircularProgress,
} from "@mui/material";
import type { LibraryResponse } from "@/types/api";
import type { RunServerOperation } from "./use-cloud-library";
import { useCloudLibrary } from "./use-cloud-library";
import type {
  Game,
  GameCollection,
  GalleryItem,
  LibrarySnapshot,
  UserPreferences,
} from "@/types/game";
import {
  normalizeTaxonomies,
  saveTaxonomy,
  deleteTaxonomy,
} from "@/lib/taxonomy";
import type { TaxonomyMutation, TaxonomyKind } from "@/types/taxonomy";
export const newId = () => crypto.randomUUID();
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
interface LibraryContextValue {
  data: LibrarySnapshot;
  runServerOperation: RunServerOperation;
  saveCategory: (mutation: TaxonomyMutation) => void;
  deleteCategory: (kind: TaxonomyKind, id: string) => void;
  saveProfile: (input: ProfileInput) => void;
  ready: boolean;
  hasUnsavedChanges: boolean;
  notify: (message: string) => void;
  reorderGames: (games: Game[]) => void;
  saveGame: (game: Game) => void;
  adjustGamePlaytime: (id: string, deltaMinutes: number) => void;
  deleteGame: (id: string) => void;
  saveCollection: (collection: GameCollection) => void;
  deleteCollection: (id: string) => void;
  savePhotos: (photos: GalleryItem[]) => void;
  deletePhoto: (id: string) => void;
  savePreferences: (preferences: UserPreferences) => void;
  replace: (data: LibrarySnapshot) => void;
}
const Context = createContext<LibraryContextValue | null>(null);
const upsert = <T extends { id: string }>(items: T[], value: T): T[] =>
  items.some((i) => i.id === value.id)
    ? items.map((i) => (i.id === value.id ? value : i))
    : [value, ...items];
export function LibraryProvider({
  children,
  initial,
}: PropsWithChildren<{ initial: LibraryResponse }>) {
  const {
    data,
    setData,
    dirty,
    status,
    error,
    code,
    retry,
    runServerOperation,
    externalMessage,
    cancelExternal,
  } = useCloudLibrary(initial);
  const ready = true;
  const [message, notify] = useState("");
  const value: LibraryContextValue = {
    data,
    ready,
    runServerOperation,
    hasUnsavedChanges: dirty,
    saveProfile: (input) => {
      const displayName = input.displayName.trim();
      if (!displayName) throw new Error("A display name is required.");
      setData((d) => ({
        ...d,
        profile: {
          ...d.profile,
          ...input,
          displayName,
          username: input.username.trim(),
          bio: input.bio.trim(),
          location: input.location.trim(),
          favoritePlatforms: normalizeTags(input.favoritePlatforms),
          updatedAt: new Date().toISOString(),
        },
        preferences: { ...d.preferences, displayName },
      }));
      notify("Profile updated");
    },
    notify,
    saveCategory: (mutation) => {
      setData(saveTaxonomy(data, mutation, newId(), new Date().toISOString()));
      notify("Category updated");
    },
    deleteCategory: (kind, id) => {
      setData((current) => deleteTaxonomy(current, kind, id));
      notify("Category removed");
    },
    reorderGames: (games) => {
      setData((d) => ({ ...d, games }));
      notify("Plan order updated");
    },
    saveGame: (game) => {
      setData((d) =>
        normalizeTaxonomies({
          ...d,
          games: upsert(d.games, {
            ...game,
            tags: normalizeTags(game.tags),
            updatedAt: new Date().toISOString(),
          }),
        }),
      );
      notify("Game updated");
    },
    adjustGamePlaytime: (id, deltaMinutes) => {
      setData((current) => ({
        ...current,
        games: current.games.map((game) => {
          if (game.id !== id) return game;
          const nextMinutes =
            Math.round((game.hoursPlayed ?? 0) * 60) + deltaMinutes;
          if (nextMinutes < 0 || nextMinutes > MAX_PLAYTIME_HOURS * 60)
            return game;
          return {
            ...game,
            hoursPlayed: adjustPlaytime(game.hoursPlayed, deltaMinutes),
            updatedAt: new Date().toISOString(),
          };
        }),
      }));
      notify("Recorded playtime updated");
    },
    deleteGame: (id) => {
      setData((d) => ({
        ...d,
        games: d.games.filter((g) => g.id !== id),
        collections: d.collections.map((c) => ({
          ...c,
          gameIds: c.gameIds.filter((g) => g !== id),
        })),
        gallery: d.gallery.filter((p) => p.gameId !== id),
      }));
      notify("Game removed");
    },
    saveCollection: (collection) => {
      setData((d) => ({
        ...d,
        collections: upsert(d.collections, collection),
      }));
      notify("Collection saved");
    },
    deleteCollection: (id) => {
      setData((d) => ({
        ...d,
        collections: d.collections.filter((c) => c.id !== id),
      }));
      notify("Collection removed");
    },
    savePhotos: (photos) => {
      setData((d) => ({
        ...d,
        gallery: photos.reduce((items, p) => upsert(items, p), d.gallery),
      }));
      notify("Gallery updated");
    },
    deletePhoto: (id) => {
      setData((d) => ({ ...d, gallery: d.gallery.filter((p) => p.id !== id) }));
      notify("Screenshot removed");
    },
    savePreferences: (preferences) => {
      setData((d) => ({
        ...d,
        preferences,
        profile: { ...d.profile, displayName: preferences.displayName },
      }));
      notify("Preferences updated");
    },
    replace: (snapshot) => {
      setData({
        ...snapshot,
        profile: {
          ...snapshot.profile,
          id: data.profile.id,
          createdAt: data.profile.createdAt,
        },
      });

      notify("Backup restored");
    },
  };
  return (
    <Context.Provider value={value}>
      <Stack
        role="status"
        direction="row"
        sx={{ px: 3, py: 1, justifyContent: "flex-end" }}
      >
        <Typography
          variant="caption"
          color={error ? "error.main" : "text.secondary"}
        >
          {status === "saved"
            ? "All changes saved"
            : status === "saving"
              ? "Saving changes…"
              : "Changes not saved"}
        </Typography>
      </Stack>
      {error && (
        <Alert
          severity="error"
          action={
            <Stack direction="row" spacing={1}>
              {code !== "REVISION_CONFLICT" && code !== "ACCOUNT_CHANGED" && (
                <Button color="inherit" onClick={retry}>
                  Retry
                </Button>
              )}
              {code === "UNAUTHENTICATED" && (
                <Button
                  component="a"
                  href="/login"
                  target="_blank"
                  rel="noopener"
                  color="inherit"
                >
                  Log in
                </Button>
              )}
              <Button
                color="inherit"
                onClick={() => {
                  if (
                    window.confirm(
                      "Reload the server version? Pending changes will be lost. Export them in Settings first.",
                    )
                  )
                    window.location.reload();
                }}
              >
                Reload
              </Button>
            </Stack>
          }
        >
          {error} Pending changes can be exported in Settings.
        </Alert>
      )}
      {children}
      <Dialog open={!!externalMessage} aria-labelledby="steam-operation-title">
        <DialogContent>
          <Stack spacing={2} sx={{ alignItems: "center", p: 2 }}>
            <CircularProgress size={32} />
            <Typography id="steam-operation-title" role="status">
              {externalMessage}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your saved notes and game progress stay unchanged.
            </Typography>
            <Button onClick={cancelExternal}>Pause after this step</Button>
          </Stack>
        </DialogContent>
      </Dialog>
      <Snackbar
        open={!!message}
        autoHideDuration={2600}
        onClose={() => notify("")}
        message={message}
        sx={{ bottom: { xs: "105px !important", md: "24px !important" } }}
      />
    </Context.Provider>
  );
}
export function useLibrary() {
  const value = useContext(Context);
  if (!value) throw new Error("LibraryProvider is missing");
  return value;
}
