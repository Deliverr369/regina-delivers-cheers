// Sends an order-progress SMS via Twilio (connector gateway).
// Triggered by a Postgres AFTER INSERT trigger on public.notifications.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

interface SmsPayload {
  notification_id?: string;
  user_id?: string;
  order_id?: string;
  kind?: string; // "customer" | "owner"
  title: string;
  body: string;
  link?: string | null;
  to?: string; // direct recipient override (e.g. store-owner alerts)
}

// Normalize a user-entered phone number to E.164 (North America default).
function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) {
    return /^\+\d{10,15}$/.test(cleaned) ? cleaned : null;
  }
  const only = cleaned.replace(/\D/g, "");
  if (only.length === 10) return `+1${only}`;
  if (only.length === 11 && only.startsWith("1")) return `+${only}`;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SEND_PUSH_SECRET = Deno.env.get("NOTIFY_TRIGGER_SECRET") ?? Deno.env.get("SEND_PUSH_SECRET");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const internal = req.headers.get("x-internal-secret");
  const bearer = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const authorized =
    (SEND_PUSH_SECRET && internal === SEND_PUSH_SECRET) ||
    (bearer && bearer === SERVICE_ROLE);
  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  let logPayload: SmsPayload | null = null;
  let resolvedTo: string | null = null;
  let messageText = "";

  const writeLog = async (fields: {
    status: string;
    twilio_sid?: string | null;
    twilio_status?: string | null;
    error_message?: string | null;
  }) => {
    try {
      await admin.from("sms_logs").insert({
        notification_id: logPayload?.notification_id ?? null,
        user_id: logPayload?.user_id ?? null,
        order_id: logPayload?.order_id ?? null,
        recipient: resolvedTo ?? logPayload?.to ?? null,
        title: logPayload?.title ?? null,
        body: messageText || logPayload?.body || "",
        kind: logPayload?.kind ?? (logPayload?.to ? "owner" : "customer"),
        status: fields.status,
        twilio_sid: fields.twilio_sid ?? null,
        twilio_status: fields.twilio_status ?? null,
        error_message: fields.error_message ?? null,
      });
    } catch (e) {
      console.error("sms_logs insert failed:", e instanceof Error ? e.message : e);
    }
  };

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const FROM = Deno.env.get("TWILIO_FROM_NUMBER");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY is not configured");
    if (!FROM) throw new Error("TWILIO_FROM_NUMBER is not configured");

    const payload = (await req.json()) as SmsPayload;
    logPayload = payload;
    if ((!payload.user_id && !payload.to) || !payload.body) {
      return new Response(JSON.stringify({ error: "user_id or to, and body required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let to: string | null = null;
    if (payload.to) {
      to = toE164(payload.to);
    } else {
      const { data: profile, error } = await admin
        .from("profiles")
        .select("phone, sms_opt_in")
        .eq("id", payload.user_id!)
        .maybeSingle();
      if (error) throw error;

      if (!profile || profile.sms_opt_in === false) {
        await writeLog({ status: "skipped", error_message: "Customer opted out of texts" });
        return new Response(
          JSON.stringify({ ok: true, sent: 0, reason: "opted out" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      to = toE164(profile.phone);
    }
    resolvedTo = to;
    if (!to) {
      await writeLog({ status: "skipped", error_message: "No valid phone number on file" });
      return new Response(
        JSON.stringify({ ok: true, sent: 0, reason: "no valid phone" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const text = `Deliverr: ${payload.title ? payload.title + " — " : ""}${payload.body}`
      .replace(/\s+/g, " ")
      .slice(0, 300);
    messageText = text;

    const res = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: FROM, Body: text }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`Twilio send failed [${res.status}]: ${errorBody}`);
      await writeLog({
        status: "failed",
        error_message: `Twilio ${res.status}: ${errorBody}`.slice(0, 500),
      });
      return new Response(
        JSON.stringify({ ok: false, status: res.status, details: errorBody }),
        {
          status: res.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const data = await res.json();
    await writeLog({
      status: data.status === "failed" || data.status === "undelivered" ? "failed" : "sent",
      twilio_sid: data.sid ?? null,
      twilio_status: data.status ?? null,
      error_message: data.error_message ?? null,
    });
    return new Response(JSON.stringify({ ok: true, sent: 1, sid: data.sid }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("send-sms error:", msg);
    await writeLog({ status: "failed", error_message: msg.slice(0, 500) });
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
