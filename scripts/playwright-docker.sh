#!/usr/bin/env bash
# Visual tests with the browser inside the Playwright image, so screenshots are identical on every machine.
# The image runs only `playwright run-server`; the test runner and Vite stay on the host and reach the
# browser over a websocket (connectOptions in playwright.config.ts). Nothing is installed in the container.
# Arguments go to `playwright test`, e.g. ./scripts/playwright-docker.sh --update-snapshots tests/specs/cart.spec.ts
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION=$(node -p 'require("./node_modules/@playwright/test/package.json").version')
IMAGE="mcr.microsoft.com/playwright:v${VERSION}-noble"
PORT=${PW_SERVER_PORT:-3123}

container=$(docker run -d --rm --init --ipc=host \
  -p "127.0.0.1:${PORT}:${PORT}" \
  -v "$PWD/node_modules/playwright-core":/playwright-core:ro \
  "$IMAGE" \
  node /playwright-core/cli.js run-server --port "$PORT" --host 0.0.0.0)
trap 'docker stop "$container" >/dev/null 2>&1 || true' EXIT

for _ in $(seq 1 60); do
  curl -s -o /dev/null "http://127.0.0.1:${PORT}/" && break
  sleep 0.5
done

PW_WS_ENDPOINT="ws://127.0.0.1:${PORT}/" npx playwright test "$@"
