// supabase/functions/_shared/cors.ts
// APEX-standard dynamic CORS utility — covers all deployment origins

const ALLOWED_ORIGINS = [
  'https://aspiral.icu',
  'https://www.aspiral.icu',
  'https://aspiral.pages.dev',
  'https://a-spiral.vercel.app',
  'capacitor://localhost',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-request-id',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

export function handleCorsPreFlight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(req) });
  }
  return null;
}
