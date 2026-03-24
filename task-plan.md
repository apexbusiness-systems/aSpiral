### ARTIFACT: Task Plan

**Mission:** Resolve all active SonarQube issues and 97 security hotspots to maintain a pristine A-grade quality gate.

**Success Criteria:**

- All SonarQube issues listed in API response (Cognitive complexity, unused imports, negated conditions, globalThis) are resolved.
- All pseudo-random number generator hotspots (`Math.random()`) are replaced with secure crypto alternatives where flagged.
- `AndroidManifest.xml` and `index.html` hotspots are hardened.
- Zero lint/typecheck regressions.
- Unit tests (`npm test`) pass.

**Constraints:**

- NEVER skip root cause analysis or test verification for complexity refactoring.
- NEVER use hedging language when asserting SonarQube status.
- TypeScript strict mode compliance with no `any` fallbacks.

**Dependencies:**

- Source files across `src/`, `supabase/functions/`, and `android/app/`.
- `sonar_issues.json` and `sonar_hotspots.json` as truth state.

**Risk Assessment:**

- Refactoring `Cognitive Complexity` in dense orchestrator functions (e.g., `Breakthroughs.tsx`, `spiral-ai/index.ts`) may alter side-effect execution order.
- Rollback plan: Isolate refactors into atomic, isolated changes. Discard changes if `npm test` fails.

**Agent Strategy:**

- Editor agent: Apply surgical multi-file edits (Auto).
- Terminal agent: Run verify gates (`tsc --noEmit`, `eslint`, `npm test`) (Auto).
- Request Review on completion before marking task complete.
