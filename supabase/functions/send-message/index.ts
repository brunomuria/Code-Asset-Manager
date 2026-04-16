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

    const { messageId, leadId, workspaceId } = await req.json();

    if (!messageId || !leadId || !workspaceId) {
      return new Response(
        JSON.stringify({ error: "messageId, leadId and workspaceId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: message, error: msgError } = await supabase
      .from("generated_messages")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", messageId)
      .eq("lead_id", leadId)
      .select()
      .single();

    if (msgError || !message) {
      return new Response(JSON.stringify({ error: msgError?.message ?? "Message not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .update({ stage: "tentando-contato", updated_at: new Date().toISOString() })
      .eq("id", leadId)
      .eq("workspace_id", workspaceId)
      .select()
      .single();

    if (leadError || !lead) {
      return new Response(JSON.stringify({ error: leadError?.message ?? "Lead not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("activity_events").insert({
      lead_id: lead.id,
      lead_name: lead.name,
      workspace_id: workspaceId,
      event_type: "message_sent",
      description: `Message sent to "${lead.name}" — lead moved to "Tentando Contato"`,
    });

    return new Response(JSON.stringify(lead), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
