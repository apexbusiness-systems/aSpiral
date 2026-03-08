

# aSpiral Build Upgrade Plan: From MVP to Market Leader

## Current State Assessment

After deep analysis of the codebase, here is where aSpiral stands:

**What Works:**
- Solid voice-first UX concept (voice chaos -> 3D visualization -> breakthrough)
- Deterministic FSM-driven AI processing pipeline with frustration detection, anti-repetition, energy matching
- Enterprise-grade edge function with content moderation, rate limiting, prompt injection defense, PII redaction, compliance logging
- 3D entity visualization with Three.js/R3F, cinematic breakthrough sequences
- PostHog analytics, PWA with Capacitor native shell, i18n (5 languages)
- Session persistence to Supabase, keyboard shortcuts, settings panel

**Critical Gaps (Build Errors + Missing Infrastructure):**

1. **No database tables** -- The Supabase schema is nearly empty (only `api_keys`). No `profiles`, `sessions`, `breakthroughs`, `entities`, `compliance_request_runs`, or `compliance_audit_events` tables exist. Session persistence and compliance logging silently fail.
2. **30+ TypeScript build errors** across edge functions and frontend -- the app doesn't compile cleanly.
3. **`voice-stream` edge function references undefined `SYSTEM_PROMPT`** -- Twilio/OpenAI realtime integration is broken.
4. **`SpiralChat.tsx` references `loadStoredSettings` and `resolveVoiceProfile` without importing them** from `@/lib/settings` and `@/lib/voiceProfile`.
5. **`EntityShape.tsx` missing `insight` type** in color/size maps (type was added to `EntityType` but maps weren't updated).
6. **`SettingsPanel` exports `SettingsState` but it's declared in `settings.ts`** -- re-export mismatch.
7. **`compliance-store.ts` chains `.catch()` on `PromiseLike<void>`** -- Supabase SDK returns `PromiseLike`, not `Promise`.

## Competitive Context (Mental Health/Wellness Tech)

Key competitors: Wysa (CBT chatbot), Woebot (AI therapy), Calm/Headspace (meditation), Youper (emotional health AI), Replika (AI companion).

**aSpiral's differentiators** that must be preserved and amplified:
- Voice-first (competitors are text-first)
- 3D spatial visualization of mental state (unique in market)
- "Breakthrough" paradigm vs. ongoing therapy sessions
- 5-minute session promise (competitors require 15-30 min commitment)
- Built during a breakdown (authentic founder story)

---

## Phased Upgrade Plan

### Phase 1: Fix Build + Database Foundation (Immediate)

**Goal:** Make the app compile and function end-to-end.

1. **Create Supabase database schema** via migrations:
   - `profiles` table (id, display_name, avatar_url, tier, timestamps)
   - `sessions` table (id, user_id, status, metadata, timestamps)
   - `session_entities` table (id, session_id, type, label, metadata, timestamps)
   - `session_connections` table (id, session_id, from_entity_id, to_entity_id, type, strength)
   - `breakthroughs` table (id, session_id, friction, grease, insight, achieved_at)
   - `compliance_request_runs` + `compliance_audit_events` tables
   - RLS policies: users can only read/write their own data
   - Trigger: auto-create profile on auth.users insert

2. **Fix all 30+ TypeScript build errors:**
   - Add `insight` to EntityShape color/size maps
   - Add missing imports in SpiralChat (`loadStoredSettings`, `resolveVoiceProfile`)
   - Fix compliance-store `.catch()` by wrapping in `Promise.resolve()`
   - Fix `voice-stream` by defining `SYSTEM_PROMPT` constant
   - Fix `SettingsPanel` export, analytics FeatureType, test type mismatches
   - Fix `spiral-ai/index.ts` error map typing

3. **Wire session persistence to actual DB** -- currently the persistence hook writes to Supabase tables that don't exist.

### Phase 2: Core Experience Polish (High Impact)

**Goal:** Make the core loop (voice -> entities -> breakthrough) reliable and delightful.

4. **Streaming AI responses** -- Currently `spiral-ai` returns full JSON. Add SSE streaming for the `response` field so users see text appear in real-time (competitors all stream).

5. **Session history page** -- The `/sessions` route exists but sessions aren't persisted. After Phase 1 tables exist, build a session list with:
   - Session cards showing entity count, breakthrough status, date
   - Resume incomplete sessions
   - View past breakthroughs

6. **Breakthrough export** -- The `ExportFormat` type includes `action-plan` and `infographic`. Implement PDF export of breakthrough data (friction/grease/insight) using the existing `html2pdf.js` dependency. This is a key retention driver -- users share breakthroughs.

7. **Voice input reliability** -- The Web Speech API (`useVoiceInput`) has known cross-browser issues. Add:
   - Fallback to Whisper API via edge function for browsers without SpeechRecognition
   - Visual waveform during recording (currently just a pulsing mic button)
   - Better error handling for permission denials

### Phase 3: Growth & Retention Mechanics

**Goal:** Drive user acquisition and return visits.

8. **Onboarding flow** -- Currently landing page goes straight to `/app` which requires auth. Add:
   - Guest/anonymous sessions (first session free, no signup)
   - Post-breakthrough signup prompt ("Save your breakthrough -- create an account")
   - This alone could 3-5x conversion based on industry benchmarks

9. **Daily breakthrough streak** -- Mental health apps with streak mechanics (Headspace, Duolingo-wellness) see 2-3x DAU retention. Track consecutive days with breakthroughs in user profile.

10. **Share breakthrough** -- Generate a shareable card/image from breakthrough data (friction/grease/insight) with aSpiral branding. Viral loop.

### Phase 4: Technical Excellence

**Goal:** Production hardiness.

11. **Error monitoring** -- Connect Sentry or use PostHog error tracking. Currently errors are console.logged and lost.

12. **Performance optimization:**
    - The 3D scene loads Three.js (~500KB) on the main app page. Already lazy-loaded, but add a loading skeleton.
    - Entity limit enforcement is client-side only -- enforce in edge function too.
    - Add request deduplication in `useSpiralAI` (currently possible to fire duplicate API calls).

13. **Security hardening:**
    - Auth tokens aren't passed to `spiral-ai` edge function -- add JWT validation
    - Rate limiting is in-memory (resets on cold start) -- move to Supabase or Redis

---

## Technical Details

### Database Migration SQL (Phase 1)

```text
profiles ─── sessions ─── session_entities
                │              │
                │         session_connections
                │
            breakthroughs

compliance_request_runs ─── compliance_audit_events
```

All tables get RLS policies using `auth.uid()` matching. Compliance tables use service role only (edge function writes).

### Build Error Fix Summary

| File | Issue | Fix |
|------|-------|-----|
| `EntityShape.tsx` | Missing `insight` in Record maps | Add `insight: "#06b6d4"` and `insight: 0.45` |
| `SpiralChat.tsx:171-178` | Undefined `loadStoredSettings`, `resolveVoiceProfile` | Add imports from `@/lib/settings` and `@/lib/voiceProfile` |
| `compliance-store.ts:144,192,222` | `.catch()` on PromiseLike | Wrap chain in `Promise.resolve()` |
| `voice-stream/index.ts:124` | Undefined `SYSTEM_PROMPT` | Define constant with aSpiral voice system prompt |
| `spiral-ai/index.ts:233` | Type mismatch on error map | Cast `errors` properly |
| `menu/index.ts:5` | Re-exports `SettingsState` not exported from SettingsPanel | Export from settings.ts instead |
| `usePwaInstall.ts:15,21` | Invalid FeatureType values | Add to FeatureType union |
| Test files | vitest Mock type mismatches | Cast with `as unknown as` |

### Priority Order

Phase 1 is blocking -- nothing works without it. Phase 2 items 4-5 are highest-impact for user experience. Phase 3 item 8 (guest sessions) is the single highest-impact growth lever.

Estimated implementation: Phase 1 (1 session), Phase 2 (2-3 sessions), Phase 3-4 (2-3 sessions).

