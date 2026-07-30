import { serveWithAuth } from "../_shared/apiHelper.ts";

async function handleGet(supabase: any, userId: string, corsHeaders: any, url: URL, sessionId: string | null) {
  if (sessionId) {
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
  }

  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');

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

async function handlePost(req: Request, supabase: any, userId: string, corsHeaders: any) {
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

async function handleDelete(supabase: any, userId: string, corsHeaders: any, sessionId: string) {
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

serveWithAuth(async ({ req, supabase, userId, corsHeaders, url }) => {
  const sessionId = url.searchParams.get('id');

  if (req.method === 'GET') {
    return handleGet(supabase, userId, corsHeaders, url, sessionId);
  }

  if (req.method === 'POST') {
    return handlePost(req, supabase, userId, corsHeaders);
  }

  if (req.method === 'DELETE' && sessionId) {
    return handleDelete(supabase, userId, corsHeaders, sessionId);
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
