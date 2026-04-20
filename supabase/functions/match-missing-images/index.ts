import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";

// In-memory cache of mapped URLs per source per warm instance.
const SITE_LINKS_CACHE = new Map<string, string[]>();

interface ProductRow {
  id: string;
  name: string;
  size: string | null;
  category: string;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(s: string): Set<string> {
  return new Set(normalize(s).split(" ").filter((t) => t.length > 2));
}

function jaccardScore(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersect = 0;
  for (const t of a) if (b.has(t)) intersect++;
  const union = a.size + b.size - intersect;
  return intersect / union;
}

async function mapSite(domain: string, firecrawlKey: string): Promise<string[]> {
  if (SITE_LINKS_CACHE.has(domain)) return SITE_LINKS_CACHE.get(domain)!;
  const res = await fetch(`${FIRECRAWL_V2}/map`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${firecrawlKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: `https://${domain}`, limit: 5000, includeSubdomains: false }),
  });
  if (!res.ok) {
    console.error("Map failed", res.status, await res.text());
    return [];
  }
  const json = await res.json();
  const links: string[] = (json.links || json.data?.links || [])
    .map((l: any) => (typeof l === "string" ? l : l?.url))
    .filter(Boolean);
  SITE_LINKS_CACHE.set(domain, links);
  return links;
}

function rankCandidateUrls(product: ProductRow, links: string[], max = 5): string[] {
  const productTokens = tokenize(`${product.name} ${product.size ?? ""}`);
  const scored = links
    .map((url) => {
      const path = decodeURIComponent(url.split("?")[0].split("#")[0]);
      // skip obvious non-product pages
      if (/\/(cart|checkout|account|login|search|policies|pages|blogs|collections?$)/i.test(path)) return null;
      const tokens = tokenize(path);
      const score = jaccardScore(productTokens, tokens);
      return score > 0 ? { url, score } : null;
    })
    .filter((x): x is { url: string; score: number } => x !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.url);
  return scored;
}

async function scrapePage(url: string, firecrawlKey: string): Promise<{ markdown?: string; html?: string; metadata?: any } | null> {
  try {
    const res = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "html"],
        onlyMainContent: true,
      }),
    });
    if (!res.ok) {
      console.error("Scrape failed", url, res.status);
      return null;
    }
    const json = await res.json();
    return {
      markdown: json.markdown ?? json.data?.markdown,
      html: json.html ?? json.data?.html,
      metadata: json.metadata ?? json.data?.metadata,
    };
  } catch (e) {
    console.error("Scrape error", url, e);
    return null;
  }
}

function extractImageUrls(html: string, baseUrl: string): string[] {
  if (!html) return [];
  const urls = new Set<string>();
  const base = new URL(baseUrl);
  // Standard <img src="...">
  const imgRegex = /<img[^>]+(?:src|data-src|data-original)\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRegex.exec(html)) !== null) {
    let u = m[1];
    if (u.startsWith("//")) u = base.protocol + u;
    else if (u.startsWith("/")) u = base.origin + u;
    if (!/^https?:\/\//i.test(u)) continue;
    if (/\.(svg|gif)(\?|$)/i.test(u)) continue;
    if (/(logo|icon|sprite|placeholder|loading)/i.test(u)) continue;
    urls.add(u.split("?")[0]);
  }
  // og:image
  const ogRegex = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i;
  const ogMatch = ogRegex.exec(html);
  if (ogMatch) urls.add(ogMatch[1]);
  return Array.from(urls).slice(0, 12);
}

async function aiPickBestMatch(
  product: ProductRow,
  candidates: { pageUrl: string; title?: string; imageUrls: string[]; snippet: string }[],
  lovableKey: string,
): Promise<{ image_url: string; confidence: "high" | "medium" | "low" } | null> {
  if (candidates.length === 0) return null;
  const sys = `You are a precise product matching assistant. The user has a product from a Saskatchewan liquor delivery catalog and a list of candidate product pages scraped from a competitor liquor store. Decide which page truly matches the same product (same brand, same product name, same size/pack), and return the single best image URL from that page. If no candidate is a clear match, return no_match=true.`;
  const userPayload = {
    target_product: {
      name: product.name,
      size: product.size,
      category: product.category,
    },
    candidates: candidates.map((c, i) => ({
      index: i,
      page_url: c.pageUrl,
      page_title: c.title,
      snippet: c.snippet.slice(0, 600),
      image_urls: c.imageUrls,
    })),
  };

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "report_match",
            description: "Report the chosen match",
            parameters: {
              type: "object",
              properties: {
                no_match: { type: "boolean", description: "true if none of the candidates is a clear match" },
                candidate_index: { type: "number", description: "0-based index of the matching candidate" },
                image_url: { type: "string", description: "best image URL chosen from that candidate's image_urls" },
                confidence: { type: "string", enum: ["high", "medium", "low"] },
              },
              required: ["no_match"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "report_match" } },
    }),
  });
  if (!res.ok) {
    console.error("AI match failed", res.status, await res.text().catch(() => ""));
    return null;
  }
  const data = await res.json();
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) return null;
  let args: any;
  try { args = JSON.parse(call.function.arguments); } catch { return null; }
  if (args.no_match) return null;
  if (!args.image_url || typeof args.image_url !== "string") return null;
  if (args.confidence === "low") return null; // be safe
  return { image_url: args.image_url, confidence: args.confidence ?? "medium" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    if (!firecrawlKey) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(supabaseUrl, serviceKey);
    const anon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await anon.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const sourceUrl: string = body.sourceUrl;
    const batchSize: number = Math.min(Number(body.batchSize) || 5, 10);
    const category: string | null = body.category ?? null;
    if (!sourceUrl) {
      return new Response(JSON.stringify({ error: "sourceUrl required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const domain = new URL(sourceUrl).hostname;

    // 1. Map site (cached)
    const links = await mapSite(domain, firecrawlKey);
    if (links.length === 0) {
      return new Response(JSON.stringify({ error: "Could not map site", processed: 0, updated: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Pick a batch of products with no image, deduped by name+size to avoid wasting calls
    let q = supabase
      .from("products")
      .select("id, name, size, category, store_id")
      .or("image_url.is.null,image_url.eq.")
      .eq("is_hidden", false)
      .limit(batchSize * 4); // overfetch since we dedupe
    if (category) q = q.eq("category", category as any);
    const { data: candidatesRaw, error: pErr } = await q;
    if (pErr) throw pErr;

    const seen = new Set<string>();
    const uniqueProducts: ProductRow[] = [];
    for (const p of (candidatesRaw ?? []) as any[]) {
      const key = `${normalize(p.name)}|${normalize(p.size ?? "")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      uniqueProducts.push({ id: p.id, name: p.name, size: p.size, category: p.category });
      if (uniqueProducts.length >= batchSize) break;
    }

    const results: any[] = [];
    let updated = 0;

    for (const product of uniqueProducts) {
      try {
        const candidateUrls = rankCandidateUrls(product, links, 4);
        if (candidateUrls.length === 0) {
          results.push({ id: product.id, name: product.name, status: "no_candidates" });
          continue;
        }
        const scrapedAll = await Promise.all(candidateUrls.map((u) => scrapePage(u, firecrawlKey)));
        const candidates = candidateUrls.map((url, i) => {
          const s = scrapedAll[i];
          if (!s) return null;
          const html = s.html ?? "";
          const md = s.markdown ?? "";
          const imageUrls = extractImageUrls(html, url);
          if (imageUrls.length === 0) return null;
          return {
            pageUrl: url,
            title: s.metadata?.title,
            snippet: md.slice(0, 800),
            imageUrls,
          };
        }).filter(Boolean) as any[];

        if (candidates.length === 0) {
          results.push({ id: product.id, name: product.name, status: "no_scrape" });
          continue;
        }

        const pick = await aiPickBestMatch(product, candidates, lovableKey);
        if (!pick) {
          results.push({ id: product.id, name: product.name, status: "no_match" });
          continue;
        }

        // Update ALL store rows that share the same normalized name+size+category, not just this id.
        const sameKey = (candidatesRaw ?? []).filter((c: any) =>
          normalize(c.name) === normalize(product.name) &&
          normalize(c.size ?? "") === normalize(product.size ?? "") &&
          c.category === product.category
        );
        const idsToUpdate = sameKey.length > 0 ? sameKey.map((c: any) => c.id) : [product.id];
        const { error: uErr } = await supabase
          .from("products")
          .update({ image_url: pick.image_url })
          .in("id", idsToUpdate);
        if (uErr) {
          results.push({ id: product.id, name: product.name, status: "update_failed", error: uErr.message });
        } else {
          updated += idsToUpdate.length;
          results.push({ id: product.id, name: product.name, status: "matched", image_url: pick.image_url, confidence: pick.confidence, applied_to: idsToUpdate.length });
        }
      } catch (e) {
        console.error("Product matching error", product.id, e);
        results.push({ id: product.id, name: product.name, status: "error", error: String(e) });
      }
    }

    // Count remaining missing for reporting
    let remainingQ = supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .or("image_url.is.null,image_url.eq.")
      .eq("is_hidden", false);
    if (category) remainingQ = remainingQ.eq("category", category as any);
    const { count: remaining } = await remainingQ;

    return new Response(JSON.stringify({
      processed: uniqueProducts.length,
      updated,
      remaining: remaining ?? null,
      mapped_links: links.length,
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("match-missing-images error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
