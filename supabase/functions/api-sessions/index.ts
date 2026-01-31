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
    const sessionId = url.searchParams.get('id');

    if (req.method === 'GET') {
      if (sessionId) {
        // Get single session
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .eq('user_id', userId)
          .maybeSingle();

        if (error) throw error;
        
        return new Response(JSON.stringify({ session: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        // List sessions
        const limit = Number.parseInt(url.searchParams.get('limit') || '50');
        const offset = Number.parseInt(url.searchParams.get('offset') || '0');

        const { data, error, count } = await supabase
          .from('sessions')
          .select('*', { count: 'exact' })
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) throw error;

        return new Response(JSON.stringify({ sessions: data, total: count }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (req.method === 'POST') {
      const body = await req.json();
      
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          user_id: userId,
          title: body.title || 'New Session',
          workspace_id: body.workspace_id || null,
        })
        .select()
        .single();

      if (error) throw error;

      console.log('Created session:', data.id);

      return new Response(JSON.stringify({ session: data }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'DELETE' && sessionId) {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', userId);

      if (error) throw error;

      console.log('Deleted session:', sessionId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('API Sessions error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
