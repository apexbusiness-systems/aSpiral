import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateAuth } from "../_shared/auth.ts";

const uuidSchema = z.string().uuid();

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").filter(Boolean);

const STATIC_CORS_ORIGINS = [
  'https://aspiral.icu',
  'https://www.aspiral.icu',
  'https://aspiral.pages.dev',
  'https://a-spiral.vercel.app',
  'capacitor://localhost',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
];

const ALL_ALLOWED = [...STATIC_CORS_ORIGINS, ...ALLOWED_ORIGINS];

const getCorsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': ALL_ALLOWED.includes(origin) ? origin : ALL_ALLOWED[0],
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin',
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

  const [breakthroughs, entities] = await Promise.all([
    supabase.from('breakthroughs').select('*').eq('session_id', sessionId),
    supabase.from('session_entities').select('type, metadata').eq('session_id', sessionId),
  ]);

  const insights = {
    session_id: sessionId,
    summary: {
      total_breakthroughs: breakthroughs.data?.length || 0,
      total_entities: entities.data?.length || 0,
      total_friction_points: 0,
      resolved_friction_points: 0,
      total_messages: 0,
    },
    breakthroughs: breakthroughs.data || [],
    entity_types: entities.data?.reduce((acc: Record<string, number>, e: any) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {}) || {},
    energy_distribution: entities.data?.reduce((acc: Record<string, number>, e: any) => {
      const energy = e.metadata?.energy ?? 'neutral';
      acc[energy] = (acc[energy] || 0) + 1;
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
    return new Response(null, { status: 204, headers: getCorsHeaders(origin) });
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
