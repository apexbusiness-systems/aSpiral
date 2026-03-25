/**
 * Shared CORS Configuration — Origin-Restricted
 *
 * Reads ALLOWED_ORIGINS from environment (comma-separated).
 * In production this MUST be set to your actual domains.
 * Falls back to a strict default list when the env var is absent.
 *
 * Usage:
 *   import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
 *   // In handler:
 *   if (req.method === "OPTIONS") return handleCorsPreFlight(req);
 *   // In response:
 *   new Response(body, { headers: { ...getCorsHeaders(req), ... } });
 */

const FALLBACK_ORIGINS = [
  "https://aspiral.pages.dev",
  "https://app.apex-business.com",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8080",
];

const ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-api-key, x-idempotency-key";

/**
 * Parse the allow-list once per cold start.
 * If ALLOWED_ORIGINS is "*", we permit every origin (dev/staging escape hatch).
 */
function parseAllowedOrigins(): { origins: string[]; allowAll: boolean } {
  const raw = Deno.env.get("ALLOWED_ORIGINS") ?? "";
  if (raw.trim() === "*") return { origins: [], allowAll: true };
  const parsed = raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return {
    origins: parsed.length > 0 ? parsed : FALLBACK_ORIGINS,
    allowAll: false,
  };
}

const { origins, allowAll } = parseAllowedOrigins();

/**
 * Resolve the Access-Control-Allow-Origin value for a request.
 * Returns the request origin if it's in the allow-list, otherwise the first
 * allowed origin (so the browser will reject the response for unknown origins).
 */
function resolveOrigin(requestOrigin: string | null): string {
  if (allowAll) return requestOrigin || "*";
  if (requestOrigin && origins.includes(requestOrigin)) return requestOrigin;
  return origins[0] ?? "https://aspiral.pages.dev";
}

/**
 * Build CORS headers for a given request.
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": resolveOrigin(origin),
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/**
 * Convenience: return a 204 preflight response.
 */
export function handleCorsPreFlight(req: Request): Response {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}

/**
 * Legacy export — kept for any import that destructures `corsHeaders`.
 * Prefer getCorsHeaders(req) for origin-aware behaviour.
 * @deprecated Use getCorsHeaders(req) instead.
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin": origins[0] ?? "https://aspiral.pages.dev",
  "Access-Control-Allow-Headers": ALLOWED_HEADERS,
};
