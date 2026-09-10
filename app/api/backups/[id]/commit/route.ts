import { z } from "zod";
import { requireSession } from "@/server/session";
import { finishImport } from "@/server/storage/backup";
import { json, failure, sameOrigin } from "@/server/http";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(request);
    const { account } = await requireSession();
    return json(
      await finishImport(
        account._id,
        z
          .string()
          .uuid()
          .parse((await context.params).id),
      ),
    );
  } catch (e) {
    return failure(e);
  }
}
