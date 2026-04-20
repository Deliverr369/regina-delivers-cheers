import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";

interface ProductRow {
  id: string;
  name: string;
  size: string | null;
  category: string;
}

interface MapHit { url: string; title?: string; description?: string }

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Stop words and packaging words that shouldn't count toward match score
const STOP = new Set([
  "the","and","with","for","from","pack","cans","can","bottle","bottles","btl","btls",
  "case","cases","tall","tallboy","tallboys","slim","sleek","stubby","ml","mls","ltr",
  "litre","liter","l","oz","x","of","pk","ea","each","new","limited","edition",
]);

function tokenize(s: string, minLen = 2): string[] {
  return normalize(s).split(" ")
    .filter((t) => t.length > minLen && !STOP.has(t) && !/^\d+$/.test(t));
}

// Brand/keyword tokens (preserve numbers like "1792", "100", "7")
function keywordTokens(s: string): string[] {
  return normalize(s).split(" ")
    .filter((t) => t.length >= 2 && !STOP.has(t));
}

// Extract a numeric volume in mL and a pack count from a string like
// "Smirnoff Ice Raspberry 6 x 355 mL cans" or "Smirnoff Vodka 1.75L"
function parseSize(s: string): { ml?: number; pack?: number } {
  const lower = (s || "").toLowerCase();
  let ml: number | undefined;
  let pack: number | undefined;

  // packs e.g. 6 x 355, 12pk, 24-pack
  const pm = lower.match(/(\d{1,3})\s*(?:x|×|pk|pack|cans?|bottles?|btls?)\b/);
  if (pm) pack = Number(pm[1]);

  // explicit ml
  const mlm = lower.match(/(\d{2,4})\s*ml/);
  if (mlm) ml = Number(mlm[1]);
  // litres
  const lm = lower.match(/(\d(?:\.\d{1,2})?)\s*l(?:tr|iter|itre)?\b/);
  if (lm && ml === undefined) ml = Math.round(Number(lm[1]) * 1000);

  return { ml, pack };
}

function scoreCandidate(product: ProductRow, hit: MapHit): number {
  const haystack = `${hit.title ?? ""} ${hit.description ?? ""} ${hit.url.replace(/[-_/]/g, " ")}`;
  const productText = `${product.name} ${product.size ?? ""}`;

  // Token overlap on meaningful words (excluding packaging stop-words)
  const productTokens = new Set(tokenize(productText));
  const hayTokens = new Set(tokenize(haystack));
  let overlap = 0;
  for (const t of productTokens) if (hayTokens.has(t)) overlap++;
  let score = productTokens.size > 0 ? overlap / productTokens.size : 0; // 0..1

  // Bonus for keyword (incl. number) matches like "1792", "100", "7"
  const pKeys = new Set(keywordTokens(productText));
  const hKeys = new Set(keywordTokens(haystack));
  let keyHits = 0;
  for (const t of pKeys) if (hKeys.has(t)) keyHits++;
  score += Math.min(keyHits, 4) * 0.05;

  // Strong bonus if the FIRST word of the product name (usually the brand) appears
  const firstWord = tokenize(product.name)[0];
  if (firstWord && hayTokens.has(firstWord)) score += 0.25;

  // Bigram bonus: e.g. "smirnoff ice", "twisted tea", "bud light"
  const pTokensArr = tokenize(product.name);
  const hayNorm = ` ${normalize(haystack)} `;
  for (let i = 0; i < pTokensArr.length - 1; i++) {
    const bg = ` ${pTokensArr[i]} ${pTokensArr[i + 1]} `;
    if (hayNorm.includes(bg)) score += 0.2;
  }

  // Size match bonus / penalty (volume in mL)
  const ps = parseSize(productText);
  const hs = parseSize(haystack);
  if (ps.ml && hs.ml) {
    if (ps.ml === hs.ml) score += 0.4;
    else if (Math.abs(ps.ml - hs.ml) / ps.ml < 0.05) score += 0.2;
    else score -= 0.25;
  }
  // Pack match: same pack is a big win, mismatch is a soft penalty (some sites only list one pack size)
  if (ps.pack && hs.pack) {
    if (ps.pack === hs.pack) score += 0.4;
    else if (Math.abs(ps.pack - hs.pack) <= 1) score -= 0.05;
    else score -= 0.15;
  } else if (ps.pack && !hs.pack) {
    // Don't penalize — site may not advertise pack count in title
  }

  // Penalize obvious deposit / non-product pages
  if (/deposit\s+for/i.test(hit.title ?? "")) score -= 1;
  if (/\/(deposit|gift|policies|pages|blogs|collections\/?$)/i.test(hit.url)) score -= 0.5;

  return score;
}

async function searchSite(domain: string, query: string, firecrawlKey: string): Promise<MapHit[]> {
  try {
    const res = await fetch(`${FIRECRAWL_V2}/map`, {
      method: "POST",
      headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: `https://${domain}`, limit: 25, search: query }),
    });
    if (!res.ok) {
      console.error("Map failed", res.status, await res.text().catch(() => ""));
      return [];
    }
    const json = await res.json();
    const raw = json.links ?? json.data?.links ?? [];
    return raw
      .map((l: any) => typeof l === "string" ? { url: l } : { url: l?.url, title: l?.title, description: l?.description })
      .filter((x: any) => x?.url && /\/products?\//i.test(x.url));
  } catch (e) {
    console.error("Map error", e);
    return [];
  }
}

async function scrapeImage(url: string, firecrawlKey: string): Promise<string | null> {
  try {
    const res = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        formats: ["html"],
        onlyMainContent: true,
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const html: string = json.html ?? json.data?.html ?? "";
    const meta = json.metadata ?? json.data?.metadata ?? {};

    // Prefer og:image (often the main product image on Shopify)
    if (typeof meta.ogImage === "string" && /^https?:\/\//.test(meta.ogImage)) {
      return cleanShopifyImage(meta.ogImage);
    }
    const og = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i.exec(html);
    if (og) return cleanShopifyImage(og[1]);

    // First reasonable <img> in product section
    const imgRe = /<img[^>]+(?:src|data-src|data-original|srcset)\s*=\s*["']([^"']+)["']/gi;
    const base = new URL(url);
    let m: RegExpExecArray | null;
    while ((m = imgRe.exec(html)) !== null) {
      let u = m[1].split(",")[0].trim().split(" ")[0];
      if (u.startsWith("//")) u = base.protocol + u;
      else if (u.startsWith("/")) u = base.origin + u;
      if (!/^https?:\/\//.test(u)) continue;
      if (/\.(svg|gif)(\?|$)/i.test(u)) continue;
      if (/(logo|icon|sprite|placeholder|loading|trustbadge|payment)/i.test(u)) continue;
      return cleanShopifyImage(u);
    }
    return null;
  } catch (e) {
    console.error("Scrape error", url, e);
    return null;
  }
}

function cleanShopifyImage(u: string): string {
  // Shopify: upscale to 800px and force https
  let out = u.replace(/_(\d+)x(\d+)?(\.[a-z]+)(\?|$)/i, "_800x$3$4").split("?")[0];
  if (out.startsWith("http://")) out = "https://" + out.slice(7);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const supabase = createClient(supabaseUrl, serviceKey);
    const anon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await anon.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const sourceUrl: string = body.sourceUrl;
    const batchSize: number = Math.min(Number(body.batchSize) || 5, 10);
    const minScore: number = typeof body.minScore === "number" ? body.minScore : 0.6;
    const category: string | null = body.category ?? null;
    if (!sourceUrl) {
      return new Response(JSON.stringify({ error: "sourceUrl required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const domain = new URL(sourceUrl).hostname;

    // Pull a wider pool, dedupe by name+size+category to avoid wasting calls
    let q = supabase
      .from("products")
      .select("id, name, size, category")
      .or("image_url.is.null,image_url.eq.")
      .eq("is_hidden", false)
      .order("name")
      .limit(batchSize * 6);
    if (category) q = q.eq("category", category as any);
    const { data: rows, error: pErr } = await q;
    if (pErr) throw pErr;

    const seen = new Set<string>();
    const products: ProductRow[] = [];
    for (const p of (rows ?? []) as any[]) {
      const key = `${normalize(p.name)}|${normalize(p.size ?? "")}|${p.category}`;
      if (seen.has(key)) continue;
      seen.add(key);
      products.push({ id: p.id, name: p.name, size: p.size, category: p.category });
      if (products.length >= batchSize) break;
    }

    const results: any[] = [];
    let updated = 0;

    for (const product of products) {
      const query = `${product.name} ${product.size ?? ""}`.trim();
      const hits = await searchSite(domain, query, firecrawlKey);
      if (hits.length === 0) {
        results.push({ id: product.id, name: product.name, status: "no_candidates" });
        continue;
      }
      const scored = hits
        .map((h) => ({ hit: h, score: scoreCandidate(product, h) }))
        .sort((a, b) => b.score - a.score);

      const best = scored[0];
      if (!best || best.score < minScore) {
        results.push({
          id: product.id, name: product.name, status: "no_match",
          best_score: best ? Number(best.score.toFixed(2)) : 0,
          best_title: best?.hit.title,
        });
        continue;
      }

      const image = await scrapeImage(best.hit.url, firecrawlKey);
      if (!image) {
        results.push({ id: product.id, name: product.name, status: "no_image", source_page: best.hit.url });
        continue;
      }

      // Apply to all rows in any store with same normalized name+size+category
      const sameKey = (rows ?? []).filter((c: any) =>
        normalize(c.name) === normalize(product.name) &&
        normalize(c.size ?? "") === normalize(product.size ?? "") &&
        c.category === product.category
      );
      const idsToUpdate = sameKey.length > 0 ? sameKey.map((c: any) => c.id) : [product.id];
      const { error: uErr } = await supabase
        .from("products")
        .update({ image_url: image })
        .in("id", idsToUpdate);
      if (uErr) {
        results.push({ id: product.id, name: product.name, status: "update_failed", error: uErr.message });
      } else {
        updated += idsToUpdate.length;
        results.push({
          id: product.id, name: product.name, status: "matched",
          image_url: image,
          confidence: best.score >= 1.0 ? "high" : best.score >= 0.75 ? "medium" : "low",
          source_page: best.hit.url,
          score: Number(best.score.toFixed(2)),
          applied_to: idsToUpdate.length,
        });
      }
    }

    let remainingQ = supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .or("image_url.is.null,image_url.eq.")
      .eq("is_hidden", false);
    if (category) remainingQ = remainingQ.eq("category", category as any);
    const { count: remaining } = await remainingQ;

    return new Response(JSON.stringify({
      processed: products.length,
      updated,
      remaining: remaining ?? null,
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
