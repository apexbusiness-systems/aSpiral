import { describe, expect, it } from 'vitest';
import { getCorsHeaders, handleCorsPreFlight } from '../supabase/functions/_shared/cors';

describe('cors', () => {
  it('allows known origin', () => {
    const req = new Request('https://x', { headers: { Origin: 'https://aspiral.icu' } });
    expect(getCorsHeaders(req)['Access-Control-Allow-Origin']).toBe('https://aspiral.icu');
  });
  it('falls back on unknown origin', () => {
    const req = new Request('https://x', { headers: { Origin: 'https://evil.com' } });
    expect(getCorsHeaders(req)['Access-Control-Allow-Origin']).toBe('https://aspiral.icu');
  });
  it('preflight returns 204', () => {
    const req = new Request('https://x', { method: 'OPTIONS', headers: { Origin: 'https://aspiral.icu' } });
    const res = handleCorsPreFlight(req);
    expect(res?.status).toBe(204);
  });
  it('non-options returns null', () => {
    const req = new Request('https://x', { method: 'POST' });
    expect(handleCorsPreFlight(req)).toBeNull();
  });
});
