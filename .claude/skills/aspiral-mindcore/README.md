# aSpiral MindCore SSOT

This directory is the single source of truth for the aSpiral agent system prompt.

- Canonical prompt file: `UNIVERSAL_PROMPT.md`
- Extraction boundaries: `# ▶▶ SYSTEM PROMPT START ◀◀` to `# ▶▶ SYSTEM PROMPT END ◀◀`
- Integrity lock: `SHA256`
- Runtime version lock: `VERSION` (must be `1.1.2`)

⚠️ Do not edit prompt text directly in application code. Update this SSOT package and hash lock instead.
