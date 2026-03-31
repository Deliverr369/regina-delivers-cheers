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

    // Scrape with Firecrawl - request both markdown AND html to capture images
    console.log("Scraping URL:", formattedUrl);
    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["markdown", "html", "links"],
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
    const html = scrapeData.data?.html || scrapeData.html || "";
    const links = scrapeData.data?.links || scrapeData.links || [];

    const normalizeImageUrl = (value: string | null) => {
      if (!value) return null;

      let normalized = value.trim()
        .replace(/%7Bwidth%7D/gi, "800")
        .replace(/%7Bheight%7D/gi, "800")
        .replace(/\{width\}/gi, "800")
        .replace(/\{height\}/gi, "800");

      if (normalized.startsWith("//")) normalized = `https:${normalized}`;
      else if (normalized.startsWith("/")) normalized = `https://${domain}${normalized}`;
      else if (!normalized.startsWith("http")) normalized = `https://${domain}/${normalized.replace(/^\/+/, "")}`;

      return normalized;
    };

    // Extract image URLs from the HTML to pass to the AI
    const imgMatches: string[] = [];
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      const src = normalizeImageUrl(match[1]);
      if (src && !src.includes("data:image/svg") && !src.includes("pixel") && !src.includes("spacer")) {
        imgMatches.push(src);
      }
    }

    // Also extract from srcset
    const srcsetRegex = /srcset=["']([^"']+)["']/gi;
    while ((match = srcsetRegex.exec(html)) !== null) {
      const urls = match[1]
        .split(",")
        .map((part) => normalizeImageUrl(part.trim().split(/\s+/)[0]))
        .filter(Boolean) as string[];
      imgMatches.push(...urls);
    }

    const uniqueImages = [...new Set(imgMatches)].slice(0, 100);
    console.log(`Found ${uniqueImages.length} images in HTML`);

    // Use Lovable AI to extract products
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      await supabase.from("import_sessions").update({ status: "failed" }).eq("id", session.id);
      return new Response(JSON.stringify({ error: "AI processing not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extractionPrompt = `You are a product data extractor for a liquor delivery website. Analyze the following webpage content and extract ALL product listings you can find.

CRITICAL RULES:
1. Extract EVERY product you can find
2. For image_url: Look carefully at the HTML content and image list below. Match product images by finding img tags near the product name or inside the same product card div. Use the FULL absolute URL. If the URL starts with // add https: prefix. If it starts with / add the base domain.
3. For price: Extract numeric price without $ sign
4. For variant/size: Look for text like "750ml", "1L", "1.14L", "375ml", "24 Pack", "12 Pack", "6 Pack", "Tall Can", "1 Tall Can", etc. Check both the product name AND nearby text.
5. For category: classify as one of: beer, wine, spirits, smokes
6. For brand: Extract the brand name (e.g., "Smirnoff", "Jack Daniels", "Budweiser")

For each product return this JSON structure:
{
  "product_name": "Full product name",
  "brand": "Brand name",
  "category": "beer|wine|spirits|smokes",
  "description": "Brief description if available",
  "image_url": "FULL absolute URL to product image",
  "price": 29.99,
  "compare_at_price": null,
  "variant": "750ml or pack size like 24 Pack",
  "size": "volume like 750ml, 1L, 355ml",
  "sku": "SKU if visible",
  "availability": "in_stock or out_of_stock",
  "source_url": "product detail URL if found"
}

Return ONLY a valid JSON array. No markdown code fences. No explanation text.

BASE DOMAIN: ${domain}
BASE URL: ${formattedUrl}

IMAGES FOUND ON PAGE:
${uniqueImages.slice(0, 60).join("\n")}

WEBPAGE CONTENT (MARKDOWN):
${markdown.substring(0, 8000)}

WEBPAGE HTML SNIPPET (for image matching):
${html.substring(0, 8000)}`;

    console.log("Calling AI for extraction...");
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
      const errText = await aiResponse.text();
      console.error("AI extraction failed:", errText);
      await supabase.from("import_sessions").update({ status: "failed" }).eq("id", session.id);
      return new Response(JSON.stringify({ error: "AI extraction failed", sessionId: session.id }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";

    let products: any[] = [];
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      products = JSON.parse(cleaned);
      if (!Array.isArray(products)) products = [products];
    } catch (e) {
      console.error("Failed to parse AI output:", content.substring(0, 500));
      products = [];
    }

    console.log(`Extracted ${products.length} products`);

    // Fix relative image URLs
    const fixImageUrl = (imgUrl: string | null): string | null => {
      if (!imgUrl) return null;
      if (imgUrl.startsWith("//")) return `https:${imgUrl}`;
      if (imgUrl.startsWith("/")) return `https://${domain}${imgUrl}`;
      if (imgUrl.startsWith("http")) return imgUrl;
      return `https://${domain}/${imgUrl}`;
    };

    // Fetch existing products for matching
    const { data: existingProducts } = await supabase
      .from("products")
      .select("id, name, category, image_url")
      .limit(1000);

    // Insert drafts
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
          const pWords = nameClean.split(/\s+/);
          const eWords = epClean.split(/\s+/);
          const overlap = pWords.filter((w: string) => eWords.some((ew: string) => ew.includes(w) || w.includes(ew)));
          if (overlap.length >= Math.min(2, pWords.length)) {
            matchStatus = "possible_match";
            matchedId = ep.id;
          }
        }
      }

      const imageUrl = fixImageUrl(p.image_url);
      const missingFields = [];
      if (!p.product_name) missingFields.push("name");
      if (!p.price && p.price !== 0) missingFields.push("price");
      if (!imageUrl) missingFields.push("image");
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
        imported_image_url: imageUrl,
        imported_price: p.price ? parseFloat(String(p.price)) : null,
        compare_at_price: p.compare_at_price ? parseFloat(String(p.compare_at_price)) : null,
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
