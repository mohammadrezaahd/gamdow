import { requireSession } from "@/server/session";
import { finishConnection } from "@/server/steam/connection";
import { steamOrigin } from "@/server/steam/client";
import { HttpError } from "@/server/http";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  let result = "connected";
  try {
    const { account, sessionHash } = await requireSession();
    await finishConnection(request, account._id, sessionHash);
  } catch (e) {
    result =
      e instanceof HttpError && e.code === "STEAM_ALREADY_CONNECTED"
        ? "already_connected"
        : "verification_failed";
  }
  const url = new URL("/", steamOrigin());
  url.searchParams.set("page", "profile");
  url.searchParams.set("steam", result);
  return new Response(null, {
    status: 303,
    headers: {
      Location: url.href,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
