import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Prefer the deployed secret; fall back to the project key for this environment
  const apiKey = Deno.env.get("GEMINI_API_KEY") ?? "AIzaSyBlkmUKPr6bJHuL8t3F-jfykPxtmV-yevc";

  try {
    const { currentPlaces, destination } = await req.json();
    const dest = destination || "Ho Chi Minh City (Saigon), Vietnam";

    const prompt = `You are an expert travel guide for ${dest}.
Based on the following existing places in the user's travel master planner, generate exactly 10 more unique and highly recommended places to visit in ${dest}.

Existing places: ${JSON.stringify(currentPlaces ?? [])}

Include a mix of hidden gems, popular spots, and varied categories like: Food, Fashion, Coffee, Spa, Sightseeing, and Nightlife.
Each district/area must be a real, popular neighbourhood in ${dest}.

Return ONLY a valid JSON array with no markdown or extra text. Each item must have these exact keys:
- "name": place name (string)
- "district": neighbourhood or area name (string)
- "category": one of Food, Fashion, Coffee, Spa, Sightseeing, Nightlife (string)
- "address": full street address (string)`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errBody = await geminiRes.json().catch(() => ({}));
      const msg: string = errBody?.error?.message || geminiRes.statusText;
      const friendly = msg.includes("quota") || geminiRes.status === 429
        ? "Gemini quota exceeded. Try again later."
        : `Generation failed: ${msg}`;
      return new Response(
        JSON.stringify({ error: friendly }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await geminiRes.json();
    const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "[]";
    const match = raw.match(/\[[\s\S]*\]/);
    const suggestions = JSON.parse(match ? match[0] : "[]");

    return new Response(
      JSON.stringify(Array.isArray(suggestions) ? suggestions : []),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: `Generation failed: ${msg}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
