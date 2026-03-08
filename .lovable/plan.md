

# Plan: Server-Side Breakthrough Rejection Tracking + E2E Verification

## Summary

Add structured server-side tracking of breakthrough rejections in the `spiral-ai` edge function using the existing compliance logger (the only durable logging mechanism available in Deno edge functions). Then verify the full session flow end-to-end.

## 1. Server-Side Rejection Tracking (`supabase/functions/spiral-ai/index.ts`)

The `callAIWithValidation` function already detects generic/incomplete breakthroughs and retries, but only logs to `console.warn`. Since PostHog SDK is not available in Deno, use the existing `complianceLogger` to emit structured `BREAKTHROUGH_REJECTED` events.

**Problem**: `callAIWithValidation` doesn't have access to the `complianceLogger` instance (it's created in the main handler).

**Solution**: Pass `complianceLogger` into `callAIWithValidation` as an optional parameter, or — simpler — track rejections after `callAIWithValidation` returns, using the `retryCount` and result data.

**Chosen approach**: Add a post-call check in the main handler (lines ~677-682). After `callAIWithValidation` returns:

```typescript
// Track breakthrough rejection if expected but not delivered
if (BREAKTHROUGH_QUALITY_V2 && shouldBreakthrough && !hasValidBreakthrough(validatedResult)) {
  const reason = !validatedResult.friction?.trim() || !validatedResult.grease?.trim() || !validatedResult.insight?.trim()
    ? 'empty_or_partial' : 'generic_phrase';
  complianceLogger.log("BREAKTHROUGH_REJECTED", {
    reason,
    retryCount,
    hasFriction: !!validatedResult.friction?.trim(),
    hasGrease: !!validatedResult.grease?.trim(),
    hasInsight: !!validatedResult.insight?.trim(),
  });
}
```

Also add a `complianceLogger`-style log inside the retry loop itself (lines 220-226) to capture each individual rejection attempt. Refactor `callAIWithValidation` to accept an optional logging callback:

```typescript
async function callAIWithValidation(
  systemPrompt: string,
  userContent: string,
  shouldBreakthrough: boolean,
  userTier: string,
  onBreakthroughRejected?: (info: { attempt: number; reason: string }) => void
)
```

Call `onBreakthroughRejected` when V2 rejects a breakthrough attempt. The main handler passes a callback that calls `complianceLogger.log`.

## 2. Add Response Header for Rejection Visibility

Add `X-Breakthrough-Rejected: true` header when a breakthrough was expected but rejected after all retries, so client-side analytics can correlate.

## 3. Update Deno Tests

Add test in `breakthroughQualityV2.test.ts`:
- Verify `onBreakthroughRejected` callback is invoked when generic content is detected
- Verify the callback receives correct `reason` (`empty_or_partial` vs `generic_phrase`)

## 4. PostHog Dashboard

PostHog dashboards cannot be created programmatically from code. Provide the user with instructions on what to set up in their PostHog dashboard:
- Create an insight for `breakthrough_rejected` events grouped by `reason`
- Create an insight grouped by `source`
- Create an insight grouped by `matchedPhrase`
- Create a funnel: `session_started` → `breakthrough_achieved` vs `breakthrough_rejected`

## 5. E2E Verification

Use browser tools to:
1. Navigate to the app
2. Log in if needed
3. Start a session, type a thought
4. Verify the flow proceeds through questions
5. Confirm no generic breakthrough strings appear

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/spiral-ai/index.ts` | Add `onBreakthroughRejected` callback to `callAIWithValidation`, add `BREAKTHROUGH_REJECTED` compliance log in main handler, add `X-Breakthrough-Rejected` response header |
| `supabase/functions/spiral-ai/breakthroughQualityV2.test.ts` | Add tests for rejection callback |

No schema changes. No new files. Rollback unchanged.

