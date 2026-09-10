import { paymentEvent } from "@/server/storage/billing";
import { failure, json, readBytes } from "@/server/http";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    await paymentEvent(
      await readBytes(request, 1024 * 1024),
      request.headers.get("stripe-signature") || "",
    );
    return json({ received: true });
  } catch (e) {
    return failure(e);
  }
}
