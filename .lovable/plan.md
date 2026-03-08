

# Implementation Plan: E2E Testing, Breakthrough Export, Streak Tracking

## 1. Fix Build Error (Immediate)

Add the missing `build:dev` script to `package.json`. This was added previously but got lost.

**File:** `package.json` line ~15 — add `"build:dev": "vite build --mode development"` to scripts.

## 2. Database Migration: Enable Session/Breakthrough Deletion + Streak Updates

The current RLS policies **block DELETE** on `sessions` and `breakthroughs` tables. The `deleteSession` function in `useSessionPersistence.ts` will silently fail. We need:

- Add DELETE policy on `sessions` for own sessions
- Add DELETE policy on `breakthroughs` for own breakthroughs  
- Add UPDATE policy on `breakthroughs` (for future use)

No new tables needed — `profiles` already has `streak_days` and `last_session_at` columns.

## 3. Breakthrough Shareable Card Export (PDF/Image)

Add a `exportBreakthroughCard` function to `src/lib/pdfExport.ts` that generates a branded, social-media-sized card using `html2pdf.js`. The card will feature:

- aSpiral gradient branding (matches existing dark theme)
- Friction / Grease / Insight layout
- Date stamp and "aspiral.ai" watermark
- Outputs as downloadable image (JPEG via html2canvas) or PDF

**Integration points:**
- Add "Share as Image" button to `BreakthroughCard.tsx` alongside existing Copy/Download buttons
- Wire the new export function to generate a shareable card

## 4. Daily Breakthrough Streak Tracking

Implement streak logic that updates `profiles.streak_days` and `profiles.last_session_at` when a breakthrough is saved.

**Logic:**
- When `saveBreakthrough` is called in `useSessionPersistence.ts`, also update the profile:
  - If `last_session_at` is today: no change
  - If `last_session_at` is yesterday: increment `streak_days`
  - If `last_session_at` is older: reset `streak_days` to 1
  - Set `last_session_at` to now

**UI:** Add a streak badge to the Sessions page header showing current streak (flame icon + day count).

## 5. End-to-End Verification

After implementation, use browser tools to:
1. Navigate to landing page, verify clean load
2. Navigate to `/app`, verify session initializes
3. Type a thought, verify streaming response appears progressively
4. Check `/sessions` page shows saved session with entity count
5. Verify streak counter appears

## Files to Create/Modify

| File | Action |
|------|--------|
| `package.json` | Add `build:dev` script |
| Migration SQL | Add DELETE policies for sessions + breakthroughs |
| `src/lib/pdfExport.ts` | Add `exportBreakthroughCard()` function |
| `src/components/BreakthroughCard.tsx` | Add "Share as Image" button |
| `src/hooks/useSessionPersistence.ts` | Add streak update logic in `saveBreakthrough` |
| `src/pages/Sessions.tsx` | Add streak display in header |

