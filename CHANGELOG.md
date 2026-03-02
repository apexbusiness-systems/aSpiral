# Changelog

All notable changes to the aSpiral project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.4] - 2026-03-02

### Added
- **Voice Personalization**: Added a typed `voiceProfile` resolver that maps user voice preferences to production-safe TTS voice/speed/volume values with Zod validation.

### Changed
- **STT Reliability**: Integrated explicit STT session leasing in `useVoiceInput` to prevent overlapping microphone sessions and orphaned listeners under restart/error paths.
- **TTS Reliability**: Updated the text-to-speech Edge Function to include deterministic timeout + retry behavior for transient OpenAI failures.

### Fixed
- **Voice Quality**: Wired chat playback to persisted voice settings instead of hardcoded `nova@1.0`, reducing robotic monotone output.
- **TTS API Contract**: Added missing `nova` voice to the validated enum so default requests no longer fail validation and silently degrade to fallback speech engines.

## [1.0.3] - 2026-03-02

### Added
- **CI Coverage**: Added first-class `lint`, `typecheck`, and `test` npm scripts so PR and local checks execute consistently across environments.

### Changed
- **Security Runtime**: Updated secure storage fingerprint resolution to use `globalThis.localStorage` detection, making browser and test runtime behavior consistent.
- **Tests**: Hardened secure storage tests with typed Supabase mock signatures and deterministic localStorage overrides.

### Fixed
- **Test Stability**: Resolved `secureStorage` failures for device fingerprint persistence and per-device secret derivation under Vitest node runtime.

## [1.0.2] - 2026-02-11

### Added
- **Testing**: Added comprehensive unit test suite for `Visual Variety Engine` (`visualVariety.ts`), achieving 100% coverage.

## [1.0.1] - 2026-02-08

### Added
- **Infrastructure**: Added `vercel.json` configuration for seamless Vercel deployment support.
- **Documentation**: New `CHANGELOG.md` to track project history.
- **Components**: Extracted `StatCard` component for better reusability and testing.
- **Voice Security**: Enterprise-grade voice security fixes and audio unlock handling.

### Changed
- **Code Quality**: Achieved SonarQube Grade A maintainability by resolving all major code smells and duplications.
- **Code Health**: Replaced direct console logs with structured logger in `App.tsx` for cleaner production output.
- **Testing**: Refactored validation tests to remove duplication and improve reliability.
- **Voice System**: Restored and stabilized voice hooks (`useVoiceInput`, `useTextToSpeech`) for consistent cross-platform performance.
- **Documentation**: Updated `README.md` with premium block-style ASCII art and build badges.
- **Documentation**: Updated `LAUNCH_READINESS.md` with latest audit results (Feb 6, 2026).
- **Documentation**: Updated `DEPLOYMENT_INSTRUCTIONS.md` to include Vercel deployment steps.

### Fixed
- **Build**: Resolved Vercel build timeout issues via optimized configuration.
- **Linting**: Fixed various ESLint errors and strict type definitions across the codebase.
- **Android**: Fixed Android PWA build configuration.
- **UI**: Resolved duplicate UI sections in MainMenu component.
- **Audio**: Fixed audio unlock error bubbles appearing on page load.

## [1.0.0] - 2026-01-30

### Added
- **Core**: Initial Release Candidate for Production Launch.
- **Features**: Complete Voice Journey, 3D Cinematics, Session Management.
- **Security**: Comprehensive security guardrails for AI interactions.
- **Performance**: Optimized 3D rendering engine and physics worker.

### Security
- **Audit**: Completed full security audit with 0 critical vulnerabilities.
