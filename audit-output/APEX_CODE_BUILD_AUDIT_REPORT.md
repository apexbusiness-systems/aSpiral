# APEX CODE & BUILD AUDIT REPORT — aSpiral
**Classification:** CONFIDENTIAL — APEX Business Systems LTD  
**Audit Agent:** APEX-AUDITOR-PRIME v2.0 (Deep Exhaustive Pass)  
**Repository:** apexbusiness-systems/aSpiral  
**Branch Audited:** main  
**Audit Date:** 2026-06-17  
**Files Read:** 90+ source files | 425 source-typed files enumerated | 528 total repo files  
**Evidence Standard:** Every claim cites [FILE:PATH:LINE] or INACCESSIBLE/CI_DATA_MISSING

---

## Executive Summary

aSpiral is a Capacitor 8 hybrid app (React 18.3 + Vite 7 + TypeScript 5.8) wrapping a Supabase backend with 14 deployed edge functions. The codebase demonstrates sophisticated engineering: deterministic FSM state management, compliance logging, multi-layer prompt injection defense, PII redaction, content moderation, and PostgreSQL-backed rate limiting.

The audit uncovered **7 CRITICAL, 9 HIGH, 7 MEDIUM, 4 LOW findings**. The most urgent: (1) real Supabase credentials committed to the public repository in `.env.production`; (2) three AI endpoints (`process-transcript`, `generate-breakthrough`, `chat`) are completely unauthenticated — any actor can invoke them consuming the project's GROQ API quota; (3) `PrivacyInfo.xcprivacy` is absent, guaranteeing App Store rejection; (4) `aps-environment = development` in production entitlements silently breaks push notifications for all production users.

---

## Per-Agent Findings

### AGENT-1 · Repository Manifest & File Tree
- 528 total files; 425 source-typed files (TS/TSX/SQL/YAML/TOML/JSON)
- 14 Supabase edge functions deployed; 2 additional (voice-answer, voice-stream — disabled 410)
- CI_DATA_MISSING: Cannot verify last CI run result via API
- Committed `.orig` backup files: `src/pages/Breakthroughs.tsx.orig`, `src/pages/Sessions.tsx.orig`, `supabase/functions/spiral-ai/aspiralMindcoreLoader.test.ts.orig`

### AGENT-2 · Secret Scanning & Credential Audit

**CRITICAL** — Supabase ANON JWT committed [FILE:.env.production:25]:
```
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxdHdhdHlvZHVqeG9mcmR6bmVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MjU4NjMsImV4cCI6MjA4MjQwMTg2M30.-jlpLiSG-itgB9_Tf8K1enY4aWwrriNNmNNeZcm5eQk
```

**CRITICAL** — Supabase publishable key committed [FILE:.env.production:24]:
```
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_EsqGDnlMrlTWvOgLNkYmAA_FQd10-SW
```

`.env.production` NOT in `.gitignore` [FILE:.gitignore] — gitignore excludes `.env.production.local` and `.env*.local` but NOT `.env.production` bare.

**MEDIUM** — Static APP_SALT [FILE:src/lib/secureStorage.ts:4]:
```typescript
const APP_SALT = 'aspiral-v1-secure-storage-salt-2024';
```
Hardcoded salt reduces entropy. userId+deviceFingerprint still provide per-user uniqueness. Accepted risk with note.

**MEDIUM** — Push token logged to console [FILE:src/lib/pushNotifications.ts:201]:
```typescript
console.log('Push registration success, token:', token.value);
```
PII exposure in debug builds. Removed in production by esbuild `pure` config [FILE:vite.config.ts:14].

### AGENT-3 · Authentication & Authorization Audit

**CRITICAL** — process-transcript: no authentication [FILE:supabase/functions/process-transcript/index.ts] + [FILE:supabase/config.toml:17] (`verify_jwt = false`). No requireUser() call. Any unauthenticated HTTP request reaches GROQ API, consuming project API credits with zero cost to attacker.

**CRITICAL** — generate-breakthrough: no authentication [FILE:supabase/functions/generate-breakthrough/index.ts] + [FILE:supabase/config.toml:15]. Same pattern — GROQ API called with project key, zero auth guard.

**CRITICAL** — chat: no authentication [FILE:supabase/functions/chat/index.ts] + [FILE:supabase/config.toml:9]. In-memory IP rate limit of 30 req/min [FILE:supabase/functions/chat/index.ts:~80] trivially bypassed via IP rotation. Solid injection defense present but does not substitute for JWT.

**CRITICAL** — spiral-ai accepts client-supplied userId [FILE:supabase/functions/spiral-ai/input-validator.ts:18-23]:
```typescript
userId: z.string()
  .max(128, "User ID too long")
  .regex(/^[a-zA-Z0-9_-]+$/, "Invalid user ID format")
  .optional()
  .default("anonymous"),
```
Used for rate-limit tracking and compliance logging [FILE:supabase/functions/spiral-ai/index.ts:471,481,541]. Attacker can supply a victim's userId to exhaust their rate limit (DoS) or pollute their compliance audit log.

**HIGH** — AdminDashboard no role guard [FILE:src/App.tsx:215] + [FILE:src/components/ProtectedRoute.tsx]. `ProtectedRoute` only checks `user !== null`. **Mitigating factor**: queries filter by `user.id` [FILE:src/pages/AdminDashboard.tsx:138] — shows only current user's data. Not a privilege escalation to all users' data, but misleading naming and future-code risk.

**VERIFIED PROTECTED:**
- speech-to-text ✅ [FILE:supabase/functions/speech-to-text/index.ts:28] — calls `requireUser()`
- text-to-speech ✅ [FILE:supabase/functions/text-to-speech/index.ts:~65] — calls `requireUser()`
- api-sessions, api-entities, api-insights, api-export ✅ — `verify_jwt = true` [FILE:supabase/config.toml:29-37] + 401 on null

### AGENT-4 · iOS Build & App Store Readiness

**CRITICAL** — PrivacyInfo.xcprivacy MISSING [ASSET_MISSING:ios/App/App/PrivacyInfo.xcprivacy]
Apple mandatory since Spring 2024. App uses microphone [FILE:ios/App/App/Info.plist:52] and speech recognition [FILE:ios/App/App/Info.plist:54]. App Store submission WILL be rejected.

**HIGH** — aps-environment = development [FILE:ios/App/App/App.entitlements:5]:
```xml
<key>aps-environment</key>
<string>development</string>  <!-- MUST BE: production -->
```

**HIGH** — UIRequiredDeviceCapabilities = armv7 [FILE:ios/App/App/Info.plist:33]:
```xml
<string>armv7</string>  <!-- MUST BE: arm64 -->
```
32-bit architecture, deprecated by Apple.

**HIGH** — CODE_SIGN_IDENTITY = "iPhone Developer" [FILE:ios/App/App.xcodeproj/project.pbxproj:214,271]. Both Debug and Release use developer identity. Release requires "Apple Distribution".

CI_DATA_MISSING — Cannot verify last successful TestFlight upload.

### AGENT-5 · Android Build & Play Store Readiness

**HIGH** — No Android Codemagic workflow [FILE:codemagic.yaml]. Only `aspiral_ios_testflight` and `aspiral_ios_simulator` exist. Zero Android CI/CD.

**HIGH** — No release signingConfig [FILE:android/app/build.gradle:18-21]:
```gradle
buildTypes {
    release {
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        // signingConfig MISSING
    }
}
```
Unsigned release builds cannot be uploaded to Google Play.

**HIGH** — Hardcoded versionCode 10000 [FILE:android/app/build.gradle:7]. Google Play requires strictly incrementing versionCode.

**MEDIUM** — proguard-rules.pro keepattributes commented out [FILE:android/app/proguard-rules.pro:15-17]:
```
#-keepattributes SourceFile,LineNumberTable
```
Crash stack traces in production show no file names or line numbers.

### AGENT-6 · Frontend Security & TypeScript Audit

**HIGH** — CSP unsafe-inline in script-src [FILE:public/_headers:7]:
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
```
Completely defeats XSS protection. Any injected inline script executes.

**HIGH** — TypeScript weak compiler [FILE:tsconfig.app.json]:
```json
"strict": false, "noImplicitAny": false
```

**MEDIUM** — Multiple `as any` TypeScript casts:
- [FILE:src/pages/Sessions.tsx:76,109] — `const db = supabase as any`
- [FILE:src/pages/Breakthroughs.tsx:83,108] — `const db = supabase as any`
- [FILE:src/lib/sessionPersistence.ts:11] — `db: any` parameter
- [FILE:src/pages/ApiKeys.tsx:85] — `(supabase as any).from('api_keys')`

**VERIFIED GOOD:**
- sessionStore.ts uses `sessionStorage` (not localStorage) — cleared on tab close [FILE:src/stores/sessionStore.ts:340] ✅
- crypto.ts: AES-GCM correct, random salt+IV per encrypt, 100k PBKDF2 [FILE:src/lib/crypto.ts:48,49,29] ✅
- Analytics consent: PostHog `opt_out_capturing_by_default: userOptedOut` [FILE:src/lib/analytics.ts] ✅
- Prompt injection defense: multi-layer [FILE:src/security/promptDefense.ts] [FILE:supabase/functions/chat/index.ts:17-53] ✅
- PII redactor: comprehensive [FILE:supabase/functions/spiral-ai/pii-redactor.ts] ✅
- Content moderation: multi-jurisdiction, CSAM zero-tolerance [FILE:supabase/functions/spiral-ai/content-guard.ts] ✅

### AGENT-7 · Infrastructure & Dependency Audit

**MEDIUM** — Deno std@0.168.0 across all edge functions [FILE:supabase/functions/process-transcript/index.ts:2]. Current stable: 0.224.0+. Potential unpatched CVEs.

**MEDIUM** — health endpoint publicly accessible, exposes security pipeline benchmarks [FILE:supabase/functions/health/index.ts]. Information disclosure.

**MEDIUM** — voice-answer: no Twilio signature validation [FILE:supabase/functions/voice-answer/index.ts]. voice-stream disabled (410) limits practical attack surface.

**VERIFIED GOOD:**
- CORS allowlist with Vary header [FILE:supabase/functions/_shared/cors.ts] ✅
- PostgreSQL-backed rate limiting [FILE:supabase/functions/spiral-ai/rate-limiter.ts] ✅
- Compliance logging with hashed identifiers [FILE:supabase/migrations/20260206000000_compliance_audit_logs.sql] ✅
- RLS on api_keys table [FILE:supabase/migrations/20260127000000_secure_api_keys.sql:13] ✅

---

## Risk Register

| ID | Severity | Finding | Evidence | Fix Branch |
|----|----------|---------|----------|------------|
| R-01 | CRITICAL | PrivacyInfo.xcprivacy missing | ASSET_MISSING:ios/App/App/PrivacyInfo.xcprivacy | ✅ Fixed |
| R-02 | CRITICAL | Supabase keys in public repo | .env.production:24-25 | ✅ Fixed |
| R-03 | CRITICAL | process-transcript unauthenticated | process-transcript/index.ts + config.toml:17 | ✅ Fixed |
| R-04 | CRITICAL | generate-breakthrough unauthenticated | generate-breakthrough/index.ts + config.toml:15 | ✅ Fixed |
| R-05 | CRITICAL | chat unauthenticated | chat/index.ts + config.toml:9 | ✅ Fixed |
| R-06 | CRITICAL | AdminDashboard no role guard | src/App.tsx:215 | ⚠️ Noted (data-scoped, low actual risk) |
| R-07 | CRITICAL | spiral-ai client-supplied userId | spiral-ai/input-validator.ts:18-23 | ⚠️ Architecture note |
| R-08 | HIGH | aps-environment = development | App.entitlements:5 | ✅ Fixed |
| R-09 | HIGH | armv7 UIRequiredDeviceCapabilities | Info.plist:33 | ✅ Fixed |
| R-10 | HIGH | CODE_SIGN_IDENTITY wrong | project.pbxproj:214,271 | ✅ Fixed |
| R-11 | HIGH | CSP unsafe-inline script-src | public/_headers:7 | ✅ Fixed |
| R-12 | HIGH | .env.production not gitignored | .gitignore | ✅ Fixed |
| R-13 | HIGH | Android no release signingConfig | android/app/build.gradle:18-21 | ✅ Fixed |
| R-14 | HIGH | No Android Codemagic pipeline | codemagic.yaml | ✅ Fixed |
| R-15 | HIGH | proguard keepattributes off | android/app/proguard-rules.pro:15-17 | ✅ Fixed |
| R-16 | HIGH | TypeScript strict: false | tsconfig.app.json | ⚠️ Incremental (would break build) |
| R-17 | MEDIUM | Static APP_SALT | src/lib/secureStorage.ts:4 | ⚠️ Accepted |
| R-18 | MEDIUM | Push token console.log | src/lib/pushNotifications.ts:201 | ✅ Fixed |
| R-19 | MEDIUM | Multiple as any casts | Sessions.tsx/Breakthroughs.tsx | ⚠️ Tech debt |
| R-20 | MEDIUM | health info disclosure | health/index.ts | ⚠️ Low risk |
| R-21 | MEDIUM | voice-answer no Twilio sig | voice-answer/index.ts | ⚠️ voice-stream disabled |
| R-22 | MEDIUM | Deno std 0.168.0 outdated | all edge function imports | ⚠️ No confirmed CVEs |
| R-23 | MEDIUM | rate-limiter in-memory fallback | rate-limiter.ts | ⚠️ Acceptable degradation |
| R-24 | LOW | .orig files committed | Breakthroughs.tsx.orig etc. | ✅ Fixed |
| R-25 | LOW | project_id in config.toml | supabase/config.toml:1 | ⚠️ Low risk |
| R-26 | LOW | api-sessions duplicates auth | api-sessions/index.ts:17-68 | ⚠️ Code quality |
| R-27 | LOW | style-src unsafe-inline CSP | public/_headers:7 | ⚠️ Lower severity |

---

## Remediation Roadmap (Priority Order)

**P0 — App Store Blockers (fix before any submission)**
1. R-01: Create PrivacyInfo.xcprivacy
2. R-02: Redact .env.production + rotate keys in Supabase Dashboard
3. R-08: App.entitlements development → production
4. R-09: Info.plist armv7 → arm64

**P1 — Security (fix before public launch)**
5. R-03/04/05: Add requireUser() to process-transcript, generate-breakthrough, chat
6. R-11: Remove unsafe-inline from script-src CSP
7. R-12: Add .env.production to .gitignore
8. R-13/14: Android signing config + Codemagic pipeline
9. R-10: Fix CODE_SIGN_IDENTITY for Release

**P2 — Quality (Sprint 2)**
10. R-15: Uncomment proguard keepattributes
11. R-16: Incrementally strengthen TypeScript
12. R-18: Remove push token from console.log
13. R-24: Delete .orig files

---
*APEX-AUDITOR-PRIME v2.0 — 2026-06-17 — All claims cite evidence*
