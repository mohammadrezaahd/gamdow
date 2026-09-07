import { deleteSession } from "@/server/session";
import { sameOrigin, json, failure } from "@/server/http";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await deleteSession();
    return json({ success: true });
  } catch (error) {
    return failure(error);
  }
}
