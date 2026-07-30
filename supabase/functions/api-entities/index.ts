import { serveWithAuth } from "../_shared/apiHelper.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
serveWithAuth(async ({ req, supabase, userId, corsHeaders, url }) => {
  const sessionId = url.searchParams.get('session_id');

  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'session_id required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verify session ownership
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

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('session_entities')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return new Response(JSON.stringify({ entities: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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

    return new Response(JSON.stringify({ entity: data }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
