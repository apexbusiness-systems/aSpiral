import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "./cors.ts";
import { validateAuth } from "./auth.ts";

export type ApiContext = {
  req: Request;
  supabase: SupabaseClient;
  userId: string;
  corsHeaders: Record<string, string>;
  url: URL;
};

export async function withAuth(
  req: Request,
  handler: (ctx: ApiContext) => Promise<Response>
): Promise<Response> {
  const preflight = handleCorsPreFlight(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const userId = await validateAuth(req, supabase);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);

    return await handler({ req, supabase, userId, corsHeaders, url });

  } catch (error: unknown) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
export function serveWithAuth(handler: (ctx: ApiContext) => Promise<Response>) { serve((req) => withAuth(req, handler)); }
