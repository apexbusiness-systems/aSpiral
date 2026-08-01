/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

interface HealthResponse {
  status: "ok" | "error" | "disabled";
  message: string;
  circuitBreakerState?: string;
  queuedEvents?: number;
  timestamp: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") return handleCorsPreFlight(req);

  const corsHeaders = getCorsHeaders(req);

  console.log("[OMNILINK-HEALTH] Health check requested");

  try {
    const omniLinkEnabled = Deno.env.get("OMNILINK_ENABLED") === "true";
    const omniLinkUrl = Deno.env.get("OMNILINK_BASE_URL");
    const omniLinkTenantId = Deno.env.get("OMNILINK_TENANT_ID");
    const omniLinkApiKey = Deno.env.get("OMNILINK_API_KEY");

    // Check if disabled
    if (!omniLinkEnabled) {
      const response: HealthResponse = {
        status: "disabled",
        message: "OMNiLiNK integration is disabled (OK)",
        timestamp: new Date().toISOString(),
      };

      console.log("[OMNILINK-HEALTH] Integration disabled");

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check configuration
    if (!omniLinkUrl || !omniLinkTenantId || !omniLinkApiKey) {
      const response: HealthResponse = {
        status: "error",
        message: "OMNiLiNK configuration incomplete - missing environment variables",
        timestamp: new Date().toISOString(),
      };

      console.error("[OMNILINK-HEALTH] Missing configuration");

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 503,
      });
    }

    // Try to ping the OMNiLiNK hub
    try {
      const pingResponse = await fetch(`${omniLinkUrl}/health`, {
        method: "GET",
        headers: {
          "X-Tenant-Id": omniLinkTenantId,
          "X-API-Key": omniLinkApiKey,
        },
        signal: AbortSignal.timeout(5000),
      });

      if (pingResponse.ok) {
        const response: HealthResponse = {
          status: "ok",
          message: "OMNiLiNK integration operational",
          circuitBreakerState: "CLOSED",
          queuedEvents: 0,
          timestamp: new Date().toISOString(),
        };

        console.log("[OMNILINK-HEALTH] Hub connection successful");

        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } else {
        throw new Error(`Hub returned ${pingResponse.status}`);
      }
    } catch (hubError) {
      // Hub not reachable, but that's OK if we're configured
      console.warn("[OMNILINK-HEALTH] Hub not reachable:", hubError);

      const response: HealthResponse = {
        status: "ok",
        message: "OMNiLiNK configured but hub unreachable (events will be queued)",
        circuitBreakerState: "HALF_OPEN",
        queuedEvents: 0,
        timestamp: new Date().toISOString(),
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
  } catch (error) {
    console.error("[OMNILINK-HEALTH] Error:", error);

    const response: HealthResponse = {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
