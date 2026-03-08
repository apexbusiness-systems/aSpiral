

# Plan: Increase Response Field Max Length in AI Schema

## Problem
The `response` field in `ai-schema.ts` is capped at 50 characters. The MindCore prompt generates compassionate, natural responses that exceed this limit, causing Zod validation to fail and the system to fall back to generic "I hear you." responses.

## Change

**`supabase/functions/spiral-ai/ai-schema.ts`** (line 79)
- Change `response` max from `50` to `500`
- Also increase `friction` and `grease` from `100` to `300`, and `insight` from `150` to `500` — these fields similarly benefit from longer, more personalized content

**`supabase/functions/spiral-ai/ai-schema.ts`** — update `getPromptValidationRules` to reflect new limits

## After deploying
Test the full session flow in the browser to verify the AI now returns personalized responses that pass validation.

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/spiral-ai/ai-schema.ts` | Increase `response` to 500, `friction`/`grease` to 300, `insight` to 500; update prompt rules |

