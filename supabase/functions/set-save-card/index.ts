import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json(401, { error: "Unauthorized" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json(401, { error: "Unauthorized" });
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const paymentIntentId = String(body?.payment_intent_id ?? "");
    const save = body?.save === true;
    const environment = (body?.environment === "live" ? "live" : "sandbox") as StripeEnv;
    if (!/^pi_[a-zA-Z0-9_]+$/.test(paymentIntentId)) {
      return json(400, { error: "Invalid payment_intent_id" });
    }

    const rawTip = Number(body?.tip);
    const tip = Number.isFinite(rawTip) && rawTip > 0 ? Math.min(Math.round(rawTip * 100) / 100, 500) : 0;

    const stripe = createStripeClient(environment);
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.metadata?.user_id !== user.id) return json(403, { error: "Forbidden" });

    const updates: any = {
      payment_method_options: {
        card: { setup_future_usage: save ? "off_session" : "" },
      },
    };

    // Re-price the authorization from the server-recorded base total (no tip)
    // plus the tip the customer has chosen right now. Without this, raising the
    // tip after the card form loaded would leave the hold too small to capture.
    const baseTotal = Number(intent.metadata?.base_total ?? NaN);
    const bufferPct = Number(intent.metadata?.buffer_pct ?? 20) / 100;
    if (Number.isFinite(baseTotal) && baseTotal > 0 && intent.status === "requires_payment_method") {
      const newAmount = Math.round((baseTotal + tip) * (1 + bufferPct) * 100);
      if (newAmount !== intent.amount) {
        updates.amount = newAmount;
        updates.metadata = { ...intent.metadata, estimated_total: String(Math.round((baseTotal + tip) * 100) / 100) };
      }
    }

    await stripe.paymentIntents.update(paymentIntentId, updates as any);

    return json(200, { ok: true, save, tip });
  } catch (e) {
    console.error("set-save-card error", e);
    return json(500, { error: e instanceof Error ? e.message : "Unexpected error" });
  }
});
