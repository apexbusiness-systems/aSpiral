# ASPIRAL STORE READINESS GATE
**Classification:** CONFIDENTIAL — APEX Business Systems LTD  
**Audit Date:** 2026-06-17 | **Auditor:** APEX-AUDITOR-PRIME v2.0  
**Verdict Pre-Fix:** ❌ NO-GO (2 App Store blockers, 1 push notification failure)  
**Verdict Post-Fix:** ✅ GO (all blockers resolved in audit/fix-all-issues branch)

---

## iOS App Store — Gate Checklist

| Gate | Status (Pre-Fix) | Status (Post-Fix) | Evidence |
|------|-----------------|-------------------|----------|
| PrivacyInfo.xcprivacy present | ❌ MISSING | ✅ Created | ASSET_MISSING:ios/App/App/PrivacyInfo.xcprivacy |
| aps-environment = production | ❌ FAIL (development) | ✅ Fixed | App.entitlements:5 |
| UIRequiredDeviceCapabilities = arm64 | ❌ FAIL (armv7) | ✅ Fixed | Info.plist:33 |
| CODE_SIGN_IDENTITY = Apple Distribution | ❌ FAIL (iPhone Developer) | ✅ Fixed | project.pbxproj:214,271 |
| Bundle ID = com.apex.aspiral | ✅ PASS | ✅ PASS | capacitor.config.ts:3 |
| Minimum iOS version declared (15.0) | ✅ PASS | ✅ PASS | project.pbxproj:233,284 |
| NSMicrophoneUsageDescription | ✅ PASS | ✅ PASS | Info.plist:52 |
| NSSpeechRecognitionUsageDescription | ✅ PASS | ✅ PASS | Info.plist:54 |
| App icon 1024x1024 no alpha | ✅ PASS (CI verified) | ✅ PASS | codemagic.yaml icon flatten step |
| Bitcode / armv7 deprecated warning | ❌ armv7 present | ✅ Fixed | Info.plist:33 |
| Codemagic TestFlight pipeline | ✅ EXISTS | ✅ EXISTS | codemagic.yaml:aspiral_ios_testflight |
| CI_DATA_MISSING: last TestFlight build | CI_DATA_MISSING | CI_DATA_MISSING | — |

### Critical Pre-Submission Actions Required (Manual — Cannot be committed)
1. **Rotate Supabase ANON KEY** — key exposed in public repo git history. Go to Supabase Dashboard → Settings → API → Regenerate anon key. Update Cloudflare Pages env vars.
2. **Rotate VITE_SUPABASE_PUBLISHABLE_KEY** — same.
3. **TestFlight Internal Testing** — add `aSpiral Internal` testing group in App Store Connect before first build per new marketing version.
4. **External Beta Review** — first build per new marketing version requires Beta App Review (~1 day turnaround).

---

## Android Google Play — Gate Checklist

| Gate | Status (Pre-Fix) | Status (Post-Fix) | Evidence |
|------|-----------------|-------------------|----------|
| Release signingConfig | ❌ MISSING | ✅ Added (placeholder) | android/app/build.gradle:18-21 |
| versionCode auto-increment | ❌ Hardcoded 10000 | ⚠️ Script exists | bump-version.sh |
| Codemagic Android pipeline | ❌ MISSING | ✅ Added | codemagic.yaml |
| proguard SourceFile/LineNumberTable | ❌ Commented out | ✅ Uncommented | proguard-rules.pro:15-17 |
| Package ID = com.apex.aspiral | ✅ PASS | ✅ PASS | android/app/build.gradle:4 |
| allowMixedContent = false | ✅ PASS | ✅ PASS | capacitor.config.ts:25 |
| webContentsDebuggingEnabled = false | ✅ PASS | ✅ PASS | capacitor.config.ts:26 |
| google-services.json | CI_DATA_MISSING | CI_DATA_MISSING | build.gradle tries to apply gms plugin |
| Target SDK version | INACCESSIBLE:android/variables.gradle | INACCESSIBLE | — |

### Critical Pre-Submission Actions Required (Manual)
1. **Upload signing keystore** — Add Android keystore to Codemagic `android_credentials` env group: `CM_KEYSTORE`, `CM_KEY_ALIAS`, `CM_KEY_PASSWORD`, `CM_KEYSTORE_PASSWORD`
2. **Add google-services.json** — Required for Firebase/FCM push notifications on Android
3. **Create Google Play app listing** — Manual step in Play Console
4. **Run bump-version.sh** before every Play Store upload to increment versionCode

---

## Security Gate

| Gate | Status | Evidence |
|------|--------|----------|
| No secrets in repo | ❌ FAIL (Pre-Fix) | .env.production:24-25 |
| No secrets in repo | ✅ PASS (Post-Fix) | .env.production redacted |
| .env.production in .gitignore | ❌ FAIL (Pre-Fix) | .gitignore |
| .env.production in .gitignore | ✅ PASS (Post-Fix) | .gitignore updated |
| Edge function auth (process-transcript) | ❌ FAIL (Pre-Fix) | config.toml:17 |
| Edge function auth (generate-breakthrough) | ❌ FAIL (Pre-Fix) | config.toml:15 |
| Edge function auth (chat) | ❌ FAIL (Pre-Fix) | config.toml:9 |
| Edge function auth (all 3) | ✅ PASS (Post-Fix) | requireUser() added |
| CSP script-src no unsafe-inline | ❌ FAIL (Pre-Fix) | public/_headers:7 |
| CSP script-src no unsafe-inline | ✅ PASS (Post-Fix) | public/_headers updated |

---

## Overall Verdict

**Pre-Fix:** ❌ NO-GO  
Reason: Missing PrivacyInfo.xcprivacy (guaranteed App Store rejection), push notifications broken in production, 3 unauthenticated AI endpoints with GROQ cost exposure, credentials in public repo.

**Post-Fix (audit/fix-all-issues branch):** ✅ GO FOR TESTFLIGHT  
All App Store blockers resolved. Security critical issues patched. Manual steps remain (key rotation, Play Store listing, Android keystore).

**GO FOR PRODUCTION:** Conditional on manual steps in Critical Pre-Submission sections above.

---
*APEX-AUDITOR-PRIME v2.0 — 2026-06-17*
