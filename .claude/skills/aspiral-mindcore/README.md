# aSpiral MindCore SSOT

This directory is the single source of truth (SSOT) for the aSpiral agent system prompt.

## Package Metadata

- **Package name:** `aspiral-mindcore`
- **Current version:** `1.1.2`
- **Released on:** `2026-02-19`
- **Status:** `Production`
- **Owner:** `APEX Business Systems Ltd.`

## Canonical Artifacts

- Canonical prompt file: `UNIVERSAL_PROMPT.md`
- Extraction boundaries: `# ▶▶ SYSTEM PROMPT START ◀◀` to `# ▶▶ SYSTEM PROMPT END ◀◀`
- Integrity lock: `SHA256`
- Runtime version lock: `VERSION` (must be `1.1.2`)
- Distribution/metadata: `SKILL.md`, `MANIFEST.json`

## Governance Rules

1. Do **not** edit prompt text in application code.
2. Update prompt content only in `UNIVERSAL_PROMPT.md`.
3. Recompute and update `SHA256` after prompt updates.
4. Keep `VERSION`, `MANIFEST.json`, and `SKILL.md` version labels synchronized.

## Version History

| Version | Date | Notes |
|---|---|---|
| 1.1.2 | 2026-02-19 | Documentation and metadata alignment for SSOT integrity + CI hardening rollout. |
| 1.1.1 | 2026-02-16 | Initial audited MindCore package publication. |
