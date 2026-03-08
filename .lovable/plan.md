

# Plan: Breakthrough Quality V2 — Eliminate Generic/Fake Breakthroughs

## Summary

Harden the breakthrough pipeline so that cinematics, cards, and messages only appear when real, validated, complete breakthrough data exists. All changes are gated behind a `BREAKTHROUGH_QUALITY_V2` feature flag. Rollback = set flag to OFF.

## Feature Flag

**`src/lib/featureFlags.ts`** — Add `breakthroughQualityV2` flag reading `VITE_BREAKTHROUGH_QUALITY_V2` env var (default: `true`).

**`supabase/functions/spiral-ai/index.ts`** — Read `Deno.env.get("BREAKTHROUGH_QUALITY_V2")` (default: `"true"`).

---

## File 1: `src/hooks/useSpiralAI.ts`

### A. Add breakthrough validator helper (top of file)

```typescript
const GENERIC_PHRASES = [
  "trust the process", "move forward with clarity", "one small step",
  "take a deep breath", "the answer is within you",
  "path forward is becoming clear", "challenge you're working through",
  "let's cut to what matters",
];

function isValidBreakthroughData(data: BreakthroughData | null | undefined): data is BreakthroughData {
  if (!data) return false;
  const { friction, grease, insight } = data;
  if (!friction?.trim() || !grease?.trim() || !insight?.trim()) return false;
  const combined = `${friction} ${grease} ${insight}`.toLowerCase();
  return !GENERIC_PHRASES.some(phrase => combined.includes(phrase));
}
```

### B. Remove generic fallback strings (lines 647-654)

Delete the "Method 5: Fallback data" block that creates fake friction/grease/insight. Replace with: if no valid data, do NOT call `forceBreakthrough`. Instead call `sendEvent({ type: "RESPONSE_COMPLETE" })` and stay in recoverable state.

### C. Fix `forceBreakthrough()` (lines 169-199)

Gate with `isValidBreakthroughData(data)`:
- If flag ON and no valid data: do NOT trigger cinematic. Instead, initiate a synthesis request via `requestSynthesis()` (new helper).
- If flag OFF: preserve current behavior exactly.

### D. Add `requestSynthesis()` helper

New async function that:
1. Clears stale `breakthroughData` (set to `null`)
2. Calls `processTranscript` with `forceBreakthrough=true` and accumulated conversation context
3. If the response contains valid breakthrough data, then calls `forceBreakthrough(validData)`
4. If not, stays in current state — no fake breakthrough

### E. Fix `skipToBreakthrough()` (line 697-699)

Replace `forceBreakthrough()` with `requestSynthesis()`. Never directly triggers cinematic without data.

### F. Fix frustration/skip path in `processTranscript` (lines 272-275)

Replace the immediate `forceBreakthrough()` call with:
- Set `fastTrackRef.current.readyForBreakthrough = true`
- Continue processing the transcript normally (let the server handle `shouldBreakthrough=true`)
- Remove the early return

### G. Fix `handleCinematicComplete()` (lines 202-236)

Gate the `else` branch (line 228-233) that shows "Let's cut to what matters":
- If flag ON: do not show the card or message. Log warning. Call `dismissBreakthroughCard()`.
- If flag OFF: preserve current behavior.

### H. Fix partial data acceptance (lines 539-548)

In the "FAILSAFE" block where `readyForBreakthrough && data.question`: validate with `isValidBreakthroughData` before calling `forceBreakthrough`. If partial, treat as no breakthrough.

### I. Stale data prevention

In `forceBreakthrough()` and `requestSynthesis()`: always set `setBreakthroughData(null)` BEFORE any new attempt, so stale data cannot leak.

In `resetSession()`: already clears `breakthroughData` — confirmed OK.

---

## File 2: `supabase/functions/spiral-ai/index.ts`

### A. Anti-generic validator (new helper, same file)

```typescript
const BANNED_BREAKTHROUGH_PHRASES = [
  "trust the process", "move forward with clarity", "one small step",
  "take a deep breath", "the answer is within you",
  "path forward is becoming clear", "challenge you're working through",
  "let's cut to what matters",
];

function isGenericBreakthroughText(text: string): boolean {
  const lower = text.toLowerCase();
  return BANNED_BREAKTHROUGH_PHRASES.some(p => lower.includes(p));
}

function hasValidBreakthrough(data: SpiralAIResponse): boolean {
  return !!(
    data.friction?.trim() &&
    data.grease?.trim() &&
    data.insight?.trim() &&
    !isGenericBreakthroughText(data.friction) &&
    !isGenericBreakthroughText(data.grease) &&
    !isGenericBreakthroughText(data.insight)
  );
}
```

### B. Extend output validation (line 628-638)

Add `validateOutput` calls for `friction` and `grease`, same as existing `insight` validation.

### C. Retry on generic breakthrough content

Inside `callAIWithValidation`: after schema validation passes, if `shouldBreakthrough === true`, check `hasValidBreakthrough(data)`. If generic/empty, treat as validation failure and retry. If all retries exhausted, return fallback with NO friction/grease/insight populated (existing `createFallbackResponse` already does this).

### D. Feature flag gate

Read `BREAKTHROUGH_QUALITY_V2` env var. If `"false"`, skip the anti-generic checks entirely.

### E. No changes to MindCore path

`loadAspiralMindcore()` and `systemPrompt` assignment remain untouched.

---

## File 3: `supabase/functions/spiral-ai/ai-schema.ts`

No changes needed. The current schema already has `friction`, `grease`, `insight` as optional strings with max lengths. The validation tightening happens at the application layer, not schema layer.

---

## File 4: `src/lib/featureFlags.ts`

Add one new flag:

```typescript
const breakthroughQualityV2 = parseBooleanFlag(
  import.meta.env.VITE_BREAKTHROUGH_QUALITY_V2, true
);
```

Export in the frozen object.

---

## Tests to Add/Update

### Frontend (vitest)

New test file or additions to existing hook tests:

1. **Frustrated user path** — mock `isUserFrustrated` returning true, verify `forceBreakthrough()` is NOT called directly, verify `readyForBreakthrough` is set instead
2. **Skip path** — call `skipToBreakthrough()`, verify no cinematic triggered without data
3. **Stale data** — set `breakthroughData`, call `resetSession`, verify data is null, then trigger skip — verify stale data doesn't appear
4. **Partial payload rejected** — provide `{ friction: "x", grease: "", insight: "y" }`, verify `isValidBreakthroughData` returns false
5. **Valid complete breakthrough** — provide valid data, verify cinematic triggers

### Edge/Deno tests

Add to `validation.test.ts`:

1. **Generic breakthrough rejection** — `isGenericBreakthroughText("Trust the process and move forward")` returns `true`
2. **Valid breakthrough accepted** — non-generic text returns `false`
3. **`hasValidBreakthrough`** rejects partial data
4. **Friction/grease output filtering** — `validateOutput` applied to friction/grease fields

Add to `production-battery.test.ts`:

1. **Safe fallback after retry exhaustion** — verify `createFallbackResponse(true)` has no friction/grease/insight

---

## Rollback

Set `VITE_BREAKTHROUGH_QUALITY_V2=false` (client) and `BREAKTHROUGH_QUALITY_V2=false` (edge function secret). One step. No schema or migration changes needed.

---

## Risk

1. If MindCore prompt consistently produces generic breakthroughs, users may never see breakthroughs with flag ON. Mitigation: the banned phrase list is conservative and only catches the specific fallback strings. Real AI output will vary.
2. `requestSynthesis()` adds one extra round-trip when user skips/frustration triggers. Acceptable tradeoff for quality.

