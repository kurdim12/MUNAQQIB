#!/bin/bash
# MUNAQQIB SessionStart hook — installs the worker's dev dependencies so pytest
# and ruff work immediately in Claude Code on the web sessions. Synchronous and
# idempotent; safe to re-run. Installs into an isolated venv (avoids clashing
# with Debian-managed system packages and is cached with the container).
#
# Uses the lightweight requirements-dev.txt (no torch) for fast startup — the
# matcher degrades to keyword-only without the ML stack (see DECISIONS.md).
# Install requirements.txt inside the venv for the full runtime + embeddings.
set -euo pipefail

# Only run in the remote (web) environment; local dev manages its own venv.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

WORKER_DIR="$CLAUDE_PROJECT_DIR/apps/worker"
VENV="$WORKER_DIR/.venv"
cd "$WORKER_DIR"

if [ ! -x "$VENV/bin/python" ]; then
  python3 -m venv "$VENV"
fi

"$VENV/bin/python" -m pip install --quiet --upgrade pip
"$VENV/bin/python" -m pip install --quiet -r requirements-dev.txt

# Activate the venv and make the worker package importable (top-level
# config/models/pipeline/...) for every command in this session.
{
  echo "export PATH=\"$VENV/bin:\${PATH}\""
  echo "export PYTHONPATH=\"$WORKER_DIR:\${PYTHONPATH:-}\""
} >> "$CLAUDE_ENV_FILE"

echo "MUNAQQIB worker dev deps installed (.venv)."

# --- Web app (apps/web): install node deps so next build / lint / vitest work ---
WEB_DIR="$CLAUDE_PROJECT_DIR/apps/web"
if [ -f "$WEB_DIR/package.json" ] && [ ! -d "$WEB_DIR/node_modules" ]; then
  cd "$WEB_DIR"
  if [ -f package-lock.json ]; then
    npm ci --no-audit --no-fund --silent
  else
    npm install --no-audit --no-fund --silent
  fi
  echo "MUNAQQIB web deps installed (node_modules)."
fi
