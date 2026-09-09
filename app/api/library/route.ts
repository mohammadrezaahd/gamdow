import {
  libraryView,
  commitLibrary,
  validateSteamReferences,
} from "@/server/library-storage";
import { z } from "zod";
import { requireSession } from "@/server/session";
import { database } from "@/server/database";
import { sameOrigin, failure, json, readJson, HttpError } from "@/server/http";
import { parseLibrary, mediaReferences } from "@/lib/library-schema";
export const runtime = "nodejs";
export async function GET() {
  try {
    const { account } = await requireSession();
    return json({
      snapshot: await libraryView(account),
      revision: account.revision,
    });
  } catch (error) {
    return failure(error);
  }
}
export async function PUT(request: Request) {
  try {
    sameOrigin(request);
    const { account } = await requireSession();
    const input = z
      .object({
        snapshot: z.unknown(),
        revision: z.number().int().min(0),
        mutationId: z.string().uuid(),
      })
      .parse(await readJson(request));
    if (account.lastMutationId === input.mutationId)
      return json({ revision: account.revision });
    if (account.revision !== input.revision)
      throw new HttpError(
        409,
        "Your archive changed in another tab or device. Export your pending changes, then reload the server version.",
        "REVISION_CONFLICT",
      );
    let snapshot;
    try {
      snapshot = parseLibrary(input.snapshot);
    } catch (error) {
      throw new HttpError(
        400,
        error instanceof Error ? error.message : "Invalid archive",
        "INVALID_ARCHIVE",
      );
    }
    if (snapshot.profile.id !== account._id)
      throw new HttpError(
        409,
        "The signed-in account changed. Export pending changes and reload.",
        "ACCOUNT_CHANGED",
      );
    snapshot.profile.id = account._id;
    snapshot.profile.createdAt = account.snapshot.profile.createdAt;
    snapshot.preferences.displayName = snapshot.profile.displayName;
    const db = await database();
    const images = mediaReferences(snapshot);
    if (
      images.length &&
      (await db.media.countDocuments({
        _id: { $in: images },
        userId: account._id,
      })) !== images.length
    )
      throw new HttpError(
        400,
        "Some images do not belong to your account or no longer exist.",
        "INVALID_MEDIA",
      );
    await validateSteamReferences(snapshot, account.snapshot);
    try {
      await commitLibrary(account, snapshot, input.mutationId);
    } catch (error) {
      if (error instanceof HttpError && error.code === "REVISION_CONFLICT") {
        const latest = await db.accounts.findOne({ _id: account._id });
        if (latest?.lastMutationId === input.mutationId)
          return json({ revision: latest.revision });
      }
      throw error;
    }
    return json({ revision: input.revision + 1 });
  } catch (error) {
    return failure(error);
  }
}
