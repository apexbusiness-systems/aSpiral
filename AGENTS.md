# Agent Operating Boundaries

Autonomous coding agents (CodeX, Jules, Claude Code, Antigravity) operating on
this repo MUST NOT modify the following without an explicit, human-reviewed
diff scoped specifically to that change:

- .env.production, .env.*, or any secret/credential value
- public/_headers (CSP and security headers)
- .github/workflows/*.yml (CI secrets and deploy config)

If a task's stated scope does not explicitly name one of these files, an
agent touching it is out of scope and must halt and flag for human review
rather than proceed. (This rule exists because a May 27 2026 auto-fix
silently corrupted a Supabase project ref in .env.production while
performing unrelated work, causing a production outage discovered ~7 weeks
later.)
