import { finishLogin, providerSchema } from "@/server/oauth/service";
import { steamOrigin } from "@/server/steam/client";
import { currentSession } from "@/server/session";
import { HttpError } from "@/server/http";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  let path = "/";
  try {
    path = await finishLogin(
      providerSchema.parse((await context.params).provider),
      request,
    );
  } catch (e) {
    const code =
      e instanceof HttpError &&
      [
        "OAUTH_EMAIL_EXISTS",
        "OAUTH_ACCOUNT_CONFLICT",
        "OAUTH_NOT_CONFIGURED",
      ].includes(e.code)
        ? e.code
        : "OAUTH_VERIFICATION_FAILED";
    path = (await currentSession().catch(() => null))
      ? `/?page=profile&auth=${code}`
      : `/login?auth=${code}`;
  }
  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL(path, steamOrigin()).href,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
