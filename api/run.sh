#!/usr/bin/env bash
# Starts the demo API on http://127.0.0.1:8000 (swagger: /docs). Creates .venv on first run.
# If ../dist exists (npm run build), the same server also serves the website.
set -e
cd "$(dirname "$0")"
if [ ! -d .venv ]; then
  python3 -m venv .venv
  .venv/bin/pip install -q -r requirements.txt
fi
exec .venv/bin/uvicorn server.app:app --host 127.0.0.1 --port "${PORT:-8000}"
