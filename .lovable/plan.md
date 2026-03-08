

# Plan: Extend Banned Breakthrough Phrases + Verify E2E

## Current State

Breakthrough Quality V2 is **fully implemented** — all hardening in `useSpiralAI.ts`, `spiral-ai/index.ts`, feature flag, retry logic, skip/frustration paths, and tests are already in place. The remaining work is extending the banned phrase list based on common AI coaching output patterns.

## 1. Extend Banned Phrase Lists

Add these additional generic motivational filler phrases that LLMs commonly produce in coaching contexts. Both lists (client + server) stay in sync.

**New phrases to add (both `GENERIC_BREAKTHROUGH_PHRASES` in useSpiralAI.ts and `BANNED_BREAKTHROUGH_PHRASES` in spiral-ai/index.ts):**

- `"you've got this"`
- `"believe in yourself"`
- `"embrace the uncertainty"`
- `"everything happens for a reason"`
- `"journey of self-discovery"`
- `"step outside your comfort zone"`
- `"it's okay to not be okay"`
- `"you are not alone"`
- `"the first step is always the hardest"`
- `"you deserve to be happy"`
- `"growth comes from discomfort"`
- `"let go of what no longer serves you"`

**Files:** `src/hooks/useSpiralAI.ts` (lines 59-68), `supabase/functions/spiral-ai/index.ts` (lines 43-52)

## 2. Add Tests for New Phrases

**Frontend (vitest):** Add test cases in `src/hooks/__tests__/breakthroughQualityV2.test.ts` for a representative sample of the new phrases (3-4 new `it()` blocks).

**Edge/Deno:** Add test cases in `supabase/functions/spiral-ai/breakthroughQualityV2.test.ts` for the same new phrases.

## 3. Deploy Updated Edge Function

Redeploy `spiral-ai` with the extended banned phrase list.

## 4. E2E Verification

Use browser tools to:
1. Confirm landing page loads
2. Navigate to `/app` and verify session starts
3. Confirm the preview renders without errors

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useSpiralAI.ts` | Extend `GENERIC_BREAKTHROUGH_PHRASES` array |
| `supabase/functions/spiral-ai/index.ts` | Extend `BANNED_BREAKTHROUGH_PHRASES` array |
| `src/hooks/__tests__/breakthroughQualityV2.test.ts` | Add tests for new phrases |
| `supabase/functions/spiral-ai/breakthroughQualityV2.test.ts` | Add tests for new phrases |

No schema changes. No new files. Rollback unchanged: set `BREAKTHROUGH_QUALITY_V2=false`.

