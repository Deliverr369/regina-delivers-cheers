// Account deletion endpoint — required for Google Play Store compliance.
// Authenticates the caller, anonymizes their order history (kept for tax/legal
// retention as disclosed in the Privacy Policy), removes profile + addresses,
// then deletes the auth user.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Identify the caller from their JWT
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const userId = userRes.user.id;

    // Privileged client for cleanup + auth deletion
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1) Anonymize orders for legal/tax retention (7 years per Privacy Policy)
    await admin
      .from("orders")
      .update({
        user_id: null,
        customer_name: "Deleted user",
        customer_email: null,
        customer_phone: null,
      })
      .eq("user_id", userId);

    // 2) Remove personal data (best-effort — table existence is environment-specific)
    await admin.from("addresses").delete().eq("user_id", userId).then(() => {}, () => {});
    await admin.from("user_addresses").delete().eq("user_id", userId).then(() => {}, () => {});
    await admin.from("user_roles").delete().eq("user_id", userId).then(() => {}, () => {});
    await admin.from("push_tokens").delete().eq("user_id", userId).then(() => {}, () => {});
    await admin.from("notifications").delete().eq("user_id", userId).then(() => {}, () => {});
    await admin.from("profiles").delete().eq("id", userId).then(() => {}, () => {});

    // 3) Delete the auth user
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      return new Response(
        JSON.stringify({ error: delErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
