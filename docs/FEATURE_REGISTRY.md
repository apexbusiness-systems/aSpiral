# aSpiral Feature Registry

**Version:** 1.0.0
**Last Updated:** February 6, 2026
**Status:** Production

---

## Feature Index

| # | Feature | Status | Category | Entry Point |
|---|---------|--------|----------|-------------|
| 1 | Voice Input (STT) | LIVE | Core | `src/hooks/useVoiceInput.ts` |
| 2 | Text-to-Speech (TTS) | LIVE | Core | `src/hooks/useTextToSpeech.ts` |
| 3 | Spiral AI Processing | LIVE | Core | `src/hooks/useSpiralAI.ts` |
| 4 | Chat Interface | LIVE | Core | `src/hooks/useChat.ts` |
| 5 | 3D Entity Visualization | LIVE | Visualization | `src/components/3d/SpiralEntities.tsx` |
| 6 | Breakthrough Cinematics | LIVE | Visualization | `src/components/cinematics/CinematicPlayer.tsx` |
| 7 | Physics-Based Layout | LIVE | Visualization | `src/hooks/usePhysicsWorker.ts` |
| 8 | Session Management | LIVE | Data | `src/stores/sessionStore.ts` |
| 9 | Session Persistence | LIVE | Data | `src/hooks/useSessionPersistence.ts` |
| 10 | Authentication (Email + Google) | LIVE | Auth | `src/contexts/AuthContext.tsx` |
| 11 | API Key Management | LIVE | Auth | `src/pages/ApiKeys.tsx` |
| 12 | Internationalization (5 langs) | LIVE | UX | `src/lib/i18n/config.ts` |
| 13 | PWA Support | LIVE | Platform | `vite.config.ts` (VitePWA) |
| 14 | Mobile (iOS/Android) | LIVE | Platform | `capacitor.config.ts` |
| 15 | Export (PDF/Link) | LIVE | Data | `supabase/functions/api-export/` |
| 16 | Admin Dashboard | LIVE | Admin | `src/pages/AdminDashboard.tsx` |
| 17 | Workspaces | LIVE | Collaboration | `src/pages/Workspaces.tsx` |
| 18 | Push Notifications | LIVE | Platform | `src/hooks/usePushNotifications.ts` |
| 19 | Analytics (PostHog) | LIVE | Observability | `src/lib/analytics.ts` |
| 20 | Voice Journey Steps | LIVE | UX | `src/pages/steps/` |
| 21 | OmniLink Integration | LIVE | Integration | `src/integrations/omnilink/` |
| 22 | Security Guardrails | LIVE | Security | `supabase/functions/spiral-ai/` |

---

## 1. Voice Input (Speech-to-Text)

**Status:** LIVE
**Files:** `src/hooks/useVoiceInput.ts`
**Dependencies:** Web Speech API (browser-native)

**Capabilities:**
- Real-time speech recognition via browser Web Speech API
- Interim/partial transcript display
- Auto-stop on silence detection
- Language-aware recognition (maps to i18n locale)
- Error recovery and microphone permission handling
- Cross-platform support (Chrome, Safari, Edge)

**Integration:** Feeds transcripts into `useSpiralAI` for entity extraction.

---

## 2. Text-to-Speech (TTS)

**Status:** LIVE
**Files:** `src/hooks/useTextToSpeech.ts`
**Dependencies:** OpenAI TTS API (via edge function), Web Speech API (fallback)

**Capabilities:**
- Primary: OpenAI TTS via `supabase/functions/text-to-speech/`
- Fallback: Browser Web Speech API synthesis
- Configurable voice, speed, and volume
- Audio context management for mobile compatibility
- Debug event stream (dev mode)
- Speaking state management via Zustand store

---

## 3. Spiral AI Processing

**Status:** LIVE
**Files:** `src/hooks/useSpiralAI.ts` (26KB), `src/lib/spiralMachine.ts`
**Dependencies:** Supabase Edge Function `spiral-ai`

**Capabilities:**
- Deterministic Finite State Machine (FSM) for conversation flow
- Entity extraction (problem, emotion, value, action, friction, grease, insight)
- Connection mapping (causes, blocks, enables, resolves, opposes)
- Fast-track breakthrough detection (3-question max)
- Frustration detection and skip-to-breakthrough
- Anti-repetition for questions
- Energy matching (mirrors user's emotional tone)
- Coherence validation and entity deduplication
- Tiered entity limits based on user plan

**State Machine States:** `idle` -> `recording` -> `processing` -> `questioning` -> `breakthrough` -> `complete`

---

## 4. Chat Interface

**Status:** LIVE
**Files:** `src/hooks/useChat.ts`, `src/components/SpiralChat.tsx`
**Dependencies:** Supabase Edge Function `chat`

**Capabilities:**
- Streaming text responses
- Message history management
- Abort/cancel support
- Retry with exponential backoff
- Error state handling

---

## 5. 3D Entity Visualization

**Status:** LIVE
**Files:** `src/components/3d/SpiralEntities.tsx`, `src/components/3d/EnhancedSpiralScene.tsx`, `src/components/3d/EntityMesh.tsx`, `src/components/3d/AdaptiveEntity.tsx`
**Dependencies:** Three.js, React Three Fiber, React Three Drei

**Capabilities:**
- Real-time 3D rendering of extracted entities
- Semantic entity shapes (different geometry per type)
- Connection lines between related entities
- Staggered entity appearance animation
- Adaptive quality based on device capability
- WebGL context loss recovery
- CSS/SVG fallback when WebGL unavailable

---

## 6. Breakthrough Cinematics

**Status:** LIVE
**Files:** `src/components/cinematics/CinematicPlayer.tsx`, `src/lib/breakthrough/director.ts`, `src/lib/breakthrough/selector.ts`, `src/lib/breakthrough/catalog.ts`
**Dependencies:** Three.js, Framer Motion

**Capabilities:**
- 25+ procedural cinematic scenes (SpiralAscend, SpaceWarp, PortalReveal, MatrixDecode, ParticleExplosion, etc.)
- Deterministic seeded selection algorithm
- Quality tier adaptation (low/mid/high)
- Intensity band configuration
- Skip/escape support
- History tracking (no repeat scenes)
- Prewarm optimization
- Fallback rendering for low-end devices
- Analytics event tracking (start, complete, error, skip)

---

## 7. Physics-Based Layout

**Status:** LIVE
**Files:** `src/hooks/usePhysicsWorker.ts`, `src/workers/physics.worker.ts`
**Dependencies:** Web Workers

**Capabilities:**
- Off-main-thread physics simulation via Web Worker
- Force-directed graph layout
- Entity position updates at 60FPS
- Fallback layout for browsers without Worker support
- Spatial layout algorithms (`src/lib/spatialLayout.ts`)

---

## 8. Session Management

**Status:** LIVE
**Files:** `src/stores/sessionStore.ts` (341 lines)
**Dependencies:** Zustand with persist middleware

**Capabilities:**
- Session CRUD (create, read, update)
- Entity and connection management
- Message history tracking
- Breakthrough data storage
- Friction point tracking
- Local persistence via localStorage
- Session state (idle, active, paused, breakthrough, complete)

---

## 9. Session Persistence (Cloud Sync)

**Status:** LIVE
**Files:** `src/hooks/useSessionPersistence.ts`
**Dependencies:** Supabase

**Capabilities:**
- Auto-save on entity/connection changes (debounced)
- Save on page unload via `navigator.sendBeacon`
- Load user sessions from Supabase
- Session history listing
- Conflict resolution (server wins)

---

## 10. Authentication

**Status:** LIVE
**Files:** `src/contexts/AuthContext.tsx`, `src/components/ProtectedRoute.tsx`
**Dependencies:** Supabase Auth

**Capabilities:**
- Email/password signup with display name
- Email/password sign-in
- Google OAuth sign-in
- Session persistence across page reloads
- Auto-refresh token
- Profile management (display name updates)
- Protected route wrapper component
- Email verification redirect

---

## 11. API Key Management

**Status:** LIVE
**Files:** `src/pages/ApiKeys.tsx`, `supabase/functions/_shared/auth.ts`
**Dependencies:** Supabase, crypto.getRandomValues

**Capabilities:**
- Generate API keys with `sp_` prefix
- Secure key hashing (SHA-256)
- Copy-to-clipboard
- Expiry configuration (never, 30d, 90d, 365d)
- Key deletion with confirmation
- Last-used tracking
- x-api-key header authentication in edge functions

---

## 12. Internationalization

**Status:** LIVE
**Files:** `src/lib/i18n/config.ts`, `src/lib/i18n/locales/`
**Dependencies:** i18next, react-i18next, i18next-browser-languagedetector

**Supported Languages:**
| Code | Language | File |
|------|----------|------|
| en | English | `locales/en.json` |
| es | Spanish | `locales/es.json` |
| fr | French | `locales/fr.json` |
| de | German | `locales/de.json` |
| ja | Japanese | `locales/ja.json` |

**Capabilities:**
- Browser language auto-detection
- Language selector UI component
- Speech locale mapping for STT/TTS
- All UI strings externalized

---

## 13. Progressive Web App (PWA)

**Status:** LIVE
**Files:** `vite.config.ts` (VitePWA plugin), `public/offline.html`
**Dependencies:** vite-plugin-pwa, Workbox

**Capabilities:**
- Auto-update service worker
- Offline support with fallback page
- Install prompt (Android Chrome, desktop)
- iOS install instructions
- Precaching of static assets
- Runtime caching for Google Fonts
- App manifest with icons (192x192, 512x512, maskable)

---

## 14. Mobile Platform (Capacitor)

**Status:** LIVE
**Files:** `capacitor.config.ts`, `android/`, `ios/`
**Dependencies:** Capacitor 8.0.0

**Capabilities:**
- Native iOS build
- Native Android build
- Splash screen management
- Status bar configuration
- Keyboard handling
- Push notification registration
- Native audio session management

---

## 15. Export

**Status:** LIVE
**Files:** `supabase/functions/api-export/index.ts`
**Dependencies:** Supabase Edge Functions

**Capabilities:**
- Export session data
- Shareable link generation
- Authenticated access only

---

## 16. Admin Dashboard

**Status:** LIVE
**Files:** `src/pages/AdminDashboard.tsx`
**Dependencies:** Recharts

**Capabilities:**
- User activity overview
- Session statistics
- System health metrics
- Protected behind authentication

---

## 17. Workspaces

**Status:** LIVE
**Files:** `src/pages/Workspaces.tsx`
**Dependencies:** Supabase

**Capabilities:**
- Workspace creation and management
- Workspace listing
- Protected behind authentication

---

## 18. Push Notifications

**Status:** LIVE
**Files:** `src/hooks/usePushNotifications.ts`
**Dependencies:** Capacitor Push Notifications plugin

**Capabilities:**
- Permission request handling
- Token registration
- Notification scheduling
- Platform-aware (native vs web)

---

## 19. Analytics

**Status:** LIVE
**Files:** `src/lib/analytics.ts`
**Dependencies:** PostHog, Vercel Analytics

**Capabilities:**
- Page view tracking
- Custom event tracking (breakthroughs, sessions, voice usage)
- User identification
- Feature flag support (PostHog)
- Opt-in/opt-out controls
- Cinematic performance tracking

---

## 20. Voice Journey Steps

**Status:** LIVE
**Files:** `src/pages/steps/VoiceYourChaos.tsx`, `WatchItVisualize.tsx`, `AnswerQuestions.tsx`, `GetBreakthrough.tsx`

**Flow:**
1. **Voice Your Chaos** (`/steps/voice`) - Record your problem via voice
2. **Watch It Visualize** (`/steps/visualize`) - See entities appear in 3D
3. **Answer Questions** (`/steps/questions`) - AI asks clarifying questions
4. **Get Breakthrough** (`/steps/breakthrough`) - Cinematic breakthrough experience

---

## 21. OmniLink Integration

**Status:** LIVE
**Files:** `src/integrations/omnilink/adapter.ts`, `circuitBreaker.ts`, `eventQueue.ts`
**Dependencies:** Custom integration layer

**Capabilities:**
- Third-party API adapter pattern
- Circuit breaker for resilience
- Event queue for async operations
- Health check endpoint (`supabase/functions/omnilink-health/`)

---

## 22. Security Guardrails

**Status:** LIVE
**Files:** `supabase/functions/spiral-ai/` (content-guard.ts, rate-limiter.ts, prompt-shield.ts, input-validator.ts)
**Dependencies:** Supabase Edge Functions

**Capabilities:**
- PII redaction (emails, phone numbers, SSN, credit cards, IPs)
- Content moderation (blocked patterns)
- Per-user rate limiting
- Session limits
- Prompt injection detection
- Jailbreak prevention
- Output validation (Zod schemas)
- Compliance logging
- Jurisdiction detection

---

## Edge Function Registry

| Function | Auth | Methods | Purpose |
|----------|------|---------|---------|
| `spiral-ai` | JWT | POST | Main AI processing with full guardrails |
| `chat` | JWT | POST | Chat conversation management |
| `process-transcript` | JWT | POST | Voice transcript processing |
| `voice-stream` | JWT | POST | Real-time voice streaming |
| `voice-answer` | JWT | POST | Voice question answering |
| `text-to-speech` | JWT | POST | Text-to-speech synthesis |
| `api-sessions` | JWT/API Key | GET/POST/PUT/DELETE | Session CRUD |
| `api-entities` | JWT/API Key | GET/POST | Entity management |
| `api-export` | JWT | POST | Export sessions |
| `api-insights` | JWT | POST | Generate session insights |
| `generate-breakthrough` | JWT | POST | Generate breakthrough content |
| `health` | None | GET | System health check |
| `omnilink-health` | None | GET | OmniLink integration health |

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | React | 18.3.1 |
| Language | TypeScript | 5.8.3 |
| Build | Vite | 7.3.1 |
| 3D Engine | Three.js | 0.168.0 |
| 3D React | React Three Fiber | 8.18.0 |
| State | Zustand | 5.0.9 |
| Server State | TanStack React Query | 5.83.0 |
| Routing | React Router DOM | 6.30.1 |
| Styling | Tailwind CSS | 3.4.17 |
| UI Components | shadcn/ui (Radix) | 40+ components |
| Animation | Framer Motion | 12.23.26 |
| Forms | React Hook Form + Zod | 7.61.1 / 3.25.76 |
| Backend | Supabase | 2.89.0 |
| i18n | i18next | 25.7.3 |
| Charts | Recharts | 2.15.4 |
| Analytics | PostHog | 1.310.1 |
| Mobile | Capacitor | 8.0.0 |
| PWA | vite-plugin-pwa | 1.2.0 |
| Testing | Vitest | 4.0.16 |

---

## Test Coverage Summary

| Test Suite | Tests | Status |
|-----------|-------|--------|
| Voice hooks sanity | 8 | PASS |
| Breakthrough lifecycle | 26 | PASS |
| Breakthrough selector | 12 | PASS |
| Breakthrough director | 10 | PASS |
| Cross-platform voice | 15 | PASS |
| Voice pipeline integration | 18 | PASS |
| FSM transitions | 20 | PASS |
| WebGL context recovery | 8 | PASS |
| Analytics persistence | 6 | PASS |
| Speech locale mapping | 12 | PASS |
| Translation keys | 25 | PASS |
| i18n extended | 12 | PASS |
| **Total** | **172** | **ALL PASS** |

---

*This registry is the single source of truth for all features in the aSpiral platform.*
