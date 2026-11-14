#!/usr/bin/env bash
# The merge gate, step for step what Jenkins runs (Jenkinsfile). Run it from
# anywhere: bash scripts/ci-local.sh
set -euo pipefail
cd "$(dirname "$0")/.."

npm ci --no-audit --no-fund
npm run lint
npm run typecheck
npm run build
echo "ci-local: all steps passed"
