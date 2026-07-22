#!/usr/bin/env bash
# Render build script for SyncQuiz backend
# - Cleans stale dist/ folder to avoid "tsc: Permission denied" errors
#   when previous build artifacts are read-only after a crashed deploy
# - Installs deps and compiles TypeScript

set -euo pipefail

echo "==> Cleaning previous build artifacts"
rm -rf dist

echo "==> Installing dependencies (npm ci)"
npm ci --no-audit --no-fund

echo "==> Building TypeScript"
npm run build

echo "==> Build complete: $(ls -la dist/main.js 2>/dev/null | awk '{print $5, $9}')"