#!/usr/bin/env bash
# Writes the API contract from the code in api/ (no running server needed) to tests/api/generated/openapi.json.
set -euo pipefail
cd "$(dirname "$0")/.."
PYTHON=api/.venv/bin/python
[ -x "$PYTHON" ] || PYTHON=python3
(cd api && "../$PYTHON" -c 'import json; from server.app import app; print(json.dumps(app.openapi(), indent=2, ensure_ascii=False))') >tests/api/generated/openapi.json
echo "tests/api/generated/openapi.json updated"
