

# Plan: Add JSON Output Format Instructions to System Prompt

## Problem

The `spiral-ai` edge function sends the MindCore system prompt to the AI with **no JSON output format instructions**. The MindCore prompt is purely a therapeutic companion guide — it never mentions entities, connections, JSON, or the expected response schema. The AI responds with natural conversational text, which fails JSON parsing on all 3 attempts, resulting in the "I hear you." fallback every time.

The `getPromptValidationRules()` and `getEntityExtractionRules()` functions exist in `ai-schema.ts` but are **never called** anywhere in `index.ts`.

## Root Cause

Line 675: `const systemPrompt = mindcore.systemPrompt;` — raw MindCore prompt with no format layer appended.

## Solution

Append a structured JSON output format block to the system prompt before passing it to `callAIWithValidation`. This block will use the existing `getPromptValidationRules()` and `getEntityExtractionRules()` functions from `ai-schema.ts`.

## Change: `supabase/functions/spiral-ai/index.ts`

**1. Add import** (line 9) — add `getPromptValidationRules, getEntityExtractionRules` to the existing `ai-schema.ts` import.

**2. Build augmented system prompt** (replace line 675) — append JSON output format instructions:

```typescript
const systemPrompt = `${mindcore.systemPrompt}

## OUTPUT FORMAT — MANDATORY

You MUST respond with a single valid JSON object. No markdown, no prose outside JSON.

${getEntityExtractionRules(userTier)}

${getPromptValidationRules(userTier)}

ENTITY TYPES: "problem" | "emotion" | "value" | "action" | "friction" | "grease"
ENTITY ROLES (optional): "external_irritant" | "internal_conflict" | "desire" | "fear" | "constraint" | "solution"
CONNECTION TYPES: "causes" | "blocks" | "enables" | "resolves" | "opposes"

REQUIRED JSON STRUCTURE:
{
  "entities": [{ "type": "...", "label": "...", "role": "...", "emotionalValence": 0.0, "importance": 0.0 }],
  "connections": [{ "from": 0, "to": 1, "type": "causes", "strength": 0.8 }],
  "question": "One compassionate open-ended question",
  "response": "Your warm, validating response to the person"${shouldBreakthrough ? `,
  "friction": "The specific tension or conflict the person is experiencing",
  "grease": "A concrete, personalized path forward based on what they shared",
  "insight": "A specific breakthrough insight connecting their friction to their values"` : ''}
}

"response" must be your warm, compassionate reply (as defined by MindCore).
"question" must be ONE open-ended question (per Iron Rule 4).
"entities" extract the key concepts from what the person shared.
${shouldBreakthrough ? '"friction", "grease", and "insight" must be SPECIFIC to this person\'s situation — never generic motivational filler.' : 'Do NOT include friction, grease, or insight fields unless breakthrough is requested.'}

Respond ONLY with the JSON object. No other text.`;
```

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/spiral-ai/index.ts` | Import format helpers from ai-schema.ts; append JSON output format block to system prompt |

No other files changed. After deploying, test the session flow to verify the AI returns structured JSON with entities.

