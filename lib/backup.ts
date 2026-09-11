import { z } from "zod";
import { parseLibrary, mediaReferences } from "./library-schema";
import type { LibrarySnapshot } from "@/types/game";
import type { BackupManifest } from "@/types/backup";
import { gameActivityEventSchema } from "./game-activity-schema";
export const backupManifestSchema = z
  .object({
    format: z.literal("gamdow-archive"),
    version: z.literal(1),
    library: z
      .object({
        games: z.array(z.unknown()),
        collections: z.array(z.unknown()),
        genres: z.array(z.unknown()),
        series: z.array(z.unknown()),
        gallery: z.array(z.unknown()),
      })
      .strict(),
    assets: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            path: z.string().regex(/^media\/[a-f0-9-]{36}\.jpg$/),
            size: z
              .number()
              .int()
              .positive()
              .max(3 * 1024 * 1024),
            sha256: z
              .string()
              .regex(/^[a-f0-9]{64}$/)
              .optional(),
          })
          .strict(),
      )
      .max(10000),
    timeline: z.array(gameActivityEventSchema).max(100_000).optional(),
  })
  .strict();
export function archiveOnly(
  snapshot: LibrarySnapshot,
): BackupManifest["library"] {
  // Parsing strips unknown fields. Explicit allowlist excludes profile, preferences, identity and billing.
  const { games, collections, genres, series, gallery } =
    parseLibrary(snapshot);
  return { games, collections, genres, series, gallery };
}
export function restoreSnapshot(
  manifest: BackupManifest,
  current: LibrarySnapshot,
  ids: Map<string, string>,
): LibrarySnapshot {
  const image = (value?: string) => {
    if (!value?.startsWith("/api/media/")) return value;
    const next = ids.get(value.slice("/api/media/".length));
    if (!next)
      throw new Error("A referenced image is missing from this backup.");
    return `/api/media/${next}`;
  };
  return parseLibrary({
    ...current,
    ...manifest.library,
    games: manifest.library.games.map((g) => ({
      ...g,
      coverImage: image(g.coverImage),
      heroImage: image(g.heroImage),
      savedCoverImage: image(g.savedCoverImage),
      savedHeroImage: image(g.savedHeroImage),
      originalManualMetadata: g.originalManualMetadata
        ? {
            ...g.originalManualMetadata,
            coverImage: image(g.originalManualMetadata.coverImage),
            heroImage: image(g.originalManualMetadata.heroImage),
          }
        : undefined,
    })),
    gallery: manifest.library.gallery.map((p) => ({
      ...p,
      image: image(p.image),
    })),
  });
}
export function validateBackup(
  value: unknown,
  current: LibrarySnapshot,
): BackupManifest {
  const raw = backupManifestSchema.parse(value);
  const unique = new Set(raw.assets.map((a) => a.id));
  if (
    unique.size !== raw.assets.length ||
    new Set(raw.assets.map((a) => a.path)).size !== raw.assets.length
  )
    throw new Error("Duplicate backup files.");
  if (raw.assets.some((a) => a.path !== `media/${a.id}.jpg`))
    throw new Error("Invalid backup file path.");
  const manifest = raw as BackupManifest;
  const snapshot = restoreSnapshot(
    manifest,
    { ...current, profile: { ...current.profile, avatarImage: "" } },
    new Map(raw.assets.map((a) => [a.id, a.id])),
  );
  const refs = mediaReferences(snapshot);
  if (refs.length !== unique.size || refs.some((id) => !unique.has(id)))
    throw new Error("Backup images and references do not match.");
  const gameIds = new Set(snapshot.games.map((game) => game.id));
  if (
    manifest.timeline?.some((event) => !gameIds.has(event.gameId)) ||
    new Set(manifest.timeline?.map((event) => event.id)).size !==
      (manifest.timeline?.length ?? 0)
  )
    throw new Error("Backup timeline contains invalid or duplicate records.");
  return { ...manifest, library: archiveOnly(snapshot) };
}
