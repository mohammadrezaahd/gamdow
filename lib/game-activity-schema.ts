import { z } from "zod";

const timestamp = z
  .string()
  .refine((value) => Number.isFinite(Date.parse(value)), "Invalid activity timestamp");

export const gameActivityEventSchema = z
  .object({
    id: z.string().min(1).max(12_000),
    gameId: z.string().min(1).max(5_000).regex(/^[\w%.-]+$/),
    type: z.enum([
      "BASELINE",
      "ADDED",
      "STATUS_CHANGED",
      "STARTED",
      "COMPLETED",
      "COMPLETION_CLEARED",
      "START_DATE_CHANGED",
      "START_DATE_CLEARED",
      "PLAYTIME_UPDATED",
      "COMPLETION_DATE_CHANGED",
      "EXTERNAL_ACTIVITY",
    ]),
    source: z.enum(["MANUAL", "STEAM", "EPIC", "SYSTEM"]),
    occurredAt: timestamp,
    recordedAt: timestamp,
    fromStatus: z.enum(["Not started", "Playing", "On hold", "Completed", "Dropped"]).optional(),
    toStatus: z.enum(["Not started", "Playing", "On hold", "Completed", "Dropped"]).optional(),
    previousMinutes: z.number().int().min(0).max(60_000_000).optional(),
    totalMinutes: z.number().int().min(0).max(60_000_000).optional(),
    deltaMinutes: z.number().int().min(-60_000_000).max(60_000_000).optional(),
    inferred: z.boolean().optional(),
    note: z.string().max(2_000).optional(),
  })
  .strict();
