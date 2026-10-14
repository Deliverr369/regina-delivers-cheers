// sync-flyers: pulls the current Regina store-flyer feed and stores it in
// public.flyers so the Weekly Deals page can show what's on this week.
//
// Invoked by pg_cron once a day (see the migration that schedules it). The
// feed is Flipp's public Regina flyer list, filtered to the merchants we
// actually deliver from. When anything new lands, the sitemap is re-submitted
// to Google Search Console so the refreshed page gets noticed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-sync-secret",
};

const FEED_URL =
  "https://backflipp.wishabi.com/flipp/flyers?postal_code=S4P3A1&locale=en-ca";
const SOURCE = "flipp";
const SITE_URL = "https://deliverr.ca/";
const SITEMAP_URL = "https://deliverr.ca/sitemap.xml";
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

// Merchant names exactly as the feed spells them. Only these are stored.
const WANTED = new Set([
  "Sobeys Liquor",
  "Real Canadian Superstore",
  "Costco",
  "Co-op",
  "Willow Park Wines & Spirits",
  "Safeway",
  "Walmart",
]);

// Two safety rails on a function the scheduler calls with no user session:
// a warm-container throttle so a stray caller can't hammer the flyer feed, and
// an optional shared secret for admin replays once FLYER_SYNC_SECRET is set.
const MIN_RUN_GAP_MS = 15 * 60 * 1000;
let lastRunAt = 0;

interface FeedFlyer {
  id?: number | string;
  merchant?: string;
  valid_from?: string;
  valid_to?: string;
  thumbnail_url?: string;
  path?: string;
}

const dateOnly = (iso?: string): string | null => {
  if (!iso) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(iso);
  return m ? m[1] : null;
};

/** The feed serves http:// image URLs; the site is https-only. */
const toHttps = (u?: string): string | null => {
  if (!u) return null;
  return u.startsWith("http://") ? `https://${u.slice(7)}` : u;
};

async function resubmitSitemap(log: (m: string) => void) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const connectionKey = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
  if (!lovableKey || !connectionKey) {
    log("sitemap not re-submitted: Search Console credentials not configured");
    return;
  }
  const headers = {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": connectionKey,
  };

  // The property must be read back from Google every time — never assumed.
  const list = await fetch(`${GATEWAY}/webmasters/v3/sites`, { headers });
  if (!list.ok) {
    log(`sitemap not re-submitted: could not list properties [${list.status}]`);
    return;
  }
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

  if (matches.length !== 1) {
    log(`sitemap not re-submitted: ${matches.length} matching Search Console properties`);
    return;
  }

  const put = await fetch(
    `${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(matches[0].siteUrl)}/sitemaps/${encodeURIComponent(SITEMAP_URL)}`,
    { method: "PUT", headers },
  );
  log(put.ok || put.status === 204 ? "sitemap re-submitted to Google" : `sitemap re-submit failed [${put.status}]`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const secret = Deno.env.get("FLYER_SYNC_SECRET");
  if (secret && req.headers.get("x-sync-secret") !== secret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = Date.now();
  if (now - lastRunAt < MIN_RUN_GAP_MS) {
    return new Response(
      JSON.stringify({ ok: true, skipped: "a sync ran less than 15 minutes ago" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  lastRunAt = now;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const notes: string[] = [];
  const log = (m: string) => {
    notes.push(m);
    console.log(m);
  };

  try {
    const feedRes = await fetch(FEED_URL, {
      headers: { "User-Agent": "Deliverr (support@deliverr.ca)" },
    });
    if (!feedRes.ok) {
      throw new Error(`flyer feed returned ${feedRes.status}`);
    }
    const feed = (await feedRes.json()) as { flyers?: FeedFlyer[] };
    const flyers = Array.isArray(feed.flyers) ? feed.flyers : [];
    log(`feed returned ${flyers.length} flyers`);

    const today = new Date().toISOString().slice(0, 10);
    const rows = [];
    for (const f of flyers) {
      const merchant = (f.merchant || "").trim();
      if (!merchant || !WANTED.has(merchant)) continue;
      if (!f.path) continue;
      const flyerUrl = `https://flipp.com/${f.path.replace(/^\/+/, "")}`;
      const validTo = dateOnly(f.valid_to);
      if (validTo && validTo < today) continue; // already expired
      rows.push({
        store_name: merchant,
        source: SOURCE,
        title: `${merchant} weekly flyer`,
        image_url: toHttps(f.thumbnail_url),
        flyer_url: flyerUrl,
        valid_from: dateOnly(f.valid_from),
        valid_to: validTo,
        is_active: true,
        synced_at: new Date().toISOString(),
      });
    }

    let stored = 0;
    if (rows.length) {
      const { data, error } = await supabase
        .from("flyers")
        .upsert(rows, { onConflict: "source,flyer_url" })
        .select("id");
      if (error) throw new Error(`upsert failed: ${error.message}`);
      stored = data?.length ?? 0;
    }
    log(`stored ${stored} flyers`);

    // Anything that has run out of date stops showing on the page.
    const { count: expired } = await supabase
      .from("flyers")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("is_active", true)
      .lt("valid_to", today);
    if (expired) log(`retired ${expired} expired flyers`);

    if (stored > 0) await resubmitSitemap(log);

    return new Response(
      JSON.stringify({ ok: true, stored, notes }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log(`sync failed: ${message}`);
    return new Response(JSON.stringify({ ok: false, error: message, notes }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
