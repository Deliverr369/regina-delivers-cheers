// Capture (or partially capture) a previously authorized PaymentIntent
// after admin confirms the final order total.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createStripeClient, type StripeEnv } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth: require an admin user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden — admin only" }, 403);

    const { orderId, environment } = await req.json();
    if (!orderId) return json({ error: "orderId required" }, 400);

    const env = (environment || "sandbox") as StripeEnv;

    // Load order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
    if (orderErr || !order) return json({ error: "Order not found" }, 404);

    if (!order.stripe_payment_intent_id) {
      return json({ error: "No payment intent on order" }, 400);
    }
    if (order.payment_status === "captured") {
      return json({ error: "Already captured" }, 400);
    }

    const finalTotal = Number(order.final_total ?? order.total);
    const authorized = Number(order.authorized_amount ?? 0);

    if (!finalTotal || finalTotal <= 0) {
      return json({ error: "Final total invalid" }, 400);
    }
    if (authorized > 0 && finalTotal > authorized) {
      return json({
        error: "Final total exceeds authorized amount. Re-authorization required.",
        requiresReauth: true,
        authorized,
        finalTotal,
      }, 409);
    }

    const stripe = createStripeClient(env);
    const amountToCapture = Math.round(finalTotal * 100);

    const captured = await stripe.paymentIntents.capture(order.stripe_payment_intent_id, {
      amount_to_capture: amountToCapture,
    });

    await supabase
      .from("orders")
      .update({
        payment_status: "captured",
        final_total: finalTotal,
        final_confirmed_at: new Date().toISOString(),
        final_confirmed_by: userData.user.id,
        total: finalTotal,
      })
      .eq("id", orderId);

    return json({ success: true, paymentIntent: captured.id, captured: amountToCapture / 100 });
  } catch (e) {
    console.error("capture-payment error:", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
