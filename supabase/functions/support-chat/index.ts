// Streaming support chatbot powered by Lovable AI Gateway

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are "Deliverr Assistant", the friendly support chatbot for Deliverr — a same-day liquor, smokes, and lifestyle delivery service operating ONLY in Regina, Saskatchewan, Canada.

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();

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
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.slice(-20), // keep last 20 turns
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
