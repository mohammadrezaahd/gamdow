import { providers } from "@/server/oauth/service";
import { currentSession } from "@/server/session";
import { json, failure } from "@/server/http";
export const runtime = "nodejs";
export async function GET() {
  try {
    const session = await currentSession();
    return json({
      ...providers(),
      googleConnected: !!session?.account.googleSubject,
      steamConnected: !!session?.account.steamSubject,
    });
  } catch (e) {
    return failure(e);
  }
}
