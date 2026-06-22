#!/usr/bin/env bash
#
# PostToolUse hook — re-run the schema validator whenever a patch data file is
# edited, so malformed/out-of-schema data surfaces immediately instead of
# waiting for CI. "Accuracy is the moat" (PLAN.md §7); this is that guardrail at
# edit time. Reuses `npm run validate-data` (scripts/validate.ts) — no new
# validation logic.
#
# Wired from .claude/settings.json on Edit|Write. The hook payload arrives as
# JSON on stdin; we only act when the edited file lives under data/patches/.
set -euo pipefail

payload="$(cat)"
file_path="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty')"

case "$file_path" in
  *data/patches/*.json)
    cd "${CLAUDE_PROJECT_DIR:-.}"
    if ! npm run --silent validate-data; then
      # Exit 2 feeds stderr back to Claude so it can fix the data before moving on.
      echo "Patch data failed schema validation (see output above). Fix it before continuing." >&2
      exit 2
    fi
    ;;
esac
