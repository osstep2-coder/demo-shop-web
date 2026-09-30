#!/usr/bin/env bash
# Development: API on http://127.0.0.1:8000 and Vite with hot reload on http://localhost:5173. Ctrl+C stops both.
set -e
cd "$(dirname "$0")"
[ -d node_modules ] || npm install
api/run.sh &
API_PID=$!
trap 'kill $API_PID 2>/dev/null' EXIT INT TERM
npm run dev
