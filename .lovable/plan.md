

# Plan: Client-Side X-Breakthrough-Rejected Header Handler

## Summary

Read the `X-Breakthrough-Rejected` response header from the `spiral-ai` fetch call in `useSpiralAI.ts` and fire a `trackBreakthroughRejected` analytics event for client-server correlation.

## Change: `src/hooks/useSpiralAI.ts`

After the `response.ok` check (line 479), before the deliberating transition (line 482), add:

```typescript
// Track server-side breakthrough rejection for client-server correlation
const breakthroughRejected = response.headers.get("X-Breakthrough-Rejected");
if (breakthroughRejected === "true" && featureFlags.breakthroughQualityV2) {
  trackBreakthroughRejected({
    reason: 'force_blocked',
    source: 'parse',
    friction: undefined,
    grease: undefined,
    insight: undefined,
  });
  logger.warn("Server rejected breakthrough (X-Breakthrough-Rejected header)");
}
```

Ensure `trackBreakthroughRejected` is already imported (it is, from the previous implementation).

## Edge Function Log Check

Use the Supabase edge function logs tool to verify `BREAKTHROUGH_REJECTED` events are appearing.

## E2E

After implementing, navigate to the app and prompt the user to log in so I can test the full session flow.

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useSpiralAI.ts` | Read `X-Breakthrough-Rejected` header, fire PostHog event |

No other files changed.

