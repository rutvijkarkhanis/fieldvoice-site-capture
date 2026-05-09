import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STAGES = ["Excavation","Foundation","RCC Structure","Brickwork","Plaster","Waterproofing","Electrical Rough-In","Plumbing Rough-In","Flooring","Ceiling","Painting","Interior Fit-Out","Façade Installation","Final Finishing","Handover"];
const PRODUCTS = ["Cement","White Cement","TMT Bars","Bricks & Blocks","Sand & Aggregates","Waterproofing","Adhesives & Sealants","Tiles","Plumbing","Electrical","Lighting","Fans","Doors","Plywood","Laminates","ACP","WPC","Hardware","Paints","Safety PPE"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transcript } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const today = new Date().toISOString().slice(0, 10);

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: `You extract structured construction site lead data from a sales rep's voice note. Today is ${today}. Return only fields you are confident about. Convert relative dates ("next Tuesday") into YYYY-MM-DD.` },
          { role: "user", content: transcript },
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_lead",
            description: "Save extracted lead fields",
            parameters: {
              type: "object",
              properties: {
                site_name: { type: "string" },
                contact_name: { type: "string" },
                contact_phone: { type: "string" },
                company_name: { type: "string" },
                site_address: { type: "string" },
                stage: { type: "string", enum: STAGES },
                products: { type: "array", items: { type: "string", enum: PRODUCTS } },
                priority: { type: "string", enum: ["Hot","Warm","Cold"] },
                followup_date: { type: "string", description: "YYYY-MM-DD" },
                notes: { type: "string" },
              },
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_lead" } },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI error", resp.status, t);
      return new Response(JSON.stringify({ error: resp.status === 429 ? "Rate limit, please retry" : resp.status === 402 ? "AI credits exhausted" : "AI error" }), { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const extracted = args ? JSON.parse(args) : {};
    return new Response(JSON.stringify({ extracted }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});