import "server-only";
import { z } from "zod";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "REQUEST_FAILED",
  ) {
    super(message);
  }
}
export const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
export function failure(error: unknown) {
  if (error instanceof HttpError)
    return json({ error: error.message, code: error.code }, error.status);
  if (error instanceof z.ZodError)
    return json(
      {
        error: error.issues[0]?.message ?? "Invalid input",
        code: "INVALID_INPUT",
      },
      400,
    );
  console.error(
    "Server operation failed",
    error instanceof Error ? error.name : "Unknown error",
  );
  return json(
    {
      error: "The server could not complete this request. Please try again.",
      code: "SERVER_ERROR",
    },
    500,
  );
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_URL
    ? new URL(process.env.APP_URL).origin
    : new URL(request.url).origin;
  if (
    !origin ||
    origin !== expected ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new HttpError(
      403,
      "This request origin is not allowed.",
      "INVALID_ORIGIN",
    );
}
export async function readBytes(
  request: Pick<Request, "headers" | "body">,
  max: number,
) {
  if (Number(request.headers.get("content-length")) > max)
    throw new HttpError(413, "Request is too large.");
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        throw new HttpError(413, "Request is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
export async function readJson(request: Request, max = 3 * 1024 * 1024) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "JSON is required.");
  try {
    return JSON.parse(new TextDecoder().decode(await readBytes(request, max)));
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(400, "Invalid JSON.");
  }
}
