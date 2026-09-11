import "server-only";
import { Buffer } from "node:buffer";
import { database, type AccountDocument } from "../database";
import { HttpError } from "../http";
import type { GameActivityEvent, GameTimelinePage } from "@/types/game-activity";
import type { GameActivityEventDocument } from "./models";

const PAGE_SIZE = 30;

const publicEvent = ({
  _id: _ignored,
  userId: _userId,
  ...event
}: GameActivityEventDocument) => event;

export function timelineDocuments(
  userId: string,
  events: GameActivityEvent[],
): GameActivityEventDocument[] {
  return events.map((event) => ({ ...event, _id: event.id, userId }));
}

/**
 * The account outbox is committed atomically with the library snapshot. This
 * projector is retry-safe and recovers after a process stops between writes.
 */
export async function flushTimelineOutbox(userId: string) {
  const db = await database();
  const account = await db.accounts.findOne(
    { _id: userId },
    { projection: { timelineOutbox: 1 } },
  );
  const pending = account?.timelineOutbox ?? [];
  if (!pending.length) return;
  await db.gameActivityEvents.bulkWrite(
    pending.map((event) => ({
      updateOne: {
        filter: { _id: event._id, userId },
        update: { $setOnInsert: event },
        upsert: true,
      },
    })),
    { ordered: false },
  );
  await db.accounts.updateOne(
    { _id: userId },
    {
      $pull: {
        timelineOutbox: {
          _id: { $in: pending.map((event) => event._id) },
        },
      },
    },
  );
}

function decodeCursor(value?: string) {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString()) as {
      occurredAt?: unknown;
      id?: unknown;
    };
    if (
      typeof parsed.occurredAt !== "string" ||
      !Number.isFinite(Date.parse(parsed.occurredAt)) ||
      typeof parsed.id !== "string" ||
      parsed.id.length > 12_000
    )
      throw new Error();
    return { occurredAt: parsed.occurredAt, id: parsed.id };
  } catch {
    throw new HttpError(400, "Invalid timeline cursor.", "INVALID_CURSOR");
  }
}

function encodeCursor(event: GameActivityEventDocument) {
  return Buffer.from(
    JSON.stringify({ occurredAt: event.occurredAt, id: event.id }),
  ).toString("base64url");
}

async function ensureLegacyBaseline(
  account: AccountDocument,
  gameId: string,
) {
  const db = await database();
  if (await db.gameActivityEvents.findOne({ userId: account._id, gameId })) return;
  // A dynamic import prevents the timeline read model from creating a module
  // cycle with the library commit path that projects its outbox.
  const { libraryView } = await import("../library-storage");
  const game = (await libraryView(account)).games.find(
    (item) => item.id === gameId,
  );
  if (!game) throw new HttpError(404, "Game not found.", "NOT_FOUND");
  const id = `baseline:${account._id}:${game.id}:v1`;
  const baseline: GameActivityEventDocument = {
    _id: id,
    id,
    userId: account._id,
    gameId: game.id,
    type: "BASELINE",
    source: "SYSTEM",
    occurredAt: game.updatedAt,
    recordedAt: new Date().toISOString(),
    toStatus: game.status,
    totalMinutes:
      game.hoursPlayed === undefined
        ? undefined
        : Math.round(game.hoursPlayed * 60),
    note: "Current state when timeline tracking was enabled",
  };
  try {
    await db.gameActivityEvents.insertOne(baseline);
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
  }
}

export async function gameTimeline(
  account: AccountDocument,
  gameId: string,
  cursorValue?: string,
): Promise<GameTimelinePage> {
  if (!/^[\w%.-]{1,5000}$/.test(gameId))
    throw new HttpError(404, "Game not found.", "NOT_FOUND");
  await flushTimelineOutbox(account._id);
  await ensureLegacyBaseline(account, gameId);
  const before = decodeCursor(cursorValue);
  const db = await database();
  const rows = await db.gameActivityEvents
    .find({
      userId: account._id,
      gameId,
      ...(before
        ? {
            $or: [
              { occurredAt: { $lt: before.occurredAt } },
              { occurredAt: before.occurredAt, id: { $lt: before.id } },
            ],
          }
        : {}),
    })
    .sort({ occurredAt: -1, id: -1 })
    .limit(PAGE_SIZE + 1)
    .toArray();
  const items = rows.slice(0, PAGE_SIZE);
  const { libraryView } = await import("../library-storage");
  const game = (await libraryView(account)).games.find(
    (item) => item.id === gameId,
  );
  if (!game) throw new HttpError(404, "Game not found.", "NOT_FOUND");
  let statusSuggestion;
  if (game.source === "STEAM" && game.steamAppId) {
    const connection = await db.steamConnections.findOne({ _id: account._id });
    if (connection)
      statusSuggestion = (
        await db.steamUserGames.findOne({
          _id: `${connection.generation}:${game.steamAppId}`,
          userId: account._id,
        })
      )?.statusSuggestion;
    if (
      statusSuggestion &&
      (statusSuggestion.status === game.status ||
        Date.parse(game.updatedAt) > Date.parse(statusSuggestion.observedAt))
    )
      statusSuggestion = undefined;
  }
  return {
    items: items.map(publicEvent),
    nextCursor:
      rows.length > PAGE_SIZE ? encodeCursor(items[items.length - 1]) : undefined,
    statusSuggestion,
  };
}
