import { serveWithAuth, verifySessionOwner, jsonResponse } from "../_shared/apiHelper.ts";

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

serveWithAuth(async (ctx) => {
  const { req, supabase, corsHeaders, url } = ctx;
  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, corsHeaders, 405);
  }

  const result = await verifySessionOwner(ctx);
  if (result instanceof Response) return result;
  const { session, sessionId } = result;

  const format = url.searchParams.get('format') || 'json';

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
  return jsonResponse(exportData, {
    ...corsHeaders,
    'Content-Disposition': `attachment; filename="session-${sessionId}.json"`,
  });
});
