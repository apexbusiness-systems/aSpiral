import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { validateAuth } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
    const sessionId = url.searchParams.get('session_id');

    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (sessionId) {
      // Get insights for a specific session
      const { data: session } = await supabase
        .from('sessions')
        .select('id')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!session) {
        return new Response(JSON.stringify({ error: 'Session not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const [breakthroughs, entities, frictionPoints, messages] = await Promise.all([
        supabase.from('breakthroughs').select('*').eq('session_id', sessionId),
        supabase.from('entities').select('*').eq('session_id', sessionId),
        supabase.from('friction_points').select('*').eq('session_id', sessionId),
        supabase.from('messages').select('*').eq('session_id', sessionId),
      ]);

      const insights = {
        session_id: sessionId,
        summary: {
          total_breakthroughs: breakthroughs.data?.length || 0,
          total_entities: entities.data?.length || 0,
          total_friction_points: frictionPoints.data?.length || 0,
          resolved_friction_points: frictionPoints.data?.filter(f => f.resolved).length || 0,
          total_messages: messages.data?.length || 0,
        },
        breakthroughs: breakthroughs.data || [],
        entity_types: entities.data?.reduce((acc: Record<string, number>, e) => {
          acc[e.type] = (acc[e.type] || 0) + 1;
          return acc;
        }, {}) || {},
        energy_distribution: entities.data?.reduce((acc: Record<string, number>, e) => {
          acc[e.energy] = (acc[e.energy] || 0) + 1;
          return acc;
        }, {}) || {},
      };

      return new Response(JSON.stringify({ insights }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Get overall user insights
      const [sessions, breakthroughs] = await Promise.all([
        supabase.from('sessions').select('id, created_at').eq('user_id', userId),
        supabase.from('breakthroughs').select('id, session_id, created_at'),
      ]);

      const sessionIds = sessions.data?.map(s => s.id) || [];
      const userBreakthroughs = breakthroughs.data?.filter(b => sessionIds.includes(b.session_id)) || [];

      const insights = {
        total_sessions: sessions.data?.length || 0,
        total_breakthroughs: userBreakthroughs.length,
        sessions_this_week: sessions.data?.filter(s => {
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return new Date(s.created_at) > weekAgo;
        }).length || 0,
        avg_breakthroughs_per_session: sessionIds.length > 0
          ? (userBreakthroughs.length / sessionIds.length).toFixed(2)
          : 0,
      };

      return new Response(JSON.stringify({ insights }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error: unknown) {
    console.error('API Insights error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
