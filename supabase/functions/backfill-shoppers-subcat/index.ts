import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import seed from "../_shoppers_seed.json" with { type: "json" };

const STORE_ID = "862492f3-afd1-48a0-bca0-463b38e9652a";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const sizeRe = /-\s*([\d.,]+\s*(?:mL|ml|L|g|kg|oz|TAB|CAP|CT|ct|pk|PK|EA|ea|G)\b.*)$/i;
  const byCat = new Map<string, Set<string>>();
  for (const it of seed as Array<{name:string; category:string}>) {
    let nm = it.name;
    const m = nm.match(sizeRe);
    if (m) nm = nm.slice(0, nm.length - m[0].length).replace(/[\s-]+$/,"").trim();
    nm = nm.slice(0, 255);
    if (!byCat.has(it.category)) byCat.set(it.category, new Set());
    byCat.get(it.category)!.add(nm);
  }
  let updated = 0;
  for (const [cat, names] of byCat) {
    const arr = [...names];
    const { count, error } = await supabase
      .from("products")
      .update({ subcategory: cat }, { count: "exact" })
      .eq("store_id", STORE_ID)
      .in("name", arr);
    if (error) return new Response(JSON.stringify({ error: error.message, cat }), { status: 500 });
    updated += count ?? 0;
  }
  return new Response(JSON.stringify({ updated, cats: byCat.size }), {
    headers: { "Content-Type": "application/json" },
  });
});
