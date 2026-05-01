// supabase/functions/payments-webhook/index.ts
//
// Stripe webhook handler. Both sandbox and live webhooks point here, with
// `?env=sandbox` or `?env=live` so we know which signing secret + credentials
// to use. Updates `orders.payment_status` and (for refunds) `orders.status`.
//
// Handled events:
//   - payment_intent.succeeded       -> payment_status = 'captured' (or 'authorized' if manual capture)
//   - payment_intent.amount_capturable_updated -> payment_status = 'authorized'
//   - payment_intent.payment_failed  -> payment_status = 'failed', order status = 'cancelled'
//   - payment_intent.canceled        -> payment_status = 'cancelled', order status = 'cancelled'
//   - charge.refunded                -> payment_status = 'refunded' | 'partially_refunded'
//   - charge.dispute.created         -> payment_status = 'disputed'
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

async function findOrderByPaymentIntent(paymentIntentId: string) {
  const { data, error } = await getSupabase()
    .from("orders")
    .select("id, user_id, status, payment_status, total, final_total, authorized_amount")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();
  if (error) {
    console.error("Error loading order for PI", paymentIntentId, error);
    return null;
  }
  return data;
}

async function insertNotification(userId: string, orderId: string, title: string, body: string) {
  try {
    await getSupabase().from("notifications").insert({
      user_id: userId,
      order_id: orderId,
      type: "order_update",
      title,
      body,
      link: "/orders",
    });
  } catch (e) {
    console.error("Failed to insert notification:", e);
  }
}

async function handlePaymentIntentSucceeded(pi: any) {
  const order = await findOrderByPaymentIntent(pi.id);
  if (!order) {
    console.warn("payment_intent.succeeded: no order for PI", pi.id);
    return;
  }
  // For manual-capture intents, "succeeded" fires after capture.
  await getSupabase()
    .from("orders")
    .update({
      payment_status: "captured",
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);
  console.log("Order", order.id, "marked captured via webhook");
}

async function handleAmountCapturable(pi: any) {
  // Manual-capture flow: card has been authorized, awaiting capture.
  const order = await findOrderByPaymentIntent(pi.id);
  if (!order) return;
  if (order.payment_status === "captured" || order.payment_status === "refunded") return;
  await getSupabase()
    .from("orders")
    .update({
      payment_status: "authorized",
      authorized_amount: (pi.amount_capturable ?? pi.amount) / 100,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);
}

async function handlePaymentFailed(pi: any) {
  const order = await findOrderByPaymentIntent(pi.id);
  if (!order) return;
  const reason = pi.last_payment_error?.message || "Card was declined";
  await getSupabase()
    .from("orders")
    .update({
      payment_status: "failed",
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);
  await insertNotification(
    order.user_id,
    order.id,
    "Payment failed",
    `We couldn't process payment for your order: ${reason}. Please try a different card.`,
  );
}

async function handlePaymentCanceled(pi: any) {
  const order = await findOrderByPaymentIntent(pi.id);
  if (!order) return;
  await getSupabase()
    .from("orders")
    .update({
      payment_status: "cancelled",
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);
}

async function handleChargeRefunded(charge: any) {
  const piId = typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : charge.payment_intent?.id;
  if (!piId) {
    console.warn("charge.refunded with no payment_intent");
    return;
  }
  const order = await findOrderByPaymentIntent(piId);
  if (!order) return;

  const refundedTotal = (charge.amount_refunded ?? 0);
  const chargeTotal = (charge.amount ?? 0);
  const fullyRefunded = refundedTotal >= chargeTotal && chargeTotal > 0;
  const newStatus = fullyRefunded ? "refunded" : "partially_refunded";

  const update: Record<string, unknown> = {
    payment_status: newStatus,
    updated_at: new Date().toISOString(),
  };
  if (fullyRefunded) {
    update.status = "cancelled";
  }

  await getSupabase().from("orders").update(update).eq("id", order.id);

  await insertNotification(
    order.user_id,
    order.id,
    fullyRefunded ? "Refund issued 💸" : "Partial refund issued",
    fullyRefunded
      ? `Your order has been fully refunded ($${(refundedTotal / 100).toFixed(2)}). It may take 5–10 business days to appear on your statement.`
      : `A partial refund of $${(refundedTotal / 100).toFixed(2)} has been issued to your card.`,
  );
}

async function handleDisputeCreated(dispute: any) {
  const piId = typeof dispute.payment_intent === "string"
    ? dispute.payment_intent
    : dispute.payment_intent?.id;
  if (!piId) return;
  const order = await findOrderByPaymentIntent(piId);
  if (!order) return;
  await getSupabase()
    .from("orders")
    .update({
      payment_status: "disputed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  console.log("Webhook event:", event.type, "env:", env);

  switch (event.type) {
    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(event.data.object);
      break;
    case "payment_intent.amount_capturable_updated":
      await handleAmountCapturable(event.data.object);
      break;
    case "payment_intent.payment_failed":
      await handlePaymentFailed(event.data.object);
      break;
    case "payment_intent.canceled":
      await handlePaymentCanceled(event.data.object);
      break;
    case "charge.refunded":
      await handleChargeRefunded(event.data.object);
      break;
    case "charge.dispute.created":
      await handleDisputeCreated(event.data.object);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    console.error("Webhook received with invalid or missing env query parameter:", rawEnv);
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  const env: StripeEnv = rawEnv;
  try {
    await handleWebhook(req, env);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
