import { isSteamImage } from "./steam-images";
import { z } from "zod";
import { normalizeTaxonomies, taxonomyKey } from "./taxonomy";
import { normalizeTags } from "./tags";
import type { LibrarySnapshot } from "@/types/game";
export const statuses = [
  "Not started",
  "Playing",
  "On hold",
  "Completed",
  "Dropped",
] as const;
export const plans = [
  "None",
  "Up next",
  "Soon",
  "Someday",
  "Not interested",
] as const;
const id = z
  .string()
  .min(1)
  .max(5000)
  .regex(/^[\w%.-]+$/);
const text = z.string().max(100000);
const name = z.string().trim().min(1).max(500);
const date = z
  .string()
  .refine(
    (v) =>
      !v ||
      (/^\d{4}-\d{2}-\d{2}$/.test(v) &&
        Number.isFinite(Date.parse(v)) &&
        new Date(v).toISOString().slice(0, 10) === v),
    "Invalid date",
  );
const timestamp = z
  .string()
  .refine((v) => Number.isFinite(Date.parse(v)), "Invalid timestamp");
const image = z
  .string()
  .max(250)
  .refine(
    (v) => v === "" || /^\/api\/media\/[a-f0-9-]{36}$/.test(v),
    "Images must be uploaded to this account. Legacy embedded images and external URLs cannot be imported.",
  );
const gameImage = z
  .string()
  .max(2000)
  .refine(
    (v) => image.safeParse(v).success || isSteamImage(v),
    "Invalid game image",
  );
const manualMetadataSchema = z.object({
  title: name,
  description: text,
  coverImage: image,
  heroImage: image.optional(),
  releaseYear: z.number().int().min(1950).max(2200).optional(),
  releaseDate: date.optional(),
  genres: z.array(name),
});
const score = z.number().min(0).max(10).optional();
const category = z.object({
  id,
  name,
  description: text,
  createdAt: timestamp,
  updatedAt: timestamp,
});
export const profileSchema = z.object({
  id,
  displayName: z.string().trim().min(1).max(80),
  username: z.string().trim().max(40),
  bio: z.string().max(500),
  location: z.string().max(100),
  avatarImage: image,
  favoritePlatforms: z.array(name),
  createdAt: timestamp,
  updatedAt: timestamp,
});
export const snapshotSchema = z
  .object({
    version: z.literal(1),
    games: z.array(
      z.object({
        id,
        source: z.enum(["MANUAL", "STEAM"]).default("MANUAL"),
        steamAppId: z.number().int().positive().max(4294967295).optional(),
        originalManualMetadata: manualMetadataSchema.optional(),
        manualProgress: z.number().min(0).max(100).optional(),
        releaseDate: date.optional(),
        title: name,
        tags: z.array(z.string().max(500)).default([]),
        releaseYear: z.number().int().min(1950).max(2200).optional(),
        genres: z.array(name),
        genreIds: z.array(id).optional(),
        series: z.string().max(500).optional(),
        seriesId: id.optional(),
        platform: z.string().max(500),
        status: z.enum(statuses),
        plan: z.enum(plans),
        rating: score,
        hoursPlayed: z.number().min(0).max(1000000).optional(),
        favorite: z.boolean(),
        description: text,
        review: text.optional(),
        scoreBreakdown: z
          .object({
            gameplay: score,
            story: score,
            atmosphere: score,
            visuals: score,
            sound: score,
          })
          .optional(),
        journalEntries: z.array(z.object({ id, date, text })),
        coverImage: gameImage,
        heroImage: gameImage.optional(),
        startedAt: date.optional(),
        completedAt: date.optional(),
        plannedAt: date.optional(),
        planNote: text.optional(),
        planOrder: z.number().int().min(0).optional(),
        edition: z.enum(["Main game", "DLC", "Remake", "Remaster"]).optional(),
        reviewSpoiler: z.boolean().optional(),
        reviewPros: text.optional(),
        reviewCons: text.optional(),
        updatedAt: timestamp,
      }),
    ),
    collections: z.array(
      z.object({ id, name, description: text, gameIds: z.array(id) }),
    ),
    genres: z.array(category.extend({ kind: z.literal("genre") })).default([]),
    series: z.array(category.extend({ kind: z.literal("series") })).default([]),
    gallery: z.array(
      z.object({
        id,
        gameId: id,
        image: image.refine(Boolean, "An image is required"),
        caption: text,
        capturedAt: date.refine(Boolean, "Capture date is required"),
        favorite: z.boolean(),
        spoiler: z.boolean(),
      }),
    ),
    preferences: z.object({
      displayName: z.string().trim().min(1).max(80),
      defaultLibraryView: z.enum(["grid", "list"]),
      hideSpoilers: z.boolean(),
    }),
    profile: profileSchema,
  })
  .superRefine((s, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    const unique = (values: string[]) => new Set(values).size === values.length;
    for (const list of [s.games, s.collections, s.gallery, s.genres, s.series])
      if (!unique(list.map((v) => v.id))) fail("Duplicate record IDs");
    for (const list of [s.genres, s.series])
      if (!unique(list.map((v) => taxonomyKey(v.name))))
        fail("Duplicate category names");
    const ids = new Set(s.games.map((g) => g.id));
    if (
      s.collections.some(
        (c) => !unique(c.gameIds) || c.gameIds.some((id) => !ids.has(id)),
      ) ||
      s.gallery.some((p) => !ids.has(p.gameId))
    )
      fail("A referenced game does not exist");
    const steamIds = s.games
      .filter((g) => g.source === "STEAM")
      .map((g) => String(g.steamAppId));
    if (!unique(steamIds))
      fail("A Steam game can only appear once in your library");
    for (const g of s.games) {
      if ((g.source === "STEAM") !== (g.steamAppId !== undefined))
        fail("Invalid game source");
      if (
        g.source === "MANUAL" &&
        [
          g.coverImage,
          g.heroImage,
          g.originalManualMetadata?.coverImage,
          g.originalManualMetadata?.heroImage,
        ].some((v) => v && isSteamImage(v))
      )
        fail("Manual images must be uploaded");
      if (!unique(g.journalEntries.map((j) => j.id)))
        fail("Duplicate journal IDs");
      if (g.startedAt && g.completedAt && g.completedAt < g.startedAt)
        fail("Finish date must follow start date");
    }
  });
export function parseLibrary(value: unknown): LibrarySnapshot {
  const parsed = snapshotSchema.safeParse(value);
  if (!parsed.success)
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid archive");
  return normalizeTaxonomies({
    ...parsed.data,
    games: parsed.data.games.map((game) => ({
      ...game,
      tags: normalizeTags(game.tags),
    })),
  });
}
export function mediaReferences(snapshot: LibrarySnapshot): string[] {
  return [
    ...new Set(
      [
        snapshot.profile.avatarImage,
        ...snapshot.games.flatMap((g) => [
          g.coverImage,
          g.heroImage,
          g.originalManualMetadata?.coverImage,
          g.originalManualMetadata?.heroImage,
        ]),
        ...snapshot.gallery.map((p) => p.image),
      ]
        .filter((v): v is string => !!v && v.startsWith("/api/media/"))
        .map((v) => v.split("/").pop()!),
    ),
  ];
}
