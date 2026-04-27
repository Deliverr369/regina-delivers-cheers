// Streaming support chatbot powered by Lovable AI Gateway
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_PROMPT = `You are "Deliverr Assistant", the friendly support chatbot for Deliverr — a same-day liquor, smokes, and lifestyle delivery service operating ONLY in Regina, Saskatchewan, Canada.

Voice: warm, concise, helpful. Use short paragraphs and bullet lists. Never make up information you don't know — if unsure, suggest contacting human support.

Key facts you must always use when relevant:
- Service area: Regina, SK only. Addresses outside Regina cannot be delivered.
- Delivery hours: 10:00 AM – 10:00 PM, 7 days a week (subject to each store's hours).
- Typical delivery time: 25–60 minutes.
- Free delivery on orders over $50. Delivery fees: Superstore $10, Costco $15, all other stores $7.
- Age requirement: 19+ — valid government photo ID is required at the door, no exceptions.
- Payment: Visa, Mastercard, Amex (credit and debit). NO cash on delivery.
- Stores available: Sobeys Liquor, Co-op Liquor, Costco Liquor, Superstore Liquor and others.
- Categories: Beer, Wine, Spirits, Smokes, Ciders & Seltzers.
- Cancellation: full refund before shopping starts; $10 fee after that.
- Refunds: 3–5 business days.
- Support: phone 306-533-3333, email support@deliverr.ca.
- Privacy questions: privacy@deliverr.app.

Helpful behaviour:
- Answer general FAQs (orders, payments, delivery, account, ID rules) directly.
- Walk users through tasks step-by-step (placing an order, resetting password, updating address).
- For order-specific issues (lost order, refund disputes, missing items), collect the order # and politely direct them to call 306-533-3333 or email support@deliverr.ca.
- If asked about anything outside Deliverr (random trivia, coding help, news), kindly redirect to Deliverr-related help.
- Never promise alcohol delivery to minors. Never bypass the 19+ rule.
- Keep responses under ~6 short sentences unless the user asks for detail.`;

const ORDER_STATUS_GUIDANCE = `
You are now in ORDER STATUS MODE. The user has provided an order reference and you have the order's current data below. Your job:

1. Greet briefly and confirm the order short ID.
2. Summarise current status in plain English (e.g. "We've confirmed your order and a shopper is on the way to the store").
3. Give the BEST NEXT STEPS the user can take right now, tailored to the status:
   - pending → reassure, ETA window, mention they can still cancel for a full refund.
   - confirmed → store is being notified; ETA window; ID reminder.
   - shopping → shopper is picking items; substitutions may happen; final total may shift slightly.
   - out_for_delivery → driver on the way; have ID + payment card holder ready; track via Orders page.
   - delivered → confirm receipt; how to report missing/damaged items within 24h.
   - cancelled → refund timing (3–5 business days) and how to reorder.
4. If anything seems wrong (very old, payment failed, missing items), tell them to call 306-533-3333 or email support@deliverr.ca and quote the short ID.
5. Keep it under 6 short sentences plus a tight bullet list. Use markdown.
6. NEVER invent items, totals, or addresses that aren't in the order data provided.`;

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

async function fetchOrderContext(orderRef: string, userJwt: string | null) {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Resolve user from JWT (optional but enforced if present)
  let userId: string | null = null;
  if (userJwt) {
    const { data } = await admin.auth.getUser(userJwt);
    userId = data.user?.id ?? null;
  }

  const ref = orderRef.trim().replace(/^#/, "");
  // Match either full UUID or 8-char short prefix (case-insensitive)
  const isUuid = /^[0-9a-f-]{32,36}$/i.test(ref);
  let query = admin
    .from("orders")
    .select(
      "id,user_id,status,created_at,updated_at,total,estimated_total,final_total,subtotal,delivery_fee,tax,delivery_address,delivery_city,delivery_postal_code,payment_status,store_id,order_items(product_name,quantity,price,final_price)",
    )
    .limit(1);

  if (isUuid) {
    query = query.eq("id", ref);
  } else {
    // short id: match prefix on text-cast id
    query = query.ilike("id::text", `${ref.toLowerCase()}%`);
  }

  const { data: orders, error } = await query;
  if (error || !orders || orders.length === 0) {
    return { found: false as const, reason: "not_found" };
  }
  const order = orders[0];

  if (userId && order.user_id !== userId) {
    return { found: false as const, reason: "not_authorized" };
  }

  // Optional store name
  let storeName: string | null = null;
  if (order.store_id) {
    const { data: store } = await admin
      .from("stores")
      .select("name")
      .eq("id", order.store_id)
      .maybeSingle();
    storeName = store?.name ?? null;
  }

  return {
    found: true as const,
    order: {
      short_id: shortId(order.id),
      status: order.status,
      payment_status: order.payment_status,
      created_at: order.created_at,
      updated_at: order.updated_at,
      total: order.final_total ?? order.estimated_total ?? order.total,
      delivery_fee: order.delivery_fee,
      tax: order.tax,
      address: `${order.delivery_address}, ${order.delivery_city ?? "Regina"}${order.delivery_postal_code ? " " + order.delivery_postal_code : ""}`,
      store_name: storeName,
      items: (order.order_items || []).map((i: any) => ({
        name: i.product_name,
        qty: i.quantity,
        price: i.final_price ?? i.price,
      })),
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, mode, orderId } = await req.json();

    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages must be an array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let systemPrompt = BASE_PROMPT;

    if (mode === "order_status" && typeof orderId === "string" && orderId.trim()) {
      const authHeader = req.headers.get("Authorization") ?? "";
      const jwt = authHeader.toLowerCase().startsWith("bearer ")
        ? authHeader.slice(7)
        : null;

      const result = await fetchOrderContext(orderId, jwt);

      if (!result.found) {
        const reason =
          result.reason === "not_authorized"
            ? "The order exists but does not belong to the signed-in account. Politely ask the user to sign in with the account that placed the order, or call 306-533-3333."
            : `We could not find an order matching "${orderId}". Politely ask the user to double-check the order # (8-character code from their confirmation email) or to contact 306-533-3333.`;
        systemPrompt = `${BASE_PROMPT}\n\n${ORDER_STATUS_GUIDANCE}\n\nORDER LOOKUP RESULT: NOT FOUND.\n${reason}`;
      } else {
        systemPrompt = `${BASE_PROMPT}\n\n${ORDER_STATUS_GUIDANCE}\n\nORDER DATA (JSON):\n${JSON.stringify(result.order, null, 2)}`;
      }
    }

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-20),
        ],
      }),
    });

    if (!upstream.ok) {
      if (upstream.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (upstream.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const txt = await upstream.text();
      console.error("AI gateway error", upstream.status, txt);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(upstream.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("support-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
