import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const BASE = "https://api.babylovegrowth.ai/api/integrations";
const UA = "DeliverrBlogSync/1.0 (+https://deliverr.ca)";
const GAP_MS = 2100;
const MAX_CALLS = 25;
const MAX_DETAILS = 20;
const MAX_CHAIN = 25;
const PAGE = 50;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const leaseIso = () => new Date(Date.now() + 3 * 60 * 1000).toISOString();

class RateLimited extends Error { constructor(public retryAfter: number | null) { super("429"); } }
class HttpError extends Error { constructor(public status: number, public body: string) { super(`[${status}] ${body.slice(0, 300)}`); } }

function cleanHtml(html: string): string {
  let h = html || "";
  h = h.replace(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>[\s\S]*?<\/script>/gi, "");
  h = h.replace(/<(object|embed)\b[\s\S]*?<\/\1\s*>/gi, "");
  h = h.replace(/<(object|embed|base)\b[^>]*\/?>/gi, "");
  h = h.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  h = h.replace(/\s+srcdoc\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  h = h.replace(/\s+(href|src|xlink:href)\s*=\s*("\s*(?:javascript|data):[^"]*"|'\s*(?:javascript|data):[^']*'|(?:javascript|data):[^\s>]*)/gi, "");
  h = h.replace(/<iframe\b([^>]*)>([\s\S]*?)<\/iframe\s*>|<iframe\b([^>]*)\/?>/gi, (m, a1, _inner, a2) => {
    const attrs: string = a1 ?? a2 ?? "";
    const src = attrs.match(/\ssrc\s*=\s*["']?([^"'\s>]+)/i)?.[1] ?? "";
    let host = "";
    try { host = new URL(src, "https://x.invalid").hostname.toLowerCase(); } catch { /* ignore */ }
    const ok = ["youtube.com", "youtube-nocookie.com", "vimeo.com"].some((d) => host === d || host.endsWith("." + d));
    if (!ok) return "";
    const noSandbox = attrs.replace(/\s+sandbox\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
    return `<iframe${noSandbox} sandbox="allow-scripts allow-same-origin allow-presentation"></iframe>`;
  });
  return h;
}

async function readState() {
  const { data } = await sb.from("blg_sync_state").select("*").eq("id", 1).single();
  return data!;
}

async function apiCall(key: string, path: string) {
  const st = await readState();
  const wait = st.next_allowed_at ? new Date(st.next_allowed_at).getTime() - Date.now() : 0;
  if (wait > 0) await sleep(wait);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { "X-API-Key": key, "Content-Type": "application/json", "User-Agent": UA },
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(t);
    await sb.from("blg_sync_state").update({
      next_allowed_at: new Date(Date.now() + GAP_MS).toISOString(),
      lease_until: leaseIso(),
    }).eq("id", 1);
  }
  if (res.status === 429) {
    const ra = Number(res.headers.get("Retry-After"));
    await res.body?.cancel();
    throw new RateLimited(Number.isFinite(ra) && ra > 0 ? ra : null);
  }
  if (!res.ok) throw new HttpError(res.status, await res.text());
  await sb.from("blg_sync_state").update({ consecutive_429: 0 }).eq("id", 1);
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  let chain = 0;
  try { const b = await req.json(); chain = Math.max(0, Math.min(MAX_CHAIN, Number(b?.chain) || 0)); } catch { /* empty body */ }

  const key = Deno.env.get("BABYLOVEGROWTH_API_KEY");
  if (!key) return json({ error: "BABYLOVEGROWTH_API_KEY not set" }, 500);

  // 0. Atomic lease claim
  const nowIso = new Date().toISOString();
  const { data: claimed } = await sb.from("blg_sync_state")
    .update({ lease_until: leaseIso(), last_run_at: nowIso })
    .eq("id", 1)
    .or(`lease_until.is.null,lease_until.lt.${nowIso}`)
    .select();
  if (!claimed || claimed.length === 0) return json({ skipped: "locked" });

  let calls = 0, details = 0, synced = 0, remaining = 0;
  let hit429 = false, listComplete = false, progress = false, fatal: string | null = null;

  try {
    const state = claimed[0];
    let offset: number = state.list_offset ?? 0;
    const gone = new Set<number>();

    outer: while (calls < MAX_CALLS) {
      calls++;
      const raw = await apiCall(key, `/v1/articles?limit=${PAGE}&offset=${offset}`);
      const items: any[] = Array.isArray(raw) ? raw : (raw?.data ?? raw?.articles ?? raw?.items ?? []);
      const ids = items.map((i) => Number(i.id)).filter(Boolean);
      const { data: existing } = ids.length
        ? await sb.from("blg_articles").select("id, slug, previous_slugs, article_updated_at").in("id", ids)
        : { data: [] as any[] };
      const byId = new Map((existing ?? []).map((e: any) => [Number(e.id), e]));
      const needs = items.filter((i) => {
        if (gone.has(Number(i.id))) return false;
        const e = byId.get(Number(i.id));
        if (!e) return true;
        return i.updated_at && (!e.article_updated_at || new Date(i.updated_at) > new Date(e.article_updated_at));
      });

      let leftovers = 0;
      for (let idx = 0; idx < needs.length; idx++) {
        if (calls >= MAX_CALLS || details >= MAX_DETAILS) { leftovers = needs.length - idx; break; }
        const s = needs[idx];
        calls++; details++;
        let d: any;
        try {
          d = await apiCall(key, `/v1/articles/${s.id}`);
        } catch (e) {
          if (e instanceof HttpError && e.status === 404) { gone.add(Number(s.id)); progress = true; continue; }
          if (e instanceof RateLimited) { leftovers = needs.length - idx; throw e; }
          throw e;
        }
        d = d?.data ?? d;
        const prev = byId.get(Number(s.id));
        const slug = d.slug ?? s.slug;
        const prevSlugs: string[] = prev?.previous_slugs ?? [];
        if (prev && prev.slug && prev.slug !== slug && !prevSlugs.includes(prev.slug)) prevSlugs.push(prev.slug);
        const { error } = await sb.from("blg_articles").upsert({
          id: Number(s.id),
          slug,
          previous_slugs: prevSlugs,
          title: d.title ?? s.title,
          meta_description: d.meta_description ?? s.meta_description ?? null,
          hero_image_url: d.hero_image_url ?? s.hero_image_url ?? null,
          language_code: d.languageCode ?? s.languageCode ?? null,
          content_html: cleanHtml(d.content_html ?? ""),
          json_ld: d.jsonLd ?? null,
          faq_json_ld: d.faqJsonLd ?? null,
          article_created_at: d.created_at ?? s.created_at ?? null,
          article_updated_at: d.updated_at ?? s.updated_at ?? null,
          synced_at: new Date().toISOString(),
        }, { onConflict: "id" });
        if (error) throw new Error(`upsert failed: ${error.message}`);
        synced++; progress = true;
      }

      if (leftovers > 0) { remaining = leftovers; break outer; }

      if (items.length < PAGE) {
        listComplete = true;
        await sb.from("blg_sync_state").update({ list_offset: 0, list_complete: true }).eq("id", 1);
        break;
      }
      offset += PAGE;
      progress = true;
      await sb.from("blg_sync_state").update({ list_offset: offset, list_complete: false }).eq("id", 1);
    }
    if (!listComplete && remaining === 0 && calls >= MAX_CALLS) remaining = 0;
  } catch (e) {
    if (e instanceof RateLimited) {
      hit429 = true;
      const st = await readState();
      const n = (st.consecutive_429 ?? 0) + 1;
      const secs = e.retryAfter ?? 60 * 2 ** (n - 1);
      await sb.from("blg_sync_state").update({
        next_allowed_at: new Date(Date.now() + secs * 1000).toISOString(),
        consecutive_429: n,
      }).eq("id", 1);
    } else {
      fatal = e instanceof Error ? e.message : String(e);
      console.error("blg-sync error:", fatal);
    }
  } finally {
    await sb.from("blg_sync_state").update({ lease_until: null }).eq("id", 1);
  }

  const done = listComplete && remaining === 0;
  const shouldChain = !done && !hit429 && !fatal && progress && chain < MAX_CHAIN;
  if (shouldChain) {
    EdgeRuntime.waitUntil((async () => {
      await sleep(GAP_MS);
      await fetch(`${SUPABASE_URL}/functions/v1/blg-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({ chain: chain + 1 }),
      }).catch((err) => console.error("chain failed", err));
    })());
  }

  if (fatal) return json({ error: fatal, synced, remaining, listComplete, done }, 502);
  return json({ synced, remaining, listComplete, done, rateLimited: hit429, chained: shouldChain });
});
