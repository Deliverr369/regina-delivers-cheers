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
    const user = userData.user;

    const body = await req.json();
    const estimatedTotal = Number(body?.estimated_total);
    const selectedPaymentMethodId: string | undefined = body?.payment_method_id;
    if (!Number.isFinite(estimatedTotal) || estimatedTotal <= 0) {
      return new Response(JSON.stringify({ error: "Invalid estimated_total" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authorizedAmountCents = Math.round(estimatedTotal * 1.3 * 100);
    const stripe = createStripeClient("sandbox");

    // Service-role client to update profiles (bypass RLS quirks)
    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Ensure Stripe customer exists for this user
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("stripe_customer_id, full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || profile?.email || undefined,
        name: profile?.full_name || undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await adminSupabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    const intentParams: any = {
      amount: authorizedAmountCents,
      currency: "cad",
      capture_method: "manual",
      customer: customerId,
      setup_future_usage: "off_session",
      metadata: {
        user_id: user.id,
        estimated_total: String(estimatedTotal),
        buffer_pct: "30",
      },
    };

    if (selectedPaymentMethodId) {
      intentParams.payment_method = selectedPaymentMethodId;
      intentParams.payment_method_types = ["card"];
    } else {
      intentParams.automatic_payment_methods = { enabled: true };
    }

    const intent = await stripe.paymentIntents.create(intentParams);

    return new Response(
      JSON.stringify({
        client_secret: intent.client_secret,
        payment_intent_id: intent.id,
        authorized_amount: authorizedAmountCents / 100,
        customer_id: customerId,
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
