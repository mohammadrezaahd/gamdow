import { currentSession } from "@/server/session";
import { json, failure } from "@/server/http";
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
