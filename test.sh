#!/usr/bin/env bash
# Run the whole test suite with one command.
#   ./test.sh              backend + frontend
#   ./test.sh backend      backend only (extra args go to pytest, e.g. ./test.sh backend -k auth)
#   ./test.sh frontend     frontend only
#
# The backend tests use a throwaway MongoDB on localhost:27018 (the "mongo-test" compose service),
# started here if it isn't already up. Set TEST_MONGO_URL to use your own instead.
# Stop it with: docker compose --profile test down
set -u
cd "$(dirname "$0")"

target="${1:-all}"
[ $# -gt 0 ] && shift
status=0

mongo_up() {
  (exec 3<>/dev/tcp/127.0.0.1/27018) 2>/dev/null
}

run_backend() {
  echo "==> Backend tests"
  if [ -z "${TEST_MONGO_URL:-}" ] && ! mongo_up; then
    echo "Starting test MongoDB on :27018..."
    # The backend service requires JWT_SECRET to be set even when only mongo-test is started
    JWT_SECRET="${JWT_SECRET:-unused}" docker compose --profile test up -d --wait mongo-test || return 1
  fi
  (cd backend && python3 -m pytest -q "$@")
}

run_frontend() {
  echo "==> Frontend tests"
  (cd frontend && { [ -d node_modules ] || npm ci; } && CI=true npm test --silent)
}

case "$target" in
  backend)  run_backend "$@" || status=1 ;;
  frontend) run_frontend || status=1 ;;
  all)      run_backend || status=1; run_frontend || status=1 ;;
  *) echo "Usage: $0 [all|backend|frontend] [pytest args]"; exit 2 ;;
esac

[ $status -eq 0 ] && echo "All tests passed." || echo "Some tests failed."
exit $status
