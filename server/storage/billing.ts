import "server-only";
import Stripe from "stripe";
import { storagePacks } from "@/lib/storage";
import type { StoragePlan } from "@/types/storage";
import { database } from "../database";
import { HttpError } from "../http";
const priceId = (id: string) =>
  process.env[`STRIPE_STORAGE_${id.toUpperCase()}_PRICE_ID`];
function stripe() {
  if (!process.env.STRIPE_SECRET_KEY)
    throw new HttpError(
      503,
      "Storage purchases are not configured yet.",
      "BILLING_UNAVAILABLE",
    );
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    timeout: 15000,
    maxNetworkRetries: 1,
  });
}
export async function storagePlans(): Promise<StoragePlan[]> {
  return Promise.all(
    storagePacks.map(async (pack) => {
      const base = { ...pack, configured: false };
      if (
        !priceId(pack.id) ||
        !process.env.STRIPE_SECRET_KEY ||
        !process.env.STRIPE_WEBHOOK_SECRET
      )
        return base;
      try {
        const p = await stripe().prices.retrieve(priceId(pack.id)!);
        if (!p.active || p.type !== "one_time" || p.unit_amount === null)
          return base;
        return {
          ...base,
          configured: true,
          amount: p.unit_amount,
          currency: p.currency,
        };
      } catch {
        return base;
      }
    }),
  );
}
export async function checkout(
  userId: string,
  packId: string,
  requestId: string,
) {
  const pack = storagePacks.find((p) => p.id === packId);
  const price = pack && priceId(pack.id);
  if (
    !pack ||
    !price ||
    !process.env.STRIPE_WEBHOOK_SECRET ||
    !process.env.APP_URL
  )
    throw new HttpError(503, "This storage pack is not available yet.");
  const client = stripe(),
    p = await client.prices.retrieve(price);
  if (!p.active || p.type !== "one_time")
    throw new HttpError(503, "This storage pack is not available.");
  const origin = new URL(process.env.APP_URL).origin;
  const session = await client.checkout.sessions.create(
    {
      mode: "payment",
      line_items: [{ price, quantity: 1 }],
      client_reference_id: userId,
      metadata: {
        userId,
        packId: pack.id,
        priceId: price,
        bytes: String(pack.bytes),
        purpose: "gamdow_storage",
      },
      success_url: `${origin}/?page=settings&storage=success`,
      cancel_url: `${origin}/?page=settings&storage=cancelled`,
    },
    { idempotencyKey: `storage:${userId}:${requestId}` },
  );
  if (!session.url) throw new HttpError(502, "Checkout could not be opened.");
  return { url: session.url };
}
export async function paymentEvent(bytes: Uint8Array, signature: string) {
  if (!process.env.STRIPE_WEBHOOK_SECRET)
    throw new HttpError(503, "Billing is not configured.");
  const client = stripe();
  let event: Stripe.Event;
  try {
    event = client.webhooks.constructEvent(
      Buffer.from(bytes),
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    throw new HttpError(400, "Invalid payment signature.");
  }
  if (
    ![
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
    ].includes(event.type)
  )
    return;
  const session = await client.checkout.sessions.retrieve(
    (event.data.object as Stripe.Checkout.Session).id,
    { expand: ["line_items"] },
  );
  const m = session.metadata,
    pack = storagePacks.find((p) => p.id === m?.packId);
  if (m?.purpose !== "gamdow_storage" || session.payment_status !== "paid")
    return;
  if (
    !pack ||
    !m.userId ||
    session.mode !== "payment" ||
    session.client_reference_id !== m.userId ||
    m.bytes !== String(pack.bytes) ||
    session.line_items?.data.length !== 1 ||
    session.line_items.data[0].price?.id !== m.priceId ||
    session.line_items.data[0].quantity !== 1
  )
    throw new HttpError(400, "Invalid storage purchase.");
  const db = await database();
  if (
    !(await db.accounts.findOne({ _id: m.userId }, { projection: { _id: 1 } }))
  )
    throw new HttpError(409, "Purchase account not found.");
  // Signed, server-created Checkout metadata survives later price changes. One grant per payment.
  try {
    await db.storageGrants.updateOne(
      { _id: session.id },
      {
        $setOnInsert: {
          userId: m.userId,
          bytes: pack.bytes,
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );
  } catch (e) {
    if (
      (e as { code?: number }).code !== 11000 ||
      !(await db.storageGrants.findOne({
        _id: session.id,
        userId: m.userId,
        bytes: pack.bytes,
      }))
    )
      throw e;
  }
}
