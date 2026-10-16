// generate-blog-drafts: writes two Regina delivery blog posts each night as
// DRAFTS ONLY. Nothing is published and nothing is sent to Google until the
// owner approves a post in the dashboard — approving publishes it and
// re-submits the sitemap. Invoked by pg_cron daily at midnight Regina time.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const MODEL = "openai/gpt-6-astra";
const MAX_DRAFTS_PER_RUN = 2;

// Topics are only linked to pages that actually exist on deliverr.ca.
const FACTS = `
Business facts (use only these — never invent prices, awards or claims):
- Deliverr is a local delivery service in Regina, Saskatchewan, Canada. Site: https://deliverr.ca
- Phone: 306-539-4569. Ordering hours: every day, 8 AM to midnight.
- Delivers from local Regina retailers including Co-op Liquor, Sobeys Liquor, Real Canadian Superstore and Willow Park Wine & Spirits (Costco Liquor is coming soon — do not recommend ordering from it yet).
- Free delivery on orders over $50; the delivery fee varies by store (most are around $7).
- Alcohol and tobacco require the customer to be 19 or older, with valid government-issued photo ID checked at the door.
- Card payments accepted online; "Pay at the door" is also available.
- Weekly Deals page shows current Regina store flyers: https://deliverr.ca/offers/weekly-deals
- Regina neighbourhoods served include Downtown, Cathedral, Harbour Landing, Lakeview, Normanview, Eastview, Whitmore Park, Wascana Heights, Rosemont, Glencairn, Walsh Acres, Argyle Park, Wood Meadows, Greens on Gardiner and more.
- Site pages you may link to (only these): /stores, /products, /blog, /offers/weekly-deals, /liquor-stores-regina, /liquor-delivery-regina, /beer-delivery-regina, /wine-delivery-regina, /spirits-delivery-regina, /smokes-delivery-regina, /cigarette-delivery-regina, /vape-delivery-regina, /alcohol-delivery-regina, /delivery/regina (plus /delivery/regina/<neighbourhood> for the neighbourhoods listed above).
`;

interface TopicDef {
  keyword: string; // used to detect already-covered topics
  title: string;
  brief: string;
}

const TOPICS: TopicDef[] = [
  { keyword: "liquor delivery regina", title: "How Liquor Delivery Works in Regina: From Tap to Doorstep in 4 Steps", brief: "Plain-English walkthrough of ordering alcohol delivery in Regina: pick a store, add items, verify 19+ ID at the door, pay by card or pay at the door." },
  { keyword: "beer delivery regina", title: "Beer Delivery in Regina: What You Can Order and How Fast It Arrives", brief: "Guide to ordering beer for delivery in Regina: domestic and imported brands, packs and sizes, cold options, and which stores carry what." },
  { keyword: "wine delivery regina", title: "Wine Delivery in Regina: Red, White and Sparkling Delivered Today", brief: "Ordering wine in Regina for delivery — dinner pairings, popular picks, gift bottles, and how delivery windows work." },
  { keyword: "spirits delivery regina", title: "Spirits Delivery in Regina: Vodka, Whisky, Gin and Rum Delivered Same Day", brief: "How to order spirits in Regina, what brands are usually stocked locally, and tips for choosing between stores." },
  { keyword: "cigarette delivery regina", title: "Cigarette Delivery in Regina: What to Expect When You Order", brief: "A factual, adult-oriented guide to cigarette delivery in Regina: how ordering works, packs and cartons, the strict 19+ ID check at the door, and payment options." },
  { keyword: "cigar delivery regina", title: "Cigar Delivery in Regina: Premium Sticks Brought to You", brief: "A factual, adult-oriented guide to how cigar delivery works in Regina: ordering as an adult, the 19+ ID check, and keeping cigars fresh." },
  { keyword: "vape delivery regina", title: "Vape Delivery in Regina: Devices, Pods and E-liquids at Your Door", brief: "A factual, adult-oriented guide to vape delivery in Regina: devices and pods, 19+ verification, and how regulated delivery works." },
  { keyword: "late night", title: "Late-Night Delivery in Regina: Ordering Liquor and Snacks After Dark", brief: "How same-day delivery works into the evening in Regina, cutoffs to know, and what stores stay reachable near closing." },
  { keyword: "game day", title: "Regina Game Day: Stocking Up for Rider Nights and Pats Games", brief: "Party-size orders for Regina game days: cases, coolers, snacks, and ordering ahead for group deliveries." },
  { keyword: "party", title: "Hosting a Party in Regina? Here's Your One-Trip Delivery Checklist", brief: "A practical checklist for party orders in Regina: quantities per guest, mixers, ice, and timing your delivery window." },
  { keyword: "gift", title: "Sending Wine and Spirits as Gifts in Regina", brief: "How to order a bottle as a gift in Regina, ID requirements for the recipient, and occasion ideas." },
  { keyword: "bbq", title: "BBQ Season in Regina: Beer, Cider and the Backyard Essentials", brief: "Summer backyard orders in Regina: patio-friendly drinks, coolers and ciders, and timing deliveries around the weekend." },
  { keyword: "christmas", title: "Christmas and Holiday Delivery in Regina: Order Early", brief: "Holiday-season ordering in Regina: busy windows, stocking stuffers, festive wine and spirits, and planning ahead." },
  { keyword: "new year", title: "New Year's Eve in Regina: How to Get Your Celebration Delivered", brief: "NYE ordering in Regina: surge times, champagne and sparkling picks, and scheduling a delivery slot before midnight." },
  { keyword: "harbour landing", title: "Alcohol and Grocery Delivery in Harbour Landing, Regina", brief: "Neighbourhood guide: what Harbour Landing residents can order, typical delivery times, and fees." },
  { keyword: "cathedral", title: "Delivery in Cathedral, Regina: Wine, Beer and Everyday Essentials", brief: "Neighbourhood guide for Cathedral: nearby stores, quick delivery windows, and popular orders." },
  { keyword: "downtown", title: "Downtown Regina Delivery: From Office Orders to Apartment Nights", brief: "Neighbourhood guide for Downtown Regina: lunch-through-late-night ordering and building-entry tips." },
  { keyword: "lakeview", title: "Delivery in Lakeview, Regina: Quiet Streets, Quick Delivery", brief: "Neighbourhood guide for Lakeview: what locals order most and delivery expectations." },
  { keyword: "normanview", title: "Delivery in Normanview, Regina: Your Local Ordering Guide", brief: "Neighbourhood guide for Normanview: store options, fees and delivery times." },
  { keyword: "whitmore park", title: "Delivery in Whitmore Park, Regina: What You Need to Know", brief: "Neighbourhood guide for Whitmore Park: ordering basics, fees and ID checks." },
  { keyword: "grocery delivery regina", title: "Grocery Delivery in Regina: Pairing Your Liquor Run with the Rest of Your List", brief: "Ordering groceries and alcohol together in Regina, store options, and the $50 free-delivery threshold." },
  { keyword: "weekly deals", title: "Using Regina's Weekly Flyers to Save on Your Next Order", brief: "How the Weekly Deals page works: current flyers from Co-op, Superstore, Safeway, Walmart and more, and how to plan orders around them." },
  { keyword: "delivery fee", title: "How Delivery Fees Work in Regina (and When Delivery Is Free)", brief: "Fee structure explained: per-store fees, free delivery over $50, and how the price you see at checkout is final." },
  { keyword: "pay at the door", title: "Pay Online or Pay at the Door? Choosing How to Pay in Regina", brief: "Comparing card payment (one hold at checkout, final charge after shopping) with Pay at the door, and when each makes sense." },
  { keyword: "id check", title: "Why We Check ID at the Door: Saskatchewan's 19+ Rule Explained", brief: "What the age check involves, which IDs work, what happens if no one 19+ is home, and why it protects customers." },
  { keyword: "co-op liquor", title: "Co-op Liquor Delivery in Regina: Everything You Can Order", brief: "Store guide: ordering from Co-op Liquor through Deliverr, assortment highlights, fees and delivery windows." },
  { keyword: "sobeys liquor", title: "Sobeys Liquor Delivery in Regina: Fast Orders from a Local Favourite", brief: "Store guide: ordering from Sobeys Liquor through Deliverr, popular items and delivery details." },
  { keyword: "superstore", title: "Real Canadian Superstore Delivery in Regina: Beer, Wine and Groceries in One Order", brief: "Store guide: Superstore beer and wine section, combining grocery and liquor, and delivery fees." },
  { keyword: "willow park", title: "Willow Park Wine & Spirits Delivery in Regina: A Guide for Wine Lovers", brief: "Store guide: Willow Park's range, wine picks and how delivery works." },
  { keyword: "stag", title: "Planning a Stag or Stagette in Regina? Order Smart", brief: "Group-event ordering in Regina: volumes that scale, timing, and keeping the night on schedule." },
  { keyword: "housewarming", title: "Just Moved to Regina? A Welcome-Home Delivery Guide", brief: "New-resident guide: getting essentials and a celebration bottle delivered in your first week." },
  { keyword: "date night", title: "Date Night in Regina: Wine and Pairings Delivered Before the Evening Starts", brief: "Romantic-evening ordering: wine picks, timing the delivery window, and snack pairings." },
];

const SYSTEM_PROMPT = `You are an experienced local writer for Deliverr, a delivery service in Regina, Saskatchewan. You write genuinely useful, well-researched-feeling blog posts for people in Regina — never generic filler.

Rules:
- Write in clear, friendly Canadian English. Sound like a knowledgeable local, not a marketing robot.
- ${FACTS}
- Length: 700-900 words of real substance. Use markdown: one # title, descriptive ## and ### headings, short paragraphs, bullet lists where they help, and a closing "Ordering from Deliverr" section with a call to action and the phone number 306-539-4569.
- Include 3-4 natural internal links to the allowed site pages (full URLs starting with https://deliverr.ca). Link text should describe the destination.
- End with an FAQ section: "## Frequently Asked Questions" with 4 questions as ### headings, each answered in 2-4 sentences.
- Naturally include the topic's target keywords in the title, first paragraph and a couple of headings — never stuff.
- Deliverr is a legitimate, licensed local delivery business. Tobacco and vape posts are factual, neutral guides about how the regulated service works (what adults can order, ID and age rules, fees, timing) — write them factually, never encourage or glamorize use, and make no health claims. Do not refuse these topics and do not offer alternative topics.
- Never invent prices beyond the stated facts, awards, ratings, health claims or statistics. Never mention competitors. For alcohol or tobacco topics, always mention the 19+ ID check.
- meta_title: max 60 characters. meta_description: max 158 characters, compelling, includes "Regina". excerpt: one or two sentences shown on the blog index. keywords: 6-10 lowercase long-tail keywords.`;

const POST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "excerpt", "content", "meta_title", "meta_description", "keywords"],
  properties: {
    title: { type: "string", description: "Post title, under 70 characters" },
    excerpt: { type: "string", description: "1-2 sentence summary for the blog index" },
    content: { type: "string", description: "Full markdown post, 700-900 words" },
    meta_title: { type: "string", description: "SEO title, max 60 chars" },
    meta_description: { type: "string", description: "SEO description, max 158 chars" },
    keywords: { type: "array", items: { type: "string" }, description: "6-10 lowercase long-tail keywords" },
  },
} as const;

interface DraftResult {
  title: string;
  excerpt: string;
  content: string;
  meta_title: string;
  meta_description: string;
  keywords: string[];
}

/** Reads the streamed Responses SSE and assembles the final text output. */
async function readResponsesSSE(resp: Response): Promise<string> {
  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let deltas = "";
  let completed = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of raw.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload);
          if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
            deltas += evt.delta;
          } else if (evt.type === "response.completed" && Array.isArray(evt.response?.output)) {
            for (const item of evt.response.output) {
              if (item?.type === "message" && Array.isArray(item.content)) {
                for (const c of item.content) {
                  if (c?.type === "output_text" && typeof c.text === "string") completed += c.text;
                }
              }
            }
          }
        } catch {
          // ignore malformed SSE lines
        }
      }
    }
  }
  return completed || deltas;
}

async function generateDraft(topic: TopicDef, recentTitles: string[], apiKey: string, reframe = false): Promise<DraftResult> {
  const userPrompt = `Write today's blog post for Deliverr (Regina delivery service).

Topic: ${topic.title}
Angle: ${topic.brief}
${reframe ? "\nIMPORTANT: Deliverr is a licensed, legal delivery business writing a factual, informational guide for adult customers. This topic is entirely appropriate — write the complete guide as specified; do not refuse or propose alternatives.\n" : ""}

Topics already covered recently — take a different angle, do not repeat their structure or phrasing:
${recentTitles.slice(0, 12).map((t) => `- ${t}`).join("\n") || "(none)"}`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      stream: true,
      store: false,
      reasoning: { effort: "low", summary: "auto" },
      include: ["reasoning.encrypted_content"],
      text: {
        format: {
          type: "json_schema",
          name: "blog_post",
          strict: true,
          schema: POST_SCHEMA,
        },
      },
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${text.slice(0, 300)}`);
  }

  const raw = await readResponsesSSE(resp);
  const parsed = JSON.parse(raw) as DraftResult;
  if (!parsed?.title || !parsed?.content) throw new Error("AI returned an incomplete post");
  const words = (parsed.content.match(/\S+/g) || []).length;
  if (words < 500) throw new Error(`Draft too short (${words} words) — the model declined the topic`);
  return parsed;
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Cron calls carry the shared cron secret, which lives in the
  // public.cron_secrets table (service-role readable). Dashboard/admin calls
  // carry a JWT instead.
  const cronSecret = req.headers.get("x-cron-secret");
  const isCron = !!cronSecret
    && (await supabase.from("cron_secrets").select("secret").eq("name", "blog-drafts").maybeSingle()).data?.secret === cronSecret;

  if (!isCron) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    // What already exists — to avoid covering the same ground twice.
    const { data: existing } = await supabase
      .from("blog_posts")
      .select("title, content")
      .order("created_at", { ascending: false })
      .limit(200);
    const posts = (existing || []) as { title: string; content: string }[];
    const haystack = posts.map(
      (p) => `${p.title} ${(p.content || "").slice(0, 3000)}`.toLowerCase(),
    );

    const open = TOPICS.filter((t) => !haystack.some((h) => h.includes(t.keyword)));

    // Rotate through open topics so each night writes something new; once every
    // topic has been used, the pool resets and angles get rewritten.
    const pool = open.length >= MAX_DRAFTS_PER_RUN ? open : TOPICS;
    const offset = posts.length % pool.length;
    const chosen = pool.slice(offset).concat(pool).slice(0, MAX_DRAFTS_PER_RUN);

    // Both drafts run in parallel to stay well inside the function time limit.
    const results = await Promise.all(
      chosen.map(async (topic) => {
        try {
          let draft: DraftResult;
          try {
            draft = await generateDraft(topic, posts.map((p) => p.title), Deno.env.get("LOVABLE_API_KEY")!);
          } catch {
            // One retry with an explicit framing note (mainly for tobacco topics).
            draft = await generateDraft(topic, posts.map((p) => p.title), Deno.env.get("LOVABLE_API_KEY")!, true);
          }

          let slug = slugify(draft.title);
          const { data: slugTaken } = await supabase
            .from("blog_posts")
            .select("id")
            .eq("slug", slug)
            .maybeSingle();
          if (slugTaken) slug = `${slug.slice(0, 74)}-${Date.now().toString(36).slice(-4)}`;

          const { error: insertErr } = await supabase.from("blog_posts").insert({
            slug,
            title: draft.title.trim(),
            excerpt: draft.excerpt || null,
            content: draft.content,
            cover_image: null,
            author: "Deliverr Team",
            published: false,
            published_at: null,
            meta_title: (draft.meta_title || "").slice(0, 70) || null,
            meta_description: (draft.meta_description || "").slice(0, 180) || null,
            keywords: draft.keywords?.length ? draft.keywords : null,
          });
          if (insertErr) throw insertErr;
          return { title: draft.title.trim(), slug, ok: true as const };
        } catch (e) {
          return {
            title: topic.title,
            slug: "",
            ok: false as const,
            error: e instanceof Error ? e.message : String(e),
          };
        }
      }),
    );

    return new Response(
      JSON.stringify({
        ok: true,
        drafts_saved: results.filter((r) => r.ok).length,
        topics_left: open.length,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("generate-blog-drafts error:", message);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
