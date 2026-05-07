# aSpiral Upgrade Implementation Details

## Phase B - Performance and Reliability
1. **Removed `setInterval` from `CinematicPlayer.tsx`**: Replaced the 16ms quality update loop with `requestAnimationFrame` for synchronized render-loop execution, avoiding independent timer overhead.
2. **Removed `setInterval` from `optimizer.ts`**: The AdaptiveQuality check loop was replaced with an rAF loop to stop competing with the main thread.
3. **Fixed `Set` allocation in `useEntities.ts`**: The staggered entity disclosure state updates were rewriting state via spread operator (`new Set([...prev, id])`). Changed to cloning the Set and adding directly to prevent array iteration overhead (`const next = new Set(prev); next.add(id);`).
4. **Removed console logging in hot paths**: Cleaned up debug log for `handleEntityClick` in `SpiralEntities.tsx`.
5. **General Render Hygiene**: Refactored `AudioManager.ts`, `director.ts`, `useAnalytics.ts`, `useSessionPersistence.ts`, `SpiralChat.tsx`, `LiveTranscript.tsx`, `QuestionBubble.tsx`, and `omnilink/adapter.ts` to use `requestAnimationFrame` and timestamp delta checks instead of `setInterval`.

## Phase D - Trust, Privacy, and Accessibility
1. **First-class Analytics Opt-Out**: Extended `settings.ts` schema with `analyticsEnabled` and integrated it into a new "Trust & Privacy" tab in `SettingsPanel.tsx`, wiring it up directly to `setAnalyticsEnabled` in `analytics.ts`.
2. **Safety Disclaimer**: Included the standard "Data Safety Commitment" note directly under the privacy toggles stating explicitly the app is not therapy/emergency care.

## Phase C - Voice Moat and Cost Reduction
1. **Bounded TTS Caching**: Built a lightweight `IndexedDB` wrapper (`getTTSDB`, `getCachedAudio`, `setCachedAudio`) directly in `audioSession.ts`. It stores the synthesized audio blobs keyed by a normalized string derived from the text, voice, and speed. It imposes a 50 item bounding limit to gracefully evict old blobs, preventing infinite growth, and completely bypassing network requests when a cache hit occurs.

## Phase E - Premium Product Layer
1. **One-Tap Quiet Mode**: Added `quietMode` boolean to `settings.ts`. Added a "Comfort & Experience" tab in `SettingsPanel.tsx` that exposes this toggle. Connected it to `prefersReducedMotion()` in `optimizer.ts` so that it acts as an override to throttle particles, cinematics, and post-processing globally across the application. 

## Testing Infrastructure
1. **Fallback Hooks for Headless Rendering Tests**: Modified `director.ts` to implement a graceful fallback from `requestAnimationFrame` to `setInterval` when running in headless `jsdom`/`happy-dom` test environments that do not stub `requestAnimationFrame` properly, ensuring our performance upgrades don't cause reference errors during test execution.
