// supabase/functions/create-payment-intent/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";
import { createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const estimatedTotal = Number(body?.estimated_total);
    if (!Number.isFinite(estimatedTotal) || estimatedTotal <= 0) {
      return new Response(JSON.stringify({ error: "Invalid estimated_total" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorize estimated_total + 30% buffer (in cents)
    const authorizedAmountCents = Math.round(estimatedTotal * 1.3 * 100);

    const stripe = createStripeClient("sandbox");
    const intent = await stripe.paymentIntents.create({
      amount: authorizedAmountCents,
      currency: "cad",
      capture_method: "manual",
      automatic_payment_methods: { enabled: true },
      metadata: {
        user_id: userData.user.id,
        estimated_total: String(estimatedTotal),
        buffer_pct: "30",
      },
    });

    return new Response(
      JSON.stringify({
        client_secret: intent.client_secret,
        payment_intent_id: intent.id,
        authorized_amount: authorizedAmountCents / 100,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("create-payment-intent error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
