"use client";
import type { ProfileInput } from "@/types/profile";
import { normalizeTags } from "@/lib/tags";
import { Button } from "@/components/ui";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { Alert, Snackbar } from "@mui/material";
import {
  initialLibrary,
  libraryRepository,
} from "@/services/library-repository";
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
  saveCategory: (mutation: TaxonomyMutation) => void;
  deleteCategory: (kind: TaxonomyKind, id: string) => void;
  saveProfile: (input: ProfileInput) => void;
  ready: boolean;
  notify: (message: string) => void;
  reorderGames: (games: Game[]) => void;
  saveGame: (game: Game) => void;
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
export function LibraryProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState(initialLibrary);
  const [ready, setReady] = useState(false);
  const [storageEnabled, setStorageEnabled] = useState(true);
  const [error, setError] = useState("");
  const [message, notify] = useState("");
  useEffect(() => {
    let active = true;
    libraryRepository
      .load()
      .then((value) => {
        if (active) setData(value);
      })
      .catch(() => {
        if (active) {
          setStorageEnabled(false);
          setError(
            "Saved data could not be opened. Your existing storage is preserved; changes are temporary. Export a backup before leaving.",
          );
        }
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!ready || !storageEnabled) return;
    libraryRepository
      .save(data)
      .catch(() =>
        setError(
          "The archive could not be saved on this device. Check available storage and export a backup in Settings.",
        ),
      );
  }, [data, ready, storageEnabled]);
  const value: LibraryContextValue = {
    data,
    ready,
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
      notify("Category saved");
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
      notify("Game saved");
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
      notify("Preferences saved");
    },
    replace: (snapshot) => {
      setData(snapshot);
      setStorageEnabled(true);
      setError("");
      notify("Backup restored");
    },
  };
  return (
    <Context.Provider value={value}>
      {error && (
        <Alert
          severity="warning"
          action={
            <Button color="inherit" onClick={() => setError("")}>
              Dismiss
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      {children}
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
