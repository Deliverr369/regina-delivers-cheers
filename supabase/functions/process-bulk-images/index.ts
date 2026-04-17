import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const BUCKET = "store-images";
const WATCH_FOLDER = "bulk-auto";
const BATCH_SIZE = 5; // process up to 5 per invocation to stay under timeout

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function dedupeWatchFolder(files: any[]) {
  // Group by content fingerprint: prefer ETag (md5), fall back to size+mimetype
  const groups = new Map<string, any[]>();
  for (const f of files) {
    if (!f.name || f.name.endsWith("/")) continue;
    const meta = f.metadata || {};
    const key = meta.eTag || meta.etag || `size:${meta.size || 0}:mime:${meta.mimetype || ""}`;
    if (!key || key === "size:0:mime:") continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(f);
  }

  const toDelete: string[] = [];
  for (const [, group] of groups) {
    if (group.length < 2) continue;
    // Keep the oldest, delete the rest
    group.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
    for (let i = 1; i < group.length; i++) toDelete.push(`${WATCH_FOLDER}/${group[i].name}`);
  }

  if (toDelete.length > 0) {
    console.log(`Deduping ${toDelete.length} duplicate file(s)`);
    for (let i = 0; i < toDelete.length; i += 100) {
      const batch = toDelete.slice(i, i + 100);
      await supabase.storage.from(BUCKET).remove(batch).catch((e) => console.error("dedupe remove error", e));
      await supabase.from("bulk_image_jobs").delete().in("storage_path", batch).neq("status", "assigned");
    }
  }
  return toDelete.length;
}

async function syncStorageToJobs() {
  // List all files in the watched folder and create pending jobs for new ones
  const { data: files, error } = await supabase.storage.from(BUCKET).list(WATCH_FOLDER, { limit: 1000 });
  if (error) { console.error("list error", error); return { synced: 0, deduped: 0 }; }
  if (!files || files.length === 0) return { synced: 0, deduped: 0 };

  // Step 1: Remove duplicate files (same content uploaded multiple times)
  const deduped = await dedupeWatchFolder(files);
  const liveFiles = deduped > 0
    ? ((await supabase.storage.from(BUCKET).list(WATCH_FOLDER, { limit: 1000 })).data || [])
    : files;

  const paths = liveFiles.filter((f: any) => f.name && !f.name.endsWith("/")).map((f: any) => `${WATCH_FOLDER}/${f.name}`);
  if (paths.length === 0) return { synced: 0, deduped };

  const { data: existing } = await supabase.from("bulk_image_jobs").select("storage_path").in("storage_path", paths);
  const existingSet = new Set((existing || []).map((r: any) => r.storage_path));

  const newJobs = liveFiles
    .filter((f: any) => f.name && !existingSet.has(`${WATCH_FOLDER}/${f.name}`))
    .map((f: any) => ({ storage_path: `${WATCH_FOLDER}/${f.name}`, file_name: f.name, status: "pending" }));

  if (newJobs.length > 0) {
    const { error: insErr } = await supabase.from("bulk_image_jobs").insert(newJobs);
    if (insErr) console.error("insert jobs error", insErr);
  }
  return { synced: newJobs.length, deduped };
}

async function fetchAllProducts() {
  const all: any[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, category, store_id, image_url")
      .range(from, from + pageSize - 1);
    if (error || !data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function identifyImage(base64: string, existingProducts: { name: string; category: string }[]) {
  const productList = existingProducts.map((p) => `- ${p.name} (${p.category})`).join("\n");
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: `You identify liquor products. Categories: beer, wine, spirits, smokes, ciders_seltzers.\n\nExisting products:\n${productList}\n\nReturn exact existing name if matched.` },
        { role: "user", content: [
          { type: "text", text: "Identify this product." },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64}` } },
        ]},
      ],
      tools: [{ type: "function", function: { name: "identify_product", parameters: {
        type: "object",
        properties: {
          product_name: { type: "string" },
          category: { type: "string", enum: ["beer", "wine", "spirits", "smokes", "ciders_seltzers"] },
          size: { type: "string" },
          is_existing: { type: "boolean" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["product_name", "category", "is_existing", "confidence"],
      }}}],
      tool_choice: { type: "function", function: { name: "identify_product" } },
    }),
  });
  if (!response.ok) throw new Error(`AI ${response.status}`);
  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call");
  return JSON.parse(toolCall.function.arguments);
}

async function processOneJob(job: any, products: any[], coveredNames: Set<string>) {
  await supabase.from("bulk_image_jobs").update({ status: "processing", attempts: (job.attempts || 0) + 1 }).eq("id", job.id);

  // Download the image
  const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(job.storage_path);
  if (dlErr || !blob) throw new Error(`download failed: ${dlErr?.message}`);
  const buf = await blob.arrayBuffer();
  // Chunked base64 conversion to avoid "Maximum call stack size exceeded" on large images
  const bytes = new Uint8Array(buf);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as unknown as number[]);
  }
  const base64 = btoa(binary);

  // Identify
  const uniqueProducts = Array.from(
    new Map(products.filter((p) => p.image_url).map((p) => [p.name.toLowerCase(), { name: p.name, category: p.category }])).values()
  );
  const result = await identifyImage(base64, uniqueProducts);

  // Skip if already has image
  if (result.product_name && coveredNames.has(result.product_name.toLowerCase())) {
    await supabase.from("bulk_image_jobs").update({
      status: "skipped",
      identified_name: result.product_name,
      identified_category: result.category,
      identified_size: result.size || null,
      is_existing: result.is_existing,
      confidence: result.confidence,
      error_message: "Already has image",
      processed_at: new Date().toISOString(),
    }).eq("id", job.id);
    // Move to processed/ to remove from watch folder
    await supabase.storage.from(BUCKET).move(job.storage_path, `bulk-processed/${job.file_name}`).catch(() => {});
    return;
  }

  // Upload final image to products folder
  const ext = job.file_name.split(".").pop() || "jpg";
  const cleanName = result.product_name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const finalPath = `products/${cleanName}-${Date.now()}.${ext}`;
  const { error: copyErr } = await supabase.storage.from(BUCKET).copy(job.storage_path, finalPath);
  if (copyErr) throw new Error(`copy failed: ${copyErr.message}`);
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(finalPath);

  let productIds: string[] = [];
  if (result.is_existing) {
    const matching = products.filter((p) => p.name.toLowerCase() === result.product_name.toLowerCase());
    if (matching.length > 0) {
      productIds = matching.map((p) => p.id);
      await supabase.from("products").update({ image_url: urlData.publicUrl }).in("id", productIds);
    }
  } else {
    // Auto-create new product across all stores EXCEPT 7-Eleven
    const { data: allStores } = await supabase.from("stores").select("id, name");
    const eligibleStoreIds = (allStores || [])
      .filter((s: any) => !/7[-\s]?eleven|seven[-\s]?eleven/i.test(s.name || ""))
      .map((s: any) => s.id);

    if (eligibleStoreIds.length === 0) throw new Error("No eligible stores found");

    const newProducts = eligibleStoreIds.map((storeId: string) => ({
      name: result.product_name,
      category: result.category,
      size: result.size || null,
      price: 0,
      store_id: storeId,
      image_url: urlData.publicUrl,
      in_stock: true,
    }));
    const { data: inserted, error: insErr } = await supabase.from("products").insert(newProducts).select("id");
    if (insErr) throw new Error(`product insert failed: ${insErr.message}`);
    productIds = (inserted || []).map((r: any) => r.id);
  }

  await supabase.from("bulk_image_jobs").update({
    status: "assigned",
    identified_name: result.product_name,
    identified_category: result.category,
    identified_size: result.size || null,
    is_existing: result.is_existing,
    confidence: result.confidence,
    final_image_url: urlData.publicUrl,
    product_ids: productIds,
    processed_at: new Date().toISOString(),
  }).eq("id", job.id);

  // Move source out of watch folder
  await supabase.storage.from(BUCKET).move(job.storage_path, `bulk-processed/${job.file_name}`).catch(() => {});
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { synced, deduped } = await syncStorageToJobs();

    const { data: pending } = await supabase
      .from("bulk_image_jobs")
      .select("*")
      .in("status", ["pending"])
      .lt("attempts", 3)
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ synced, deduped, processed: 0, message: "no pending jobs" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const products = await fetchAllProducts();
    const coveredNames = new Set(products.filter((p) => p.image_url && p.image_url.trim()).map((p) => p.name.toLowerCase()));

    let success = 0, failed = 0;
    for (const job of pending) {
      try {
        await processOneJob(job, products, coveredNames);
        success++;
        await new Promise((r) => setTimeout(r, 1200)); // rate-limit pacing
      } catch (e: any) {
        failed++;
        await supabase.from("bulk_image_jobs").update({
          status: "error",
          error_message: e.message || String(e),
          processed_at: new Date().toISOString(),
        }).eq("id", job.id);
      }
    }

    return new Response(JSON.stringify({ synced, deduped, processed: pending.length, success, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("processor error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
