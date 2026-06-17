import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { validateAuth } from "../_shared/auth.ts";

function toCSV(data: Record<string, unknown>[], headers: string[]): string {
  const headerRow = headers.join(',');
  const rows = data.map(item =>
    headers.map(h => {
      const value = item[h];
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      // Escape quotes and wrap in quotes if needed
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',')
  );
  return [headerRow, ...rows].join('\n');
}

serve(async (req) => {
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

    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const sessionId = url.searchParams.get('session_id');
    const format = url.searchParams.get('format') || 'json';

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'session_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify session ownership
    const { data: session } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all session data using canonical tables
    const [entities, connections, breakthroughs] = await Promise.all([
      supabase.from('session_entities').select('*').eq('session_id', sessionId).order('created_at'),
      supabase.from('session_connections').select('*').eq('session_id', sessionId).order('created_at'),
      supabase.from('breakthroughs').select('*').eq('session_id', sessionId).order('created_at'),
    ]);

    const exportData = {
      session,
      entities: entities.data || [],
      connections: connections.data || [],
      friction_points: [],
      breakthroughs: breakthroughs.data || [],
      messages: [],
      exported_at: new Date().toISOString(),
    };

    if (format === 'csv') {
      // Create CSV with session_entities data (canonical table)
      const csvData = toCSV(exportData.entities, [
        'id', 'label', 'type', 'metadata', 'session_id', 'created_at', 'updated_at'
      ]);

      return new Response(csvData, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="session-${sessionId}-entities.csv"`,
        },
      });
    }

    console.log('Exported session:', sessionId, 'format:', format);

    return new Response(JSON.stringify(exportData), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="session-${sessionId}.json"`,
      },
    });

  } catch (error: unknown) {
    console.error('API Export error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
