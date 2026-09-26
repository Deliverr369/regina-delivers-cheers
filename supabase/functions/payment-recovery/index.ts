// Recover card authorizations that were taken but never turned into an order.
//
// Why this exists: checkout authorizes the card FIRST and then writes the
// order rows. If anything fails in between (validation, RLS, network, the
// customer closing the tab) the customer has a hold on their card with no
// order behind it.
//
// Actions:
//  - "list_orphans" (admin): recent PaymentIntents with no matching order.
//  - "release"      (owner of the intent, or admin): cancel/refund the hold.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createStripeClient, type StripeEnv } from "../_shared/stripe.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const ENVS: StripeEnv[] = ["live", "sandbox"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const { data } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
  return data.user ?? null;
}

async function isAdmin(userId: string) {
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

/** PaymentIntents from both Stripe environments created in the last `days`. */
async function recentIntents(days: number) {
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  const out: Array<{ env: StripeEnv; intent: any }> = [];
  for (const env of ENVS) {
    try {
      const stripe = createStripeClient(env);
      const list = await stripe.paymentIntents.list({
        created: { gte: since },
        limit: 100,
      });
      for (const intent of list.data) out.push({ env, intent });
    } catch (e) {
      console.error(`paymentIntents.list failed for ${env}:`, (e as Error).message);
    }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const user = await getUser(req);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "list_orphans");
    const admin_user = await isAdmin(user.id);

    if (action === "list_orphans") {
      if (!admin_user) return json({ error: "Forbidden — admin only" }, 403);
      const days = Math.min(Math.max(Number(body?.days) || 7, 1), 60);
      const found = await recentIntents(days);

      const ids = found.map((f) => f.intent.id);
      const { data: orders } = await admin
        .from("orders")
        .select("id, stripe_payment_intent_id")
        .in("stripe_payment_intent_id", ids.length ? ids : ["none"]);
      const withOrder = new Set((orders || []).map((o) => o.stripe_payment_intent_id));

      const orphans = found
        .filter(({ intent }) =>
          !withOrder.has(intent.id) &&
          // Money is (or was) actually held / taken from the customer.
          ["requires_capture", "succeeded", "processing"].includes(intent.status)
        )
        .map(({ env, intent }) => ({
          payment_intent_id: intent.id,
          environment: env,
          status: intent.status,
          amount: (intent.amount_received || intent.amount) / 100,
          currency: intent.currency,
          created: new Date(intent.created * 1000).toISOString(),
          user_id: intent.metadata?.user_id || null,
          estimated_total: intent.metadata?.estimated_total || null,
          customer: typeof intent.customer === "string" ? intent.customer : intent.customer?.id ?? null,
        }));

      // Attach customer contact details so support can follow up.
      const userIds = [...new Set(orphans.map((o) => o.user_id).filter(Boolean))] as string[];
      const { data: profiles } = userIds.length
        ? await admin.from("profiles").select("id, full_name, email, phone").in("id", userIds)
        : { data: [] as any[] };
      const byId = new Map((profiles || []).map((p) => [p.id, p]));

      return json({
        ok: true,
        days,
        scanned: found.length,
        orphans: orphans
          .sort((a, b) => b.created.localeCompare(a.created))
          .map((o) => ({ ...o, profile: o.user_id ? byId.get(o.user_id) ?? null : null })),
      });
    }

    if (action === "release") {
      const intentId = String(body?.payment_intent_id || "");
      if (!intentId) return json({ error: "payment_intent_id required" }, 400);

      // Never release money that belongs to a real order.
      const { data: linked } = await admin
        .from("orders")
        .select("id")
        .eq("stripe_payment_intent_id", intentId)
        .limit(1);
      if (linked && linked.length > 0) {
        return json({ error: "This payment belongs to an existing order", order_id: linked[0].id }, 409);
      }

      let lastErr: string | null = null;
      for (const env of ENVS) {
        try {
          const stripe = createStripeClient(env);
          const intent = await stripe.paymentIntents.retrieve(intentId);
          const owner = intent.metadata?.user_id;
          if (!admin_user && owner !== user.id) return json({ error: "Forbidden" }, 403);

          if (intent.status === "requires_capture" || intent.status.startsWith("requires_")) {
            const cancelled = await stripe.paymentIntents.cancel(intentId);
            return json({ ok: true, released: true, action: "canceled", status: cancelled.status, environment: env });
          }
          if (intent.status === "succeeded") {
            const refund = await stripe.refunds.create({ payment_intent: intentId });
            return json({ ok: true, released: true, action: "refunded", refund_id: refund.id, environment: env });
          }
          return json({ ok: true, released: false, status: intent.status, environment: env });
        } catch (e) {
          lastErr = (e as Error).message;
          // Not in this environment — try the other one.
        }
      }
      return json({ error: lastErr || "Payment not found" }, 404);
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("payment-recovery error:", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
