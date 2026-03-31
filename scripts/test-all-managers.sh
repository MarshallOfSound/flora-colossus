#!/usr/bin/env bash
set -euo pipefail

# Test flora-colossus with all major package managers locally.
# Usage: ./scripts/test-all-managers.sh [--skip-yarn] [--skip-npm] [--skip-pnpm]
#
# Requires: node >= 22.12, yarn, npm, pnpm installed globally or via corepack.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

SKIP_YARN=false
SKIP_NPM=false
SKIP_PNPM=false

for arg in "$@"; do
  case $arg in
    --skip-yarn) SKIP_YARN=true ;;
    --skip-npm) SKIP_NPM=true ;;
    --skip-pnpm) SKIP_PNPM=true ;;
    *) echo "Unknown flag: $arg"; exit 1 ;;
  esac
done

PASS=0
FAIL=0
RESULTS=()

run_with_manager() {
  local manager="$1"
  local tmpdir
  tmpdir="$(mktemp -d)"

  echo ""
  echo "=============================="
  echo "  Testing with: $manager"
  echo "=============================="

  # Copy project to temp dir, then remove generated/large directories
  cp -r "$PROJECT_DIR/." "$tmpdir/"
  rm -rf "$tmpdir/node_modules" "$tmpdir/dist" "$tmpdir/coverage" \
    "$tmpdir/.yarn/cache" "$tmpdir/.yarn/install-state.gz"

  pushd "$tmpdir" > /dev/null

  # For npm and pnpm, remove the packageManager and workspaces fields
  if [[ "$manager" != "yarn" ]]; then
    node -e "
      const p = require('./package.json');
      delete p.packageManager;
      delete p.workspaces;
      require('fs').writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
    "
  fi

  local exit_code=0

  case "$manager" in
    yarn)
      yarn install --immutable 2>&1 || yarn install 2>&1
      yarn test 2>&1 || exit_code=$?
      ;;
    npm)
      npm ci 2>&1
      npx vitest run 2>&1 || exit_code=$?
      ;;
    pnpm)
      pnpm install --frozen-lockfile 2>&1
      pnpm vitest run 2>&1 || exit_code=$?
      ;;
  esac

  popd > /dev/null
  rm -rf "$tmpdir"

  if [[ $exit_code -eq 0 ]]; then
    PASS=$((PASS + 1))
    RESULTS+=("  ✓ $manager")
    echo "  ✓ $manager passed"
  else
    FAIL=$((FAIL + 1))
    RESULTS+=("  ✗ $manager (exit code: $exit_code)")
    echo "  ✗ $manager failed (exit code: $exit_code)"
  fi

  return 0
}

echo "flora-colossus: cross-package-manager test runner"
echo "================================================="

if [[ "$SKIP_YARN" == false ]]; then
  run_with_manager "yarn"
fi

if [[ "$SKIP_NPM" == false ]]; then
  run_with_manager "npm"
fi

if [[ "$SKIP_PNPM" == false ]]; then
  run_with_manager "pnpm"
fi

echo ""
echo "================================================="
echo "  Results: $PASS passed, $FAIL failed"
echo "================================================="
for r in "${RESULTS[@]}"; do
  echo "$r"
done
echo ""

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
