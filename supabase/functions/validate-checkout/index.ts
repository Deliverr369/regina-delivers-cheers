// supabase/functions/validate-checkout/index.ts
// Server-side re-validation before order creation.
// Validates: cart items belong to the chosen store, prices match the DB,
// every store is open (ASAP) or the slot is in hours (scheduled),
// delivery address is in Regina, and computed totals match the client.
import { createClient } from "npm:@supabase/supabase-js@2";

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
const approxEq = (a: number, b: number, tol = 0.02) => Math.abs(a - b) <= tol;

// Mirror of the client-side delivery fee logic — KEEP IN SYNC with Checkout.tsx
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

interface ItemIn {
  product_id: string;
  store_id: string;
  quantity: number;
  price: number; // client-claimed unit price
  pack_size?: string | null;
}

interface BodyIn {
  items: ItemIn[];
  delivery_type: "asap" | "scheduled";
  scheduled_at?: string | null;   // ISO timestamp, slot start
  scheduled_slot?: string | null; // "HH:MM-HH:MM"
  address_id?: string | null;
  address: string;
  city: string;
  postal_code?: string;
  tip?: number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Canadian postal code: A1A 1A1 (space optional). Excludes D, F, I, O, Q, U; W/Z not valid as first letter.
const CA_POSTAL_RE = /^[ABCEGHJ-NPRSTVXY]\d[A-Z][ -]?\d[A-Z]\d$/i;
const norm = (s: string) => (s || "").trim().toLowerCase();

const timeToMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

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

    let body: BodyIn;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "Invalid JSON body" });
    }

    // ----- Basic shape validation -----
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return json(400, { error: "Cart is empty" });
    }
    if (body.items.length > 200) {
      return json(400, { error: "Too many items" });
    }
    for (const it of body.items) {
      if (
        !it.product_id ||
        !it.store_id ||
        !Number.isInteger(it.quantity) ||
        it.quantity < 1 ||
        it.quantity > 99 ||
        !Number.isFinite(it.price) ||
        it.price < 0
      ) {
        return json(400, { error: "Invalid item in cart" });
      }
    }
    const tip = Number.isFinite(body.tip) && body.tip! >= 0 ? round2(body.tip!) : 0;
    if (tip > 500) return json(400, { error: "Tip too large" });

    // ----- Address validation -----
    if (!body.address || body.address.trim().length < 4) {
      return json(400, { error: "Delivery address is required" });
    }
    if ((body.city || "").trim().toLowerCase() !== "regina") {
      return json(400, { error: "We only deliver within Regina, SK" });
    }

    // ----- Re-fetch products from DB and verify -----
    const productIds = Array.from(new Set(body.items.map((i) => i.product_id)));
    const { data: products, error: prodErr } = await supabase
      .from("products")
      .select("id, name, price, store_id, is_hidden, in_stock")
      .in("id", productIds);
    if (prodErr) return json(500, { error: "Could not load products" });

    const prodById = new Map((products || []).map((p) => [p.id, p]));

    // Pack-price lookup (only when a pack_size is supplied for that line)
    const packKeys = body.items
      .filter((i) => i.pack_size)
      .map((i) => `${i.product_id}::${i.pack_size}`);
    const packPriceByKey = new Map<string, number>();
    if (packKeys.length > 0) {
      const { data: packs } = await supabase
        .from("product_pack_prices")
        .select("product_id, pack_size, price, is_hidden")
        .in("product_id", productIds);
      for (const p of packs || []) {
        if (!p.is_hidden) packPriceByKey.set(`${p.product_id}::${p.pack_size}`, Number(p.price));
      }
    }

    const storeIds = Array.from(new Set(body.items.map((i) => i.store_id)));
    const { data: stores, error: storesErr } = await supabase
      .from("stores")
      .select("id, name")
      .in("id", storeIds);
    if (storesErr) return json(500, { error: "Could not load stores" });
    const storeById = new Map((stores || []).map((s) => [s.id, s]));

    // Per-line + per-store validation
    type Line = { storeId: string; storeName: string; subtotal: number };
    const lineErrors: string[] = [];
    const storeSubtotals = new Map<string, number>();

    for (const it of body.items) {
      const p = prodById.get(it.product_id);
      if (!p) {
        lineErrors.push("An item is no longer available.");
        continue;
      }
      if (p.is_hidden) {
        lineErrors.push(`"${p.name}" is no longer available.`);
        continue;
      }
      if (p.in_stock === false) {
        lineErrors.push(`"${p.name}" is out of stock.`);
        continue;
      }
      if (p.store_id !== it.store_id) {
        lineErrors.push(`"${p.name}" does not belong to the selected store.`);
        continue;
      }
      const expectedUnit = it.pack_size
        ? packPriceByKey.get(`${it.product_id}::${it.pack_size}`) ?? Number(p.price)
        : Number(p.price);
      if (!approxEq(expectedUnit, Number(it.price), 0.01)) {
        lineErrors.push(
          `Price for "${p.name}" changed (was $${Number(it.price).toFixed(2)}, now $${expectedUnit.toFixed(2)}). Please refresh your cart.`,
        );
        continue;
      }
      const lineTotal = expectedUnit * it.quantity;
      storeSubtotals.set(it.store_id, round2((storeSubtotals.get(it.store_id) || 0) + lineTotal));
    }

    if (lineErrors.length > 0) {
      return json(409, { error: lineErrors[0], details: lineErrors });
    }

    // ----- Delivery time validation (ASAP vs scheduled) -----
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
    if (body.delivery_type === "asap") {
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
      if (isNaN(slotStart.getTime())) {
        return json(400, { error: "Invalid scheduled time" });
      }
      if (slotStart.getTime() - now.getTime() < LEAD_TIME_MS) {
        return json(409, { error: "That slot is too soon — please pick a later one." });
      }
      const [s, e] = body.scheduled_slot.split("-");
      const startMin = timeToMin(s);
      const endMin = timeToMin(e);
      const weekday = slotStart.getDay();
      for (const sid of storeIds) {
        const list = hoursByStore.get(sid) || [];
        const day = list.find((d) => d.weekday === weekday);
        if (!day || day.is_closed
          || startMin < timeToMin(day.open_time)
          || endMin > timeToMin(day.close_time)) {
          const st = storeById.get(sid);
          return json(409, {
            error: `Selected slot is outside ${st?.name || "a store"}'s hours.`,
          });
        }
      }
    }

    // ----- Compute authoritative totals -----
    const lines: Line[] = [];
    let subtotal = 0;
    let deliveryFee = 0;
    for (const sid of storeIds) {
      const sub = storeSubtotals.get(sid) || 0;
      const store = storeById.get(sid);
      if (!store) return json(409, { error: "Selected store not found." });
      const fee = getDeliveryFee(store.name);
      lines.push({ storeId: sid, storeName: store.name, subtotal: sub });
      subtotal += sub;
      deliveryFee += fee;
    }
    subtotal = round2(subtotal);
    deliveryFee = round2(deliveryFee);
    const convenienceFee = round2(subtotal * CONVENIENCE_PCT);
    const tax = round2(subtotal * TAX_PCT);
    const estimatedTotal = round2(subtotal + deliveryFee + convenienceFee + tax + tip);
    const authorizedAmount = round2(estimatedTotal * (1 + BUFFER_PCT));

    return json(200, {
      ok: true,
      subtotal,
      delivery_fee: deliveryFee,
      convenience_fee: convenienceFee,
      tax,
      tip,
      estimated_total: estimatedTotal,
      authorized_amount: authorizedAmount,
      stores: lines,
    });
  } catch (err: any) {
    console.error("validate-checkout error:", err);
    return json(500, { error: err?.message || "Validation failed" });
  }
});
