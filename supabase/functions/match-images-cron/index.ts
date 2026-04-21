// Background runner: invoked by pg_cron every minute.
// For each enabled image_match_jobs row, runs ONE batch of the matcher logic
// (inline, using service role) and updates the job row with progress.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";

interface ProductRow { id: string; name: string; size: string | null; category: string }
interface MapHit { url: string; title?: string; description?: string }

const STOP = new Set([
  "the","and","with","for","from","pack","cans","can","bottle","bottles","btl","btls",
  "case","cases","tall","tallboy","tallboys","slim","sleek","stubby","ml","mls","ltr",
  "litre","liter","l","oz","x","of","pk","ea","each","new","limited","edition",
]);

const normalize = (s: string) => s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
const tokenize = (s: string, minLen = 2) => normalize(s).split(" ").filter((t) => t.length > minLen && !STOP.has(t) && !/^\d+$/.test(t));
const keywordTokens = (s: string) => normalize(s).split(" ").filter((t) => t.length >= 2 && !STOP.has(t));

function parseSize(s: string): { ml?: number; pack?: number } {
  const lower = (s || "").toLowerCase();
  let ml: number | undefined; let pack: number | undefined;
  const pm = lower.match(/(\d{1,3})\s*(?:x|×|pk|pack|cans?|bottles?|btls?)\b/);
  if (pm) pack = Number(pm[1]);
  const mlm = lower.match(/(\d{2,4})\s*ml/);
  if (mlm) ml = Number(mlm[1]);
  const lm = lower.match(/(\d(?:\.\d{1,2})?)\s*l(?:tr|iter|itre)?\b/);
  if (lm && ml === undefined) ml = Math.round(Number(lm[1]) * 1000);
  return { ml, pack };
}

function scoreCandidate(product: ProductRow, hit: MapHit): number {
  const haystack = `${hit.title ?? ""} ${hit.description ?? ""} ${hit.url.replace(/[-_/]/g, " ")}`;
  const productText = `${product.name} ${product.size ?? ""}`;
  const productTokens = new Set(tokenize(productText));
  const hayTokens = new Set(tokenize(haystack));
  let overlap = 0;
  for (const t of productTokens) if (hayTokens.has(t)) overlap++;
  let score = productTokens.size > 0 ? overlap / productTokens.size : 0;
  const pKeys = new Set(keywordTokens(productText));
  const hKeys = new Set(keywordTokens(haystack));
  let keyHits = 0;
  for (const t of pKeys) if (hKeys.has(t)) keyHits++;
  score += Math.min(keyHits, 4) * 0.05;
  const firstWord = tokenize(product.name)[0];
  if (firstWord && hayTokens.has(firstWord)) score += 0.25;
  const pTokensArr = tokenize(product.name);
  const hayNorm = ` ${normalize(haystack)} `;
  for (let i = 0; i < pTokensArr.length - 1; i++) {
    const bg = ` ${pTokensArr[i]} ${pTokensArr[i + 1]} `;
    if (hayNorm.includes(bg)) score += 0.2;
  }
  const ps = parseSize(productText); const hs = parseSize(haystack);
  if (ps.ml && hs.ml) {
    if (ps.ml === hs.ml) score += 0.4;
    else if (Math.abs(ps.ml - hs.ml) / ps.ml < 0.05) score += 0.2;
    else score -= 0.25;
  }
  if (ps.pack && hs.pack) {
    if (ps.pack === hs.pack) score += 0.4;
    else if (Math.abs(ps.pack - hs.pack) <= 1) score -= 0.05;
    else score -= 0.15;
  }
  if (/deposit\s+for/i.test(hit.title ?? "")) score -= 1;
  if (/\/(deposit|gift|policies|pages|blogs|collections\/?$)/i.test(hit.url)) score -= 0.5;
  return score;
}

function cleanShopifyImage(u: string): string {
  let out = u.replace(/_(\d+)x(\d+)?(\.[a-z]+)(\?|$)/i, "_800x$3$4").split("?")[0];
  if (out.startsWith("http://")) out = "https://" + out.slice(7);
  return out;
}

async function searchSite(domain: string, query: string, key: string): Promise<MapHit[]> {
  try {
    const res = await fetch(`${FIRECRAWL_V2}/map`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: `https://${domain}`, limit: 25, search: query }),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const raw = json.links ?? json.data?.links ?? [];
    return raw.map((l: any) => typeof l === "string" ? { url: l } : { url: l?.url, title: l?.title, description: l?.description })
      .filter((x: any) => x?.url && /\/products?\//i.test(x.url));
  } catch { return []; }
}

async function scrapeImage(url: string, key: string): Promise<string | null> {
  try {
    const res = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["html"], onlyMainContent: true }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const html: string = json.html ?? json.data?.html ?? "";
    const meta = json.metadata ?? json.data?.metadata ?? {};
    if (typeof meta.ogImage === "string" && /^https?:\/\//.test(meta.ogImage)) return cleanShopifyImage(meta.ogImage);
    const og = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i.exec(html);
    if (og) return cleanShopifyImage(og[1]);
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
  } catch { return null; }
}

async function runJob(supabase: any, job: any, firecrawlKey: string) {
  const domain = new URL(job.source_url).hostname;
  const batchSize = Math.min(Number(job.batch_size) || 5, 10);
  const minScore = Number(job.min_score) ?? 0.5;

  // Randomize starting offset so we don't keep retrying the same un-matchable products
  const { count: missingCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .or("image_url.is.null,image_url.eq.")
    .eq("is_hidden", false);
  const poolSize = batchSize * 6;
  const maxOffset = Math.max(0, (missingCount ?? 0) - poolSize);
  const offset = maxOffset > 0 ? Math.floor(Math.random() * maxOffset) : 0;

  const { data: rows, error: pErr } = await supabase
    .from("products")
    .select("id, name, size, category")
    .or("image_url.is.null,image_url.eq.")
    .eq("is_hidden", false)
    .order("name")
    .range(offset, offset + poolSize - 1);
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

  let updated = 0;
  for (const product of products) {
    const cleanName = product.name
      .replace(/\b\d+\s*(?:pk|pack|cans?|bottles?)\b/gi, "")
      .replace(/\b\d+(?:\.\d+)?\s*(?:ml|l|oz)\b/gi, "")
      .replace(/\s+/g, " ").trim();
    const query = cleanName || product.name;
    let hits = await searchSite(domain, query, firecrawlKey);
    if (hits.length === 0) {
      const brand = tokenize(product.name).slice(0, 2).join(" ");
      if (brand && brand !== normalize(query)) hits = await searchSite(domain, brand, firecrawlKey);
    }
    if (hits.length === 0) continue;
    const scored = hits.map((h) => ({ hit: h, score: scoreCandidate(product, h) })).sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (!best || best.score < minScore) continue;
    const image = await scrapeImage(best.hit.url, firecrawlKey);
    if (!image) continue;
    const sameKey = (rows ?? []).filter((c: any) =>
      normalize(c.name) === normalize(product.name) &&
      normalize(c.size ?? "") === normalize(product.size ?? "") &&
      c.category === product.category);
    const idsToUpdate = sameKey.length > 0 ? sameKey.map((c: any) => c.id) : [product.id];
    const { error: uErr } = await supabase.from("products").update({ image_url: image }).in("id", idsToUpdate);
    if (!uErr) updated += idsToUpdate.length;
  }

  const { count: remaining } = await supabase.from("products")
    .select("id", { count: "exact", head: true })
    .or("image_url.is.null,image_url.eq.")
    .eq("is_hidden", false);

  await supabase.from("image_match_jobs").update({
    last_run_at: new Date().toISOString(),
    last_processed: products.length,
    last_updated: updated,
    last_remaining: remaining ?? null,
    last_error: null,
    total_updated: (job.total_updated ?? 0) + updated,
    total_runs: (job.total_runs ?? 0) + 1,
  }).eq("id", job.id);

  // Auto-disable if nothing remains
  if ((remaining ?? 0) === 0) {
    await supabase.from("image_match_jobs").update({ enabled: false }).eq("id", job.id);
  }

  return { processed: products.length, updated, remaining };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) return new Response(JSON.stringify({ error: "Firecrawl not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: jobs, error } = await supabase.from("image_match_jobs").select("*").eq("enabled", true);
    if (error) throw error;
    const summary: any[] = [];
    for (const job of jobs ?? []) {
      try {
        const r = await runJob(supabase, job, firecrawlKey);
        summary.push({ id: job.id, ...r });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await supabase.from("image_match_jobs").update({ last_error: msg, last_run_at: new Date().toISOString() }).eq("id", job.id);
        summary.push({ id: job.id, error: msg });
      }
    }
    return new Response(JSON.stringify({ ok: true, ran: summary.length, summary }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
