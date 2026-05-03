// Sends a push notification to all of a user's registered devices via FCM HTTP v1.
// Triggered by a Postgres AFTER INSERT trigger on public.notifications.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  notification_id?: string;
  user_id: string;
  title: string;
  body: string;
  link?: string | null;
}

// Convert a PEM-formatted RSA private key into a CryptoKey for Web Crypto signing.
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function base64UrlEncode(bytes: Uint8Array | string): string {
  const str = typeof bytes === "string" ? bytes : String.fromCharCode(...bytes);
  return btoa(str).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getFcmAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
  project_id: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encHeader = base64UrlEncode(JSON.stringify(header));
  const encClaim = base64UrlEncode(JSON.stringify(claim));
  const toSign = `${encHeader}.${encClaim}`;

  const keyData = pemToArrayBuffer(serviceAccount.private_key);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(toSign),
  );
  const encSig = base64UrlEncode(new Uint8Array(signature));
  const jwt = `${toSign}.${encSig}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`FCM token exchange failed: ${await tokenRes.text()}`);
  }
  const data = await tokenRes.json();
  return data.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Require shared secret OR service-role bearer (used by the DB trigger).
  const SEND_PUSH_SECRET = Deno.env.get("SEND_PUSH_SECRET");
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

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const FIREBASE_JSON = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");

    if (!FIREBASE_JSON) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured");
    }

    const serviceAccount = JSON.parse(FIREBASE_JSON);

    const payload = (await req.json()) as PushPayload;
    if (!payload.user_id || !payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ error: "user_id, title, body required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: tokens, error } = await supabase
      .from("device_tokens")
      .select("id, token, platform")
      .eq("user_id", payload.user_id);

    if (error) throw error;

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, reason: "no devices" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const accessToken = await getFcmAccessToken(serviceAccount);
    const projectId = serviceAccount.project_id;
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    const results = await Promise.allSettled(
      tokens.map(async (t) => {
        const message = {
          message: {
            token: t.token,
            notification: { title: payload.title, body: payload.body },
            data: {
              link: payload.link ?? "",
              notification_id: payload.notification_id ?? "",
            },
            apns: {
              payload: { aps: { sound: "default", badge: 1 } },
            },
            android: {
              priority: "HIGH",
              notification: { sound: "default" },
            },
          },
        };
        const res = await fetch(fcmUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(message),
        });
        if (!res.ok) {
          const errBody = await res.text();
          // 404 / UNREGISTERED / INVALID_ARGUMENT means token is dead — clean it up.
          if (res.status === 404 || res.status === 400) {
            await supabase.from("device_tokens").delete().eq("id", t.id);
          }
          throw new Error(`FCM ${res.status}: ${errBody}`);
        }
        return await res.json();
      }),
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - sent;

    return new Response(
      JSON.stringify({ ok: true, sent, failed, total: tokens.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("send-push error:", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
