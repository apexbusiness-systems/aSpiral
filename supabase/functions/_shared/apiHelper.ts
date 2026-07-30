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
      return jsonResponse({ error: 'Authentication required' }, corsHeaders, 401);
    }

    const url = new URL(req.url);

    return await handler({ req, supabase, userId, corsHeaders, url });

  } catch (error: unknown) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: message }, corsHeaders, 500);
  }
}
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
export function serveWithAuth(handler: (ctx: ApiContext) => Promise<Response>) { serve((req) => withAuth(req, handler)); }

export async function verifySessionOwner(ctx: ApiContext, sessionParamName = 'session_id'): Promise<any | Response> {
  const sessionId = ctx.url.searchParams.get(sessionParamName) || ctx.url.searchParams.get('id');

  if (!sessionId) {
    return jsonResponse({ error: `${sessionParamName} required` }, ctx.corsHeaders, 400);
  }

  const { data: session } = await ctx.supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', ctx.userId)
    .maybeSingle();

  if (!session) {
    return jsonResponse({ error: 'Session not found' }, ctx.corsHeaders, 404);
  }

  return { session, sessionId };
}

export function jsonResponse(data: any, corsHeaders: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
