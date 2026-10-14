import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";
// Regina, SK city centre with a 50 km bias, Canada only.
const REGINA_CENTER = { latitude: 50.4452, longitude: -104.6189 };
const RADIUS_METERS = 50000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { input } = await req.json();
    if (!input || typeof input !== "string" || input.trim().length < 3 || input.length > 200) {
      return new Response(JSON.stringify({ predictions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const googleKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!lovableKey || !googleKey) {
      throw new Error("Google Maps connector credentials not configured");
    }

    const response = await fetch(`${GATEWAY_URL}/places/v1/places:autocomplete`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": googleKey,
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text",
      },
      body: JSON.stringify({
        input: input.trim(),
        sessionToken: crypto.randomUUID(),
        includedRegionCodes: ["CA"],
        locationBias: {
          circle: {
            center: REGINA_CENTER,
            radius: RADIUS_METERS,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Places autocomplete failed [${response.status}]: ${errorBody}`);
      throw new Error(`Places API request failed (${response.status})`);
    }

    const data = await response.json();

    const predictions = (data.suggestions || [])
      .filter((s: any) => s.placePrediction)
      .map((s: any) => ({
        place_id: s.placePrediction.placeId,
        description: s.placePrediction.text?.text || "",
        main_text: s.placePrediction.structuredFormat?.mainText?.text || "",
        secondary_text: s.placePrediction.structuredFormat?.secondaryText?.text || "",
      }));

    return new Response(JSON.stringify({ predictions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error?.message);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
