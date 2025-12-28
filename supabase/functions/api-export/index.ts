import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

async function validateAuth(req: Request, supabase: any): Promise<string | null> {
  const apiKey = req.headers.get('x-api-key');
  const authHeader = req.headers.get('authorization');
  
  if (apiKey) {
    const keyHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(apiKey)
    );
    const hashHex = Array.from(new Uint8Array(keyHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const { data: keyData } = await supabase
      .from('api_keys')
      .select('user_id')
      .eq('key_hash', hashHex)
      .maybeSingle();

    if (keyData) {
      await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('key_hash', hashHex);
      return keyData.user_id;
    }
  } else if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) return user.id;
  }
  
  return null;
}

function toCSV(data: any[], headers: string[]): string {
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

    // Fetch all session data
    const [entities, connections, frictionPoints, breakthroughs, messages] = await Promise.all([
      supabase.from('entities').select('*').eq('session_id', sessionId).order('created_at'),
      supabase.from('connections').select('*').eq('session_id', sessionId).order('created_at'),
      supabase.from('friction_points').select('*').eq('session_id', sessionId).order('created_at'),
      supabase.from('breakthroughs').select('*').eq('session_id', sessionId).order('created_at'),
      supabase.from('messages').select('*').eq('session_id', sessionId).order('message_order'),
    ]);

    const exportData = {
      session,
      entities: entities.data || [],
      connections: connections.data || [],
      friction_points: frictionPoints.data || [],
      breakthroughs: breakthroughs.data || [],
      messages: messages.data || [],
      exported_at: new Date().toISOString(),
    };

    if (format === 'csv') {
      // Create CSV with entities data (most useful for analysis)
      const csvData = toCSV(exportData.entities, [
        'id', 'entity_id', 'label', 'type', 'energy', 'position_x', 'position_y', 'position_z', 'created_at'
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
