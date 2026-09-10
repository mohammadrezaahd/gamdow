import { currentSession, renewSession } from "@/server/session";
import { json, failure, sameOrigin } from "@/server/http";
export async function GET() {
  try {
    const session = await currentSession();
    return json(
      session
        ? {
            user: session.account.snapshot.profile,
            expiresAt: session.expiresAt.toISOString(),
          }
        : null,
    );
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const session = await renewSession();
    return json({
      user: session.account.snapshot.profile,
      expiresAt: session.expiresAt.toISOString(),
    });
  } catch (error) {
    return failure(error);
  }
}
