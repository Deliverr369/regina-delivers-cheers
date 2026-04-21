import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProductRow {
  id: string;
  name: string;
  brand?: string | null;
  category: string;
  subcategory?: string | null;
  size?: string | null;
  description?: string | null;
  price?: number | null;
}

const SYSTEM_PROMPT = `You are an expert SEO copywriter for "Regina Delivers Cheers", a same-day liquor, beer, wine, smokes and convenience delivery service in Regina, Saskatchewan, Canada.

Your job: write SEO-optimized content that ranks #1 on Google for liquor delivery searches in Regina.

Rules:
- Naturally include keywords like: "Regina liquor delivery", "buy [product] Regina", "same-day delivery Regina", "Saskatchewan", and the product/brand name.
- Description: 90-140 words, friendly, factual, mention tasting notes/use cases when relevant, end with a soft CTA referring to fast Regina delivery.
- Meta title: <= 60 chars, include product name + Regina.
- Meta description: <= 158 chars, compelling, include Regina + delivery.
- Keywords: 6-10 highly-targeted long-tail keywords, lowercase.
- Never invent specific awards, ratings, or medical claims. Never mention competitors.
- For smokes/tobacco/vapes: include "19+ age verification on delivery". No health claims.`;

async function generateForProduct(product: ProductRow, apiKey: string) {
  const userPrompt = `Generate SEO content for this product:

Name: ${product.name}
Brand: ${product.brand || "(unknown)"}
Category: ${product.category}
Subcategory: ${product.subcategory || "(none)"}
Size: ${product.size || "(unspecified)"}
Existing description: ${product.description || "(none)"}
Price: ${product.price ? `$${product.price} CAD` : "(varies)"}`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "save_seo_content",
            description: "Save the SEO content for the product",
            parameters: {
              type: "object",
              properties: {
                description: { type: "string", description: "Long product description, 90-140 words" },
                meta_title: { type: "string", description: "SEO meta title, max 60 chars" },
                meta_description: { type: "string", description: "SEO meta description, max 158 chars" },
                keywords: {
                  type: "array",
                  items: { type: "string" },
                  description: "6-10 long-tail keywords lowercase",
                },
              },
              required: ["description", "meta_title", "meta_description", "keywords"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "save_seo_content" } },
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in AI response");
  return JSON.parse(toolCall.function.arguments);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // AuthZ — allow either admin user OR cron secret
    const cronSecret = req.headers.get("x-cron-secret");
    const isCron = cronSecret === "auto-seo-cron";

    if (!isCron) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await admin.auth.getUser(token);
      if (!userData?.user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: roleCheck } = await admin.rpc("has_role", {
        _user_id: userData.user.id,
        _role: "admin",
      });
      if (!roleCheck) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json().catch(() => ({}));
    const { product_id, batch_size = 10, force = false } = body as {
      product_id?: string;
      batch_size?: number;
      force?: boolean;
    };

    let products: ProductRow[] = [];

    if (product_id) {
      const { data, error } = await admin
        .from("products")
        .select("id, name, category, subcategory, size, description, price")
        .eq("id", product_id)
        .limit(1);
      if (error) throw error;
      products = data || [];
    } else {
      let q = admin
        .from("products")
        .select("id, name, category, subcategory, size, description, price")
        .limit(Math.min(batch_size, 50));
      if (!force) q = q.is("seo_generated_at", null);
      const { data, error } = await q;
      if (error) throw error;
      products = data || [];
    }

    if (products.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, remaining: 0, message: "No products need SEO content" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{ id: string; ok: boolean; error?: string }> = [];

    for (const p of products) {
      try {
        const seo = await generateForProduct(p, LOVABLE_API_KEY);
        const { error: updErr } = await admin
          .from("products")
          .update({
            seo_description: seo.description,
            seo_meta_title: seo.meta_title?.slice(0, 60),
            seo_meta_description: seo.meta_description?.slice(0, 160),
            seo_keywords: seo.keywords,
            seo_generated_at: new Date().toISOString(),
          })
          .eq("id", p.id);
        if (updErr) throw updErr;
        results.push({ id: p.id, ok: true });
      } catch (e) {
        results.push({ id: p.id, ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }

    // Count remaining
    const { count } = await admin
      .from("products")
      .select("id", { count: "exact", head: true })
      .is("seo_generated_at", null);

    return new Response(
      JSON.stringify({
        processed: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
        remaining: count ?? 0,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-seo-content error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
