# DOC SYNC MANIFEST — aSpiral
**Audit Date:** 2026-06-17 | **Auditor:** APEX-AUDITOR-PRIME v2.0  
**Standard:** Claims verified ✓ | Claims contradicted ✗ | Claims unverifiable ?

---

## Documents Audited

| Document | Path | Claims Verified | Claims Contradicted | Claims Unverifiable |
|----------|------|-----------------|---------------------|---------------------|
| README.md | README.md | ✓ Tech stack matches code | — | ? CI status badges |
| CHANGELOG.md | CHANGELOG.md | ✓ Feature list plausible | — | ? Release dates |
| DEPLOYMENT_INSTRUCTIONS.md | DEPLOYMENT_INSTRUCTIONS.md | ✓ Codemagic workflow exists | ✗ Missing Android pipeline | ? Actual deploy success |
| LAUNCH_READINESS.md | LAUNCH_READINESS.md | ✓ Feature descriptions | ✗ Claims push notifs work (broken: development entitlement) | — |
| SUPABASE_SETUP.md | SUPABASE_SETUP.md | ✓ Migration files match schema | — | ? Applied to live DB |
| docs/SECURITY_REVIEW.md | docs/SECURITY_REVIEW.md | ✓ Rate limiting documented | ✗ Claims all functions JWT-protected (process-transcript, generate-breakthrough, chat are NOT) | — |
| docs/PRODUCTION_AUDIT.md | docs/PRODUCTION_AUDIT.md | ✓ Some findings match audit | ✗ States PrivacyInfo "to be added" — not yet added | — |
| docs/FEATURE_REGISTRY.md | docs/FEATURE_REGISTRY.md | ✓ Features described match code | ? Workspaces marked "coming soon" matches placeholder page | — |
| docs/PRODUCTION_STATUS.md | docs/PRODUCTION_STATUS.md | ? Status claims unverifiable without CI | — | ? |
| docs/SUPABASE_CONFIG_CHECKLIST.md | docs/SUPABASE_CONFIG_CHECKLIST.md | ✓ config.toml structure matches | ✗ Does not flag verify_jwt=false as risk for process-transcript/chat | — |
| verification-log.md | verification-log.md | ✓ Some checks verified | ? Most checks are self-asserted | — |
| next-action.md | next-action.md | ✓ Action items plausible | — | ? Completion status |

---

## Contradictions Found (Correctable)

### ✗ docs/SECURITY_REVIEW.md — "All functions require JWT"
**Contradicted by:** [FILE:supabase/config.toml:9,15,17] and verified by reading function bodies. `process-transcript`, `generate-breakthrough`, `chat` have `verify_jwt = false` with no `requireUser()` call.  
**Correction needed:** Update to accurately reflect which functions are protected vs. permissive.

### ✗ LAUNCH_READINESS.md — "Push notifications configured"
**Contradicted by:** [FILE:ios/App/App/App.entitlements:5] `aps-environment = development`. Production push notifications will silently fail.  
**Correction needed:** Update status to BLOCKED until entitlement fixed.

### ✗ docs/PRODUCTION_AUDIT.md — "PrivacyInfo.xcprivacy to be added"
**Contradicted by:** ASSET_MISSING:ios/App/App/PrivacyInfo.xcprivacy — still not present as of audit date.  
**Correction needed:** Mark as RESOLVED after fix branch merge.

### ✗ docs/SUPABASE_CONFIG_CHECKLIST.md — Does not flag unauthenticated endpoints
**Contradicted by:** [FILE:supabase/config.toml:9,15,17] — verify_jwt=false on AI endpoints is not called out as a risk.  
**Correction needed:** Add security note about which endpoints require application-level auth.

---

## Documents Accurate (No Correction Required)

- README.md — Tech stack (React 18.3, Vite, Capacitor, Supabase, Three.js, i18next) matches codebase ✓
- docs/CODE_REVIEW.md — Code patterns described match observed implementation ✓
- docs/RENDERER_V2.md — Renderer V2 feature flag matches [FILE:src/lib/featureFlags.ts] ✓
- docs/OMNILINK_ENABLEMENT_GUIDE.md — OmniLink integration pattern matches src/integrations/omnilink/ ✓
- SUPABASE_SETUP.md — Migration files accurately described ✓

---

## Unverifiable Claims

- CI badge status (CI_DATA_MISSING — last run result unavailable via API)
- Actual Supabase DB table existence (migrations present but live apply unverified)
- App Store Connect listing status (external, requires account access)
- TestFlight build history (external)

---
*APEX-AUDITOR-PRIME v2.0 — 2026-06-17*
