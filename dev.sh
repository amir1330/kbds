#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PID_FILE="$ROOT/.dev-backend.pid"
FRONTEND_PID_FILE="$ROOT/.dev-frontend.pid"

stop_dev() {
	pkill -f "vite dev" 2>/dev/null || true
	if [ -f "$BACKEND_PID_FILE" ]; then
		kill "$(cat "$BACKEND_PID_FILE")" 2>/dev/null || true
		rm -f "$BACKEND_PID_FILE"
	fi
	if [ -f "$FRONTEND_PID_FILE" ]; then
		kill "$(cat "$FRONTEND_PID_FILE")" 2>/dev/null || true
		rm -f "$FRONTEND_PID_FILE"
	fi
}

if [ "${1:-}" = "stop" ]; then
	echo "→ Stopping local dev servers..."
	stop_dev
	echo "✓ Stopped"
	exit 0
fi

echo "→ Stopping old local processes..."
stop_dev

echo "→ Stopping Docker dev stack (if running)..."
docker compose -f "$ROOT/docker-compose.dev.yml" down 2>/dev/null || true

mkdir -p "$ROOT/backend/data" "$ROOT/backend/uploads"

echo "→ Backend (SQLite + in-memory cart)..."
cd "$ROOT/backend"
if [ ! -d .venv ]; then
	python -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -r requirements.txt

export DATABASE_URL="${DATABASE_URL:-sqlite:///data/kbds.db}"
export REDIS_URL="${REDIS_URL:-memory}"
export UPLOAD_DIR="${UPLOAD_DIR:-uploads}"
export CORS_ORIGINS="${CORS_ORIGINS:-http://localhost:5173,http://127.0.0.1:5173}"
export SECRET_KEY="${SECRET_KEY:-dev-secret}"
export ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
export ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin}"

uvicorn app.main:app --reload --host 127.0.0.1 --port 8001 &
echo $! > "$BACKEND_PID_FILE"

echo "→ Frontend (vite dev)..."
cd "$ROOT/frontend"
if [ ! -d node_modules ]; then
	npm install
fi

echo "→ Waiting for API..."
for i in $(seq 1 30); do
	if curl -sf http://127.0.0.1:8001/api/health >/dev/null 2>&1; then
		break
	fi
	sleep 0.5
done

echo ""
echo "✓ Local dev ready"
echo "  Layout: http://127.0.0.1:5173/request"
echo "  Admin:  http://127.0.0.1:5173/admin  (admin / admin)"
echo "  API:    http://127.0.0.1:8001/api/health"
echo ""
echo "Stop: ./dev.sh stop"
echo ""

npm run dev -- --host 127.0.0.1 --port 5173
