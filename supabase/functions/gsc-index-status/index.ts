// gsc-index-status: checks every sitemap URL against Google Search Console's
// URL Inspection API and stores the indexing state in public.gsc_url_status,
// so the admin dashboard can show excluded URLs, soft 404s, and redirect
// errors without opening Search Console. Requires an admin session.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://deliverr.ca/";
const SITEMAP_URL = "https://deliverr.ca/sitemap.xml";
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
// URL Inspection quota is limited per site per day — stay well under it.
const MAX_INSPECTIONS_PER_RUN = 150;

function gatewayHeaders() {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const connectionKey = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
  if (!lovableKey || !connectionKey) {
    throw new Error("Search Console connection is not configured");
  }
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": connectionKey,
    "Content-Type": "application/json",
  };
}

async function resolveSiteUrl(headers: Record<string, string>): Promise<string> {
  const list = await fetch(`${GATEWAY}/webmasters/v3/sites`, { headers });
  if (!list.ok) throw new Error(`could not list properties [${list.status}]: ${await list.text()}`);
  const body = (await list.json()) as { siteEntry?: { siteUrl: string; permissionLevel?: string }[] };
  const target = new URL(SITE_URL);
  const matches = (body.siteEntry || []).filter((entry) => {
    if (entry.permissionLevel === "siteUnverifiedUser") return false;
    if (entry.siteUrl.startsWith("sc-domain:")) {
      const domain = entry.siteUrl.slice("sc-domain:".length).toLowerCase();
      const host = target.hostname.toLowerCase();
      return host === domain || host.endsWith(`.${domain}`);
    }
    try {
      return target.href.startsWith(new URL(entry.siteUrl).href);
    } catch {
      return false;
    }
  });
  if (matches.length !== 1) throw new Error(`${matches.length} matching Search Console properties`);
  return matches[0].siteUrl;
}

async function collectSitemapUrls(log: (m: string) => void): Promise<string[]> {
  const urls = new Set<string>();
  const queue = [SITEMAP_URL];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const sm = queue.shift()!;
    if (seen.has(sm)) continue;
    seen.add(sm);
    const resp = await fetch(sm);
    if (!resp.ok) {
      log(`sitemap fetch failed [${resp.status}] for ${sm}`);
      continue;
    }
    const xml = await resp.text();
    for (const m of xml.matchAll(/<sitemap>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?<\/sitemap>/g)) {
      queue.push(m[1].trim());
    }
    for (const m of xml.matchAll(/<url>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/g)) {
      urls.add(m[1].trim());
    }
  }
  return [...urls];
}

interface InspectionRow {
  url: string;
  verdict: string | null;
  coverage_state: string | null;
  robots_txt_state: string | null;
  indexing_state: string | null;
  page_fetch_state: string | null;
  last_crawl_time: string | null;
  google_canonical: string | null;
  user_canonical: string | null;
  inspected_at: string;
}

async function inspectUrl(
  headers: Record<string, string>,
  siteUrl: string,
  url: string,
): Promise<InspectionRow> {
  const resp = await fetch(`${GATEWAY}/v1/urlInspection/index:inspect`, {
    method: "POST",
    headers,
    body: JSON.stringify({ inspectionUrl: url, siteUrl }),
  });
  if (resp.status === 403) throw new Error("ACCESS_DENIED");
  if (resp.status === 429) throw new Error("RATE_LIMITED");
  if (!resp.ok) throw new Error(`inspection failed [${resp.status}]: ${await resp.text()}`);
  const data = await resp.json();
  const r = data?.inspectionResult?.indexStatusResult ?? {};
  return {
    url,
    verdict: r.verdict ?? null,
    coverage_state: r.coverageState ?? null,
    robots_txt_state: r.robotsTxtState ?? null,
    indexing_state: r.indexingState ?? null,
    page_fetch_state: r.pageFetchState ?? null,
    last_crawl_time: r.lastCrawlTime ?? null,
    google_canonical: r.googleCanonical ?? null,
    user_canonical: r.userCanonical ?? null,
    inspected_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

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

  const notes: string[] = [];
  const log = (m: string) => {
    notes.push(m);
    console.log(m);
  };

  try {
    const headers = gatewayHeaders();
    const siteUrl = await resolveSiteUrl(headers);
    const urls = await collectSitemapUrls(log);
    log(`found ${urls.length} sitemap URLs`);

    const toCheck = urls.slice(0, MAX_INSPECTIONS_PER_RUN);
    const rows: InspectionRow[] = [];
    let stoppedEarly = false;
    for (const url of toCheck) {
      try {
        rows.push(await inspectUrl(headers, siteUrl, url));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === "ACCESS_DENIED" || msg === "RATE_LIMITED") {
          log(`stopped early: ${msg === "ACCESS_DENIED" ? "access denied by Google" : "Google rate limit reached"}`);
          stoppedEarly = true;
          break;
        }
        log(`skipped ${url}: ${msg}`);
      }
      // Gentle pacing to stay clear of per-minute limits.
      await new Promise((r) => setTimeout(r, 300));
    }

    if (rows.length > 0) {
      const { error } = await supabase
        .from("gsc_url_status")
        .upsert(rows, { onConflict: "url" });
      if (error) throw new Error(`saving results failed: ${error.message}`);
    }
    log(`inspected and saved ${rows.length} URLs`);

    const counts: Record<string, number> = {};
    for (const r of rows) {
      const key = r.coverage_state ?? "Unknown";
      counts[key] = (counts[key] ?? 0) + 1;
    }

    return new Response(
      JSON.stringify({ ok: true, inspected: rows.length, total: urls.length, stoppedEarly, counts, notes }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log(`failed: ${message}`);
    return new Response(JSON.stringify({ ok: false, error: message, notes }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
