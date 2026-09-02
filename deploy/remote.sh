#!/bin/sh
set -eu
APP_DIR="${APP_ENV:-/home/kbds/kbds}"
cd "$APP_DIR"
# GHCR_TOKEN should be supplied via stdin (GITHUB_TOKEN) from CI.
# Fallback to .env only if stdin empty (manual deploy).
if [ -z "${GHCR_TOKEN:-}" ] && [ -f .env ]; then
  GHCR_TOKEN=$(grep -E '^GHCR_TOKEN=' .env | tail -n1 | cut -d= -f2- || true)
  GHCR_USER=$(grep -E '^GHCR_USER=' .env | tail -n1 | cut -d= -f2- || true)
  export GHCR_TOKEN GHCR_USER
fi
[ -n "${GHCR_TOKEN:-}" ] || { echo "GHCR_TOKEN missing (pass via CI or set in .env)" >&2; exit 1; }
printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "${GHCR_USER:-amir1330}" --password-stdin >/dev/null
# Ensure external network and volumes exist
docker network inspect web >/dev/null 2>&1 || docker network create web >/dev/null
if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-kbds}"
# Pull with retry (only app images, infra uses public images)
$DC -f docker-compose.prod.yml pull backend frontend
docker logout ghcr.io >/dev/null 2>&1 || true
# Bring up entire stack (postgres, redis, app) - ensures infra is initialized
$DC -f docker-compose.prod.yml up -d
# Wait for health
sleep 5
$DC -f docker-compose.prod.yml ps
# Cleanup old images safely (keep last 2)
docker image prune -f >/dev/null 2>&1 || true
echo "Deploy complete."
