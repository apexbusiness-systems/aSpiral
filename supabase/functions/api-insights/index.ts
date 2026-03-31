import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { corsHeaders as defaultCorsHeaders } from "../_shared/cors.ts";
import { validateAuth } from "../_shared/auth.ts";

const uuidSchema = z.string().uuid();

// Configuration for secure CORS
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "*").split(",");

const getCorsHeaders = (origin: string) => ({
  ...defaultCorsHeaders,
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes("*") ? origin : ALLOWED_ORIGINS[0],
});

async function handleSessionInsights(supabase: any, origin: string, sessionId: string, userId: string): Promise<Response> {
  const { data: session } = await supabase
    .from('sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!session) {
    return new Response(JSON.stringify({ error: 'Session not found' }), {
      status: 404,
      headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
    });
  }

  const [breakthroughs, entities, frictionPoints, messages] = await Promise.all([
    supabase.from('breakthroughs').select('*').eq('session_id', sessionId),
    supabase.from('entities').select('type, energy').eq('session_id', sessionId),
    supabase.from('friction_points').select('resolved').eq('session_id', sessionId),
    supabase.from('messages').select('*', { count: 'exact', head: true }).eq('session_id', sessionId),
  ]);

  const insights = {
    session_id: sessionId,
    summary: {
      total_breakthroughs: breakthroughs.data?.length || 0,
      total_entities: entities.data?.length || 0,
      total_friction_points: frictionPoints.data?.length || 0,
      resolved_friction_points: frictionPoints.data?.filter((f: any) => f.resolved).length || 0,
      total_messages: messages.count || 0,
    },
    breakthroughs: breakthroughs.data || [],
    entity_types: entities.data?.reduce((acc: Record<string, number>, e: any) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {}) || {},
    energy_distribution: entities.data?.reduce((acc: Record<string, number>, e: any) => {
      acc[e.energy] = (acc[e.energy] || 0) + 1;
      return acc;
    }, {}) || {},
  };

  return new Response(JSON.stringify({ insights }), {
    headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

async function handleUserInsights(supabase: any, origin: string, userId: string): Promise<Response> {
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('id, created_at')
    .eq('user_id', userId);

  if (sessionsError) throw sessionsError;

  const sessionIds = sessions?.map((s: any) => s.id) || [];
  let userBreakthroughs: any[] = [];

  if (sessionIds.length > 0) {
    const { data: breakthroughs, error: breakthroughsError } = await supabase
      .from('breakthroughs')
      .select('id, session_id, created_at')
      .in('session_id', sessionIds);

    if (breakthroughsError) throw breakthroughsError;
    userBreakthroughs = breakthroughs || [];
  }

  const insights = {
    total_sessions: sessions?.length || 0,
    total_breakthroughs: userBreakthroughs.length,
    sessions_this_week: sessions?.filter((s: any) => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return new Date(s.created_at) > weekAgo;
    }).length || 0,
    avg_breakthroughs_per_session: sessionIds.length > 0
      ? (userBreakthroughs.length / sessionIds.length).toFixed(2)
      : 0,
  };

  return new Response(JSON.stringify({ insights }), {
    headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  const origin = req.headers.get("origin") || "";

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(origin) });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const userId = await validateAuth(req, supabase);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
      });
    }

    const userValidation = uuidSchema.safeParse(userId);
    if (!userValidation.success) {
      return new Response(JSON.stringify({ error: 'Invalid user identity', details: userValidation.error.format() }), {
        status: 400,
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const sessionId = url.searchParams.get('session_id');

    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
      });
    }

    if (sessionId) {
      const sessionValidation = uuidSchema.safeParse(sessionId);
      if (!sessionValidation.success) {
        return new Response(JSON.stringify({ error: 'Invalid session ID format', details: sessionValidation.error.format() }), {
          status: 400,
          headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        });
      }
      return await handleSessionInsights(supabase, origin, sessionId, userId);
    } else {
      return await handleUserInsights(supabase, origin, userId);
    }

  } catch (error: unknown) {
    console.error('API Insights error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
    });
  }
});
