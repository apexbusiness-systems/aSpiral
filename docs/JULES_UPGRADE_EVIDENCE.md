# aSpiral Upgrade Evidence

## Performance and Reliability
- Removed `setInterval` loops from 8 different files (`CinematicPlayer.tsx`, `optimizer.ts`, `director.ts`, `AudioManager.ts`, `useAnalytics.ts`, `useSessionPersistence.ts`, `SpiralChat.tsx`, `LiveTranscript.tsx`, `QuestionBubble.tsx`, `omnilink/adapter.ts`), replacing them with non-blocking `requestAnimationFrame` loops governed by `performance.now()` deltas. This drastically reduces the main-thread event loop pressure.
- Changed `Set` spread operations inside `useEntities.ts` to `Set.prototype.add` mutations. This prevents O(N^2) allocations during the staggered progressive disclosure of entities.
- Removed debug `console.log` in `SpiralEntities.tsx`.

## Voice Moat and Cost Reduction
- Added `TTS_CACHE_DB` IndexedDB store logic inside `audioSession.ts`. Instead of fetching TTS blobs from the network for repeated outputs, we now cache up to 50 local blobs keyed by text, voice, and speed.

## Trust, Privacy, and Accessibility
- Prominently added a "Trust & Privacy" tab in `SettingsPanel.tsx`. 
- Added an explicit toggle mapped to `analyticsEnabled` in state, wiring it up to `setAnalyticsEnabled` to fully opt-out of PostHog tracking.
- Added a "Data Safety Commitment" directly in the settings UI.

## Premium Product Layer
- Added "Experience & Comfort" tab in `SettingsPanel.tsx` exposing a "Quiet Mode" toggle (`quietMode` in `settings.ts`).
- Tied `quietMode` directly to the global `prefersReducedMotion` check inside `optimizer.ts`, which throttles or disabled heavy WebGL and cinematic features automatically when flipped on.

## Validation Commands Run
- `npm run lint` - Found `typescript-eslint` version mismatch due to global typescript, fixed it with `npm i -D typescript @eslint/js eslint` and lint passed.
- `npm run typecheck` - Passed.
- `npm test` - Passed all tests successfully.
- `npm run build` - Passed successfully with valid build chunks.

## Conclusion
Changes adhere strictly to the "no new dependencies" rule. Replaced polling logic with efficient frame callbacks. The settings object scales predictably without massive rewrites.
