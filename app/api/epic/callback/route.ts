import { finishEpicConnection, epicOrigin } from "@/server/epic/connection";
import { HttpError } from "@/server/http";
export const runtime = "nodejs";
export const maxDuration = 30;
export async function GET(request: Request) {
  let result = "connected";
  try {
    await finishEpicConnection(request);
  } catch (e) {
    result =
      e instanceof HttpError && e.code === "EPIC_ALREADY_CONNECTED"
        ? "already_connected"
        : "verification_failed";
  }
  const url = new URL("/", epicOrigin());
  url.searchParams.set("page", "profile");
  url.searchParams.set("epic", result);
  return new Response(null, {
    status: 303,
    headers: {
      Location: url.href,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
