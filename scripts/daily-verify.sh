#!/bin/bash
# Daily data-accuracy check (see scripts/verify-data.mjs).
# Loads the Firecrawl key from 1Password (so it never lives on disk) and runs
# the verifier. Designed for a local launchd/cron job — it stays on your Mac so
# it can reach 1Password via the `op` CLI (a cloud runner cannot).
#
# Output is appended to ~/.cache/wrb/verify.log. Exit 1 => drift found.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$HOME/.cache/wrb/verify.log"
mkdir -p "$(dirname "$LOG")"

if ! command -v op >/dev/null 2>&1; then
  echo "$(date -u +%FT%TZ) ERROR: 1Password CLI (op) not found" >> "$LOG"; exit 2
fi

KEY="$(op item get 'Firecrawl: API Credentials' --fields credential --reveal 2>/dev/null || true)"
if [ -z "$KEY" ]; then
  echo "$(date -u +%FT%TZ) ERROR: could not read Firecrawl key from 1Password (unlock the app)" >> "$LOG"; exit 2
fi

echo "$(date -u +%FT%TZ) running data-verify..." >> "$LOG"
if FIRECRAWL_API_KEY="$KEY" node "$REPO/scripts/verify-data.mjs" >> "$LOG" 2>&1; then
  echo "$(date -u +%FT%TZ) OK — no drift" >> "$LOG"
else
  code=$?
  echo "$(date -u +%FT%TZ) DRIFT or error (exit $code) — see entries above" >> "$LOG"
  exit $code
fi
