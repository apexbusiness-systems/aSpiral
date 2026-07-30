import { serveWithAuth } from "../_shared/apiHelper.ts";

function toCSV(data: Record<string, unknown>[], headers: string[]): string {
  const headerRow = headers.join(',');
  const rows = data.map(item =>
    headers.map(h => {
      const value = item[h];
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',')
  );
  return [headerRow, ...rows].join('\n');
}

serveWithAuth(async ({ req, supabase, userId, corsHeaders, url }) => {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

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

  // Fetch all session data from canonical tables
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
    const csvData = toCSV(exportData.entities, [
      'id', 'session_id', 'label', 'type', 'metadata', 'created_at', 'updated_at',
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
});
