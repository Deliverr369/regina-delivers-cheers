// submit-sitemap: re-submits https://deliverr.ca/sitemap.xml to Google Search
// Console. Called from the admin dashboard right after a blog post is
// published, so Google is told about new pages as soon as they go live.
// Requires an admin session.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://deliverr.ca/";
const SITEMAP_URL = "https://deliverr.ca/sitemap.xml";
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

async function resubmitSitemap(log: (m: string) => void): Promise<boolean> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const connectionKey = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
  if (!lovableKey || !connectionKey) {
    log("Search Console credentials not configured");
    return false;
  }
  const headers = {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": connectionKey,
  };

  // The property must be read back from Google every time — never assumed.
  const list = await fetch(`${GATEWAY}/webmasters/v3/sites`, { headers });
  if (!list.ok) {
    log(`could not list properties [${list.status}]`);
    return false;
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
    log(`${matches.length} matching Search Console properties — not submitting`);
    return false;
  }

  const put = await fetch(
    `${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(matches[0].siteUrl)}/sitemaps/${encodeURIComponent(SITEMAP_URL)}`,
    { method: "PUT", headers },
  );
  const ok = put.ok || put.status === 204;
  log(ok ? "sitemap submitted to Google" : `sitemap submit failed [${put.status}]`);
  return ok;
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
    const ok = await resubmitSitemap(log);
    return new Response(JSON.stringify({ ok, notes }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log(`failed: ${message}`);
    return new Response(JSON.stringify({ ok: false, error: message, notes }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
