import { serveWithAuth, verifySessionOwner, jsonResponse } from "../_shared/apiHelper.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
serveWithAuth(async (ctx) => {
  const { req, supabase, corsHeaders } = ctx;
  const result = await verifySessionOwner(ctx);
  if (result instanceof Response) return result;
  const { sessionId } = result;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('session_entities')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return jsonResponse({ entities: data }, corsHeaders);
  }

  if (req.method === 'POST') {
    const body = await req.json();

    const { data, error } = await supabase
      .from('session_entities')
      .insert({
        session_id: sessionId,
        label: body.label,
        type: body.type || 'concept',
        metadata: {
          entity_id: body.entity_id || crypto.randomUUID(),
          energy: body.energy || 'neutral',
          position_x: body.position_x ?? 0,
          position_y: body.position_y ?? 0,
          position_z: body.position_z ?? 0,
        },
      })
      .select()
      .single();

    if (error) throw error;

    console.log('Created entity:', data.id);
    return jsonResponse({ entity: data }, corsHeaders, 201);
  }

  return jsonResponse({ error: 'Method not allowed' }, corsHeaders, 405);
});
