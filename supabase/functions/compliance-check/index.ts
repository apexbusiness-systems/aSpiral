import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Check compliance_audit_events
  const { data: events, error: eventsErr } = await supabase
    .from("compliance_audit_events")
    .select("request_id, event_type, jurisdiction, processing_time_ms, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  // Check compliance_request_runs
  const { data: runs, error: runsErr } = await supabase
    .from("compliance_request_runs")
    .select("request_id, status, jurisdiction, blocked, escalated, total_time_ms, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  return new Response(JSON.stringify({
    events: events || [],
    eventsError: eventsErr?.message,
    runs: runs || [],
    runsError: runsErr?.message,
  }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
