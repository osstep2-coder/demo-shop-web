#!/usr/bin/env bash
# Demo in one command: builds the website and starts the API that serves it on http://127.0.0.1:8000.
# For development with hot reload use ./dev.sh instead.
set -e
cd "$(dirname "$0")"
[ -d node_modules ] || npm ci
npm run build
exec api/run.sh
