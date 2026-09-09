import { z } from "zod";
import { beginLogin, providerSchema } from "@/server/oauth/service";
import { failure, json, sameOrigin, readJson } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  try {
    sameOrigin(request);
    const provider = providerSchema.parse((await context.params).provider);
    const ip = process.env.VERCEL
      ? request.headers.get("x-vercel-forwarded-for") || "unknown"
      : "local";
    await rateLimit(`oauth-start:${ip}`, 30, 900);
    const input = z
      .object({
        remember: z.boolean().default(false),
        link: z.boolean().default(false),
      })
      .parse(await readJson(request, 1000));
    return json(await beginLogin(provider, input.remember, input.link));
  } catch (e) {
    return failure(e);
  }
}
