import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

/**
 * Creates a request-scoped Supabase client, validates the JWT, and returns
 * the authenticated user. Returns a 401 Response if auth fails so callers
 * can do: `const userOrResp = await requireUser(req, cors); if (userOrResp instanceof Response) return userOrResp;`
 */
export async function requireUser(
  req: Request,
  corsHeaders: Record<string, string>
): Promise<{ id: string; email?: string } | Response> {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: { Authorization: req.headers.get("Authorization")! },
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized: Valid Supabase JWT required" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  return user;
}

export async function getOptionalUser(
  req: Request
): Promise<{ id: string; email?: string } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    return user ?? null;
  } catch {
    return null;
  }
}

