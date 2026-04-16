import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { leadId, campaignId, workspaceId, count = 3 } = await req.json();

    if (!leadId || !campaignId || !workspaceId) {
      return new Response(
        JSON.stringify({ error: "leadId, campaignId and workspaceId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const [{ data: lead }, { data: campaign }] = await Promise.all([
      supabase.from("leads").select("*").eq("id", leadId).eq("workspace_id", workspaceId).single(),
      supabase.from("campaigns").select("*").eq("id", campaignId).eq("workspace_id", workspaceId).single(),
    ]);

    if (!lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Campaign Context: ${campaign.context}

Instructions: ${campaign.prompt_instructions}

Lead Information:
- Name: ${lead.name}
- Company: ${lead.company || "N/A"}
- Role: ${lead.role || "N/A"}
- Email: ${lead.email || "N/A"}
- Phone: ${lead.phone || "N/A"}
- Notes: ${lead.notes || "N/A"}
- Source: ${lead.source || "N/A"}

Generate ${count} personalized outreach messages for this lead. Each message should be distinct. Format as JSON: {"messages": [{"content": "..."}]}`;

    const completion = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 2048,
      }),
    });

    const completionData = await completion.json();
    const rawContent = completionData.choices?.[0]?.message?.content ?? '{"messages":[]}';
    const parsed = JSON.parse(rawContent);
    const messageContents: Array<{ content: string }> = parsed.messages ?? [];

    const { data: inserted, error: insertError } = await supabase
      .from("generated_messages")
      .insert(
        messageContents.slice(0, count).map((m) => ({
          lead_id: leadId,
          campaign_id: campaignId,
          content: m.content,
          status: "generated",
        })),
      )
      .select();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("activity_events").insert({
      lead_id: leadId,
      lead_name: lead.name,
      workspace_id: workspaceId,
      event_type: "messages_generated",
      description: `${inserted?.length ?? 0} messages generated for campaign "${campaign.name}"`,
    });

    return new Response(JSON.stringify(inserted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
