// supabase/functions/create-payment-intent/index.ts
//
// Hardened: re-validates the cart, store, address, and delivery time
// SERVER-SIDE before creating the Stripe PaymentIntent. The client's
// `estimated_total` is ignored — the authoritative amount comes from
// re-pricing items against the database.
import { createClient } from "npm:@supabase/supabase-js@2";
import { createStripeClient, type StripeEnv } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const round2 = (n: number) => Math.round(n * 100) / 100;
const approxEq = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

// MUST match the client-side fee logic in src/pages/Checkout.tsx
const getDeliveryFee = (storeName: string): number => {
  const n = (storeName || "").toLowerCase();
  if (n.includes("costco")) return 20;
  if (n.includes("superstore")) return 15;
  return 7;
};

const CONVENIENCE_PCT = 0.12;
const TAX_PCT = 0.11;
const BUFFER_PCT = 0.3;
const LEAD_TIME_MS = 60 * 60 * 1000;

const timeToMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

interface ItemIn {
  product_id: string;
  store_id: string;
  quantity: number;
  price: number;
  pack_size?: string | null;
}

interface BodyIn {
  items?: ItemIn[];
  delivery_type?: "asap" | "scheduled";
  scheduled_at?: string | null;
  scheduled_slot?: string | null;
  address?: string;
  city?: string;
  postal_code?: string;
  tip?: number;
  payment_method_id?: string;
  environment?: StripeEnv;
  // Legacy field, intentionally ignored by the server now:
  estimated_total?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Missing authorization" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return json(401, { error: "Unauthorized" });
    const user = userData.user;

    let body: BodyIn;
    try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON body" }); }

    // --- Shape validation ---
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return json(400, { error: "Cart is empty" });
    }
    if (body.items.length > 200) return json(400, { error: "Too many items" });
    for (const it of body.items) {
      if (
        !it.product_id || !it.store_id ||
        !Number.isInteger(it.quantity) || it.quantity < 1 || it.quantity > 99 ||
        !Number.isFinite(it.price) || it.price < 0
      ) return json(400, { error: "Invalid item in cart" });
    }
    const tip = Number.isFinite(body.tip) && body.tip! >= 0 ? round2(body.tip!) : 0;
    if (tip > 500) return json(400, { error: "Tip too large" });

    if (!body.address || body.address.trim().length < 4) {
      return json(400, { error: "Delivery address is required" });
    }
    if ((body.city || "").trim().toLowerCase() !== "regina") {
      return json(400, { error: "We only deliver within Regina, SK" });
    }

    // --- Re-price against DB ---
    const productIds = Array.from(new Set(body.items.map((i) => i.product_id)));
    const storeIds = Array.from(new Set(body.items.map((i) => i.store_id)));

    const [{ data: products, error: prodErr }, { data: stores, error: storesErr }] = await Promise.all([
      supabase.from("products")
        .select("id, name, price, store_id, is_hidden, in_stock")
        .in("id", productIds),
      supabase.from("stores")
        .select("id, name")
        .in("id", storeIds),
    ]);
    if (prodErr) return json(500, { error: "Could not load products" });
    if (storesErr) return json(500, { error: "Could not load stores" });

    const prodById = new Map((products || []).map((p) => [p.id, p]));
    const storeById = new Map((stores || []).map((s) => [s.id, s]));

    let needPackPrices = body.items.some((i) => i.pack_size);
    const packPriceByKey = new Map<string, number>();
    if (needPackPrices) {
      const { data: packs } = await supabase
        .from("product_pack_prices")
        .select("product_id, pack_size, price, is_hidden")
        .in("product_id", productIds);
      for (const p of packs || []) {
        if (!p.is_hidden) packPriceByKey.set(`${p.product_id}::${p.pack_size}`, Number(p.price));
      }
    }

    const storeSubtotals = new Map<string, number>();
    for (const it of body.items) {
      const p = prodById.get(it.product_id);
      if (!p) return json(409, { error: "An item is no longer available." });
      if (p.is_hidden) return json(409, { error: `"${p.name}" is no longer available.` });
      if (p.in_stock === false) return json(409, { error: `"${p.name}" is out of stock.` });
      if (p.store_id !== it.store_id) {
        return json(409, { error: `"${p.name}" does not belong to the selected store.` });
      }
      const expectedUnit = it.pack_size
        ? packPriceByKey.get(`${it.product_id}::${it.pack_size}`) ?? Number(p.price)
        : Number(p.price);
      if (!approxEq(expectedUnit, Number(it.price))) {
        return json(409, {
          error: `Price for "${p.name}" changed (was $${Number(it.price).toFixed(2)}, now $${expectedUnit.toFixed(2)}). Please refresh your cart.`,
        });
      }
      const lineTotal = expectedUnit * it.quantity;
      storeSubtotals.set(it.store_id, round2((storeSubtotals.get(it.store_id) || 0) + lineTotal));
    }

    // --- Delivery time validation ---
    const { data: hours } = await supabase
      .from("store_hours")
      .select("store_id, weekday, is_closed, open_time, close_time")
      .in("store_id", storeIds);
    const hoursByStore = new Map<string, any[]>();
    for (const h of hours || []) {
      if (!hoursByStore.has(h.store_id)) hoursByStore.set(h.store_id, []);
      hoursByStore.get(h.store_id)!.push(h);
    }
    const now = new Date();
    const deliveryType = body.delivery_type || "asap";
    if (deliveryType === "asap") {
      for (const sid of storeIds) {
        const list = hoursByStore.get(sid) || [];
        const day = list.find((d) => d.weekday === now.getDay());
        const minsNow = now.getHours() * 60 + now.getMinutes();
        const open = day && !day.is_closed
          && minsNow >= timeToMin(day.open_time)
          && minsNow < timeToMin(day.close_time);
        if (!open) {
          const s = storeById.get(sid);
          return json(409, {
            error: `${s?.name || "A store"} in your cart is closed right now — please pick a scheduled slot.`,
          });
        }
      }
    } else {
      if (!body.scheduled_at || !body.scheduled_slot) {
        return json(400, { error: "Please pick a delivery date and time slot." });
      }
      const slotStart = new Date(body.scheduled_at);
      if (isNaN(slotStart.getTime())) return json(400, { error: "Invalid scheduled time" });
      if (slotStart.getTime() - now.getTime() < LEAD_TIME_MS) {
        return json(409, { error: "That slot is too soon — please pick a later one." });
      }
      const [ss, ee] = body.scheduled_slot.split("-");
      const startMin = timeToMin(ss);
      const endMin = timeToMin(ee);
      const weekday = slotStart.getDay();
      for (const sid of storeIds) {
        const list = hoursByStore.get(sid) || [];
        const day = list.find((d) => d.weekday === weekday);
        if (!day || day.is_closed
          || startMin < timeToMin(day.open_time)
          || endMin > timeToMin(day.close_time)) {
          const st = storeById.get(sid);
          return json(409, { error: `Selected slot is outside ${st?.name || "a store"}'s hours.` });
        }
      }
    }

    // --- Authoritative totals ---
    let subtotal = 0;
    let deliveryFee = 0;
    for (const sid of storeIds) {
      const sub = storeSubtotals.get(sid) || 0;
      subtotal += sub;
      deliveryFee += getDeliveryFee(storeById.get(sid)?.name || "");
    }
    subtotal = round2(subtotal);
    deliveryFee = round2(deliveryFee);
    const convenienceFee = round2(subtotal * CONVENIENCE_PCT);
    const tax = round2(subtotal * TAX_PCT);
    const estimatedTotal = round2(subtotal + deliveryFee + convenienceFee + tax + tip);
    if (estimatedTotal <= 0) return json(400, { error: "Order total must be > $0" });
    const authorizedAmountCents = Math.round(estimatedTotal * (1 + BUFFER_PCT) * 100);

    // --- Stripe customer + intent ---
    const env: StripeEnv = body.environment === "live" ? "live" : "sandbox";
    const stripe = createStripeClient(env);
    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

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
        buffer_pct: String(Math.round(BUFFER_PCT * 100)),
        validated: "true",
      },
    };

    if (body.payment_method_id) {
      intentParams.payment_method = body.payment_method_id;
      intentParams.payment_method_types = ["card"];
    } else {
      intentParams.automatic_payment_methods = { enabled: true };
    }

    const intent = await stripe.paymentIntents.create(intentParams);

    return json(200, {
      client_secret: intent.client_secret,
      payment_intent_id: intent.id,
      authorized_amount: authorizedAmountCents / 100,
      customer_id: customerId,
      // Server-validated breakdown — clients SHOULD use these instead of their own.
      subtotal,
      delivery_fee: deliveryFee,
      convenience_fee: convenienceFee,
      tax,
      tip,
      estimated_total: estimatedTotal,
    });
  } catch (err: any) {
    console.error("create-payment-intent error:", err);
    return json(500, { error: err?.message || "Unknown error" });
  }
});
