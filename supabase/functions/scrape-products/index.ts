import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");

    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ error: "Firecrawl not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is admin
    const supabase = createClient(supabaseUrl, supabaseKey);
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { url, importType, sourceName } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const domain = new URL(formattedUrl).hostname;

    // Create import session
    const { data: session, error: sessionError } = await supabase
      .from("import_sessions")
      .insert({
        user_id: user.id,
        source_url: formattedUrl,
        source_domain: domain,
        import_type: importType || "product_listing",
        source_name: sourceName || domain,
        status: "scanning",
      })
      .select()
      .single();

    if (sessionError) {
      console.error("Session creation error:", sessionError);
      return new Response(JSON.stringify({ error: "Failed to create import session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Scrape with Firecrawl
    console.log("Scraping URL:", formattedUrl);
    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["markdown", "links"],
        onlyMainContent: true,
      }),
    });

    const scrapeData = await scrapeResponse.json();
    if (!scrapeResponse.ok) {
      console.error("Firecrawl error:", scrapeData);
      await supabase.from("import_sessions").update({ status: "failed" }).eq("id", session.id);
      return new Response(
        JSON.stringify({ error: scrapeData.error || "Failed to scrape page", sessionId: session.id }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
    const links = scrapeData.data?.links || scrapeData.links || [];

    // Use Lovable AI to extract products from markdown
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      await supabase.from("import_sessions").update({ status: "failed" }).eq("id", session.id);
      return new Response(JSON.stringify({ error: "AI processing not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extractionPrompt = `You are a product data extractor for a liquor delivery website. Analyze the following webpage content and extract ALL product listings you can find.

For each product, extract:
- product_name: The full product name
- brand: The brand name (e.g., Budweiser, Corona, Jack Daniels)
- category: One of: beer, wine, spirits, smokes (best guess)
- description: Brief description if available
- image_url: Product image URL if found
- price: Numeric price (just the number, no $ sign)
- compare_at_price: Original/compare price if on sale
- variant: Size/pack info like "24 Pack", "750ml", "1 Tall Can", "6 Pack"
- size: Volume like "355ml", "750ml", "1L"
- sku: SKU/product code if visible
- availability: "in_stock" or "out_of_stock" if detectable
- source_url: Product detail URL if found in the links

Return a JSON array of products. If no products found, return an empty array [].
Only return valid JSON, no markdown formatting.

WEBPAGE CONTENT:
${markdown.substring(0, 12000)}

LINKS FOUND ON PAGE:
${links.slice(0, 50).join("\n")}`;

    const aiResponse = await fetch("https://ai.lovable.dev/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: extractionPrompt }],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI extraction failed:", await aiResponse.text());
      await supabase.from("import_sessions").update({ status: "failed" }).eq("id", session.id);
      return new Response(JSON.stringify({ error: "AI extraction failed", sessionId: session.id }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";

    // Parse extracted products
    let products: any[] = [];
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      products = JSON.parse(cleaned);
      if (!Array.isArray(products)) products = [products];
    } catch (e) {
      console.error("Failed to parse AI output:", content);
      products = [];
    }

    // Fetch existing products for matching
    const { data: existingProducts } = await supabase
      .from("products")
      .select("id, name, category, image_url")
      .limit(1000);

    // Insert drafts with match detection
    const drafts = products.map((p: any) => {
      let matchStatus = "new";
      let matchedId: string | null = null;

      if (existingProducts && p.product_name) {
        const nameClean = p.product_name.toLowerCase().trim();
        for (const ep of existingProducts) {
          const epClean = ep.name.toLowerCase().trim();
          if (nameClean === epClean) {
            matchStatus = "exact_match";
            matchedId = ep.id;
            break;
          }
          // Word overlap check
          const pWords = nameClean.split(/\s+/);
          const eWords = epClean.split(/\s+/);
          const overlap = pWords.filter((w: string) => eWords.some((ew: string) => ew.includes(w) || w.includes(ew)));
          if (overlap.length >= Math.min(2, pWords.length)) {
            matchStatus = "possible_match";
            matchedId = ep.id;
          }
        }
      }

      const missingFields = [];
      if (!p.product_name) missingFields.push("name");
      if (!p.price && p.price !== 0) missingFields.push("price");
      if (!p.image_url) missingFields.push("image");
      if (missingFields.length > 0 && matchStatus === "new") {
        matchStatus = "missing_data";
      }

      return {
        session_id: session.id,
        source_url: p.source_url || null,
        product_name: p.product_name || "Unknown Product",
        brand: p.brand || null,
        category: p.category || null,
        description: p.description || null,
        imported_image_url: p.image_url || null,
        imported_price: p.price ? parseFloat(p.price) : null,
        compare_at_price: p.compare_at_price ? parseFloat(p.compare_at_price) : null,
        variant: p.variant || null,
        size: p.size || null,
        sku: p.sku || null,
        availability: p.availability || null,
        match_status: matchStatus,
        matched_product_id: matchedId,
        review_status: "pending",
      };
    });

    if (drafts.length > 0) {
      const { error: draftsError } = await supabase.from("import_drafts").insert(drafts);
      if (draftsError) {
        console.error("Drafts insert error:", draftsError);
      }
    }

    // Update session
    await supabase.from("import_sessions").update({
      status: "review",
      total_scanned: drafts.length,
    }).eq("id", session.id);

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: session.id,
        totalScanned: drafts.length,
        matchSummary: {
          new: drafts.filter((d: any) => d.match_status === "new").length,
          exact_match: drafts.filter((d: any) => d.match_status === "exact_match").length,
          possible_match: drafts.filter((d: any) => d.match_status === "possible_match").length,
          missing_data: drafts.filter((d: any) => d.match_status === "missing_data").length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Scrape error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
