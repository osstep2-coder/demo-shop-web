#!/usr/bin/env bash
# Starts the API (http://127.0.0.1:8000) and the website (http://localhost:5173) together. Ctrl+C stops both.
# The API project is expected next to this one; override with SHOP_API_DIR=/path/to/demo-shop-api.
set -e
cd "$(dirname "$0")"
API_DIR="${SHOP_API_DIR:-../demo-shop-api}"
if [ ! -x "$API_DIR/run.sh" ]; then
  echo "API не найдено в $API_DIR. Укажите путь: SHOP_API_DIR=/path/to/demo-shop-api ./dev.sh" >&2
  exit 1
fi
[ -d node_modules ] || npm install
"$API_DIR/run.sh" &
API_PID=$!
trap 'kill $API_PID 2>/dev/null' EXIT INT TERM
npm run dev
