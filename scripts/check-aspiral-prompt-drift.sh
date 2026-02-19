#!/usr/bin/env bash
set -euo pipefail

TARGET="supabase/functions/spiral-ai/index.ts"

if [[ ! -f "$TARGET" ]]; then
  echo "❌ Missing $TARGET"
  exit 1
fi

if ! rg -n "loadAspiralMindcore|const systemPrompt = mindcore\.systemPrompt" "$TARGET" >/dev/null; then
  echo "❌ MindCore loader injection not found in $TARGET"
  exit 1
fi

if rg -n "You are ASPIRAL's discovery engine|Synthesize the breakthrough from this conversation|const QUESTION_PATTERNS" "$TARGET" >/dev/null; then
  echo "❌ Legacy directive tokens found in active prompt assembly path"
  rg -n "You are ASPIRAL's discovery engine|Synthesize the breakthrough from this conversation|const QUESTION_PATTERNS" "$TARGET"
  exit 1
fi

SSOT_DIR=".claude/skills/aspiral-mindcore"
if [[ ! -f "$SSOT_DIR/UNIVERSAL_PROMPT.md" || ! -f "$SSOT_DIR/SHA256" ]]; then
  echo "❌ Missing SSOT prompt files under $SSOT_DIR"
  exit 1
fi

ACTUAL_SHA=$(python - <<'PY'
from pathlib import Path
import hashlib
text=Path('.claude/skills/aspiral-mindcore/UNIVERSAL_PROMPT.md').read_text(encoding='utf-8')
start='# ▶▶ SYSTEM PROMPT START ◀◀'
end='# ▶▶ SYSTEM PROMPT END ◀◀'
si=text.find(start); ei=text.find(end)
if si==-1 or ei==-1 or ei<=si:
    raise SystemExit('MISSING_MARKERS')
block=text[si+len(start):ei].strip('\n')+'\n'
print(hashlib.sha256(block.encode()).hexdigest())
PY
)
EXPECTED_SHA=$(tr -d '[:space:]' < "$SSOT_DIR/SHA256")

if [[ "$ACTUAL_SHA" != "$EXPECTED_SHA" ]]; then
  echo "❌ MindCore SHA lock mismatch"
  echo "expected=$EXPECTED_SHA"
  echo "actual=$ACTUAL_SHA"
  exit 1
fi

echo "✅ aSpiral prompt drift scan passed"
