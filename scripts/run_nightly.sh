#!/usr/bin/env bash
# Nightly research summary generation
# Intended to be run via cron or Paperclip scheduled trigger
# Runs at ~11pm local time so the review is ready for morning

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

DATE=$(date -u +%Y-%m-%d)

echo "[$(date)] Starting nightly research generation for $DATE"

# Install dependencies if needed (using uv per company policy)
uv pip install -q anthropic httpx 2>/dev/null || true

# Generate the daily review
uv run python scripts/generate_daily_review.py --date "$DATE"

echo "[$(date)] Nightly research generation complete"
