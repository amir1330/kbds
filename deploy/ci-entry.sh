#!/bin/sh
set -eu
APP="${APP_ENV:-/home/kbds/kbds}"
ENTRY_CMD="${SSH_ORIGINAL_COMMAND:-}"
# Log for audit without leaking tokens
logger -t kbds-deploy "ci-entry invoked: $ENTRY_CMD from ${SSH_CONNECTION:-unknown}" 2>/dev/null || true
case "$ENTRY_CMD" in
  sync-deploy)
    IFS= read -r GHCR_USER
    IFS= read -r GHCR_TOKEN
    export GHCR_USER GHCR_TOKEN
    # sanity: limit tar extraction to expected files
    mkdir -p "$APP/deploy"
    # use --strip? keep paths - docker-compose.prod.yml at top level
    tar xzf - -C "$APP"
    chmod +x "$APP/deploy/"*.sh 2>/dev/null || true
    # verify files exist
    test -f "$APP/docker-compose.prod.yml" || { echo "missing docker-compose.prod.yml after sync" >&2; exit 1; }
    test -f "$APP/deploy/remote.sh" || { echo "missing deploy/remote.sh after sync" >&2; exit 1; }
    cd "$APP"
    exec ./deploy/remote.sh
    ;;
  deploy|"")
    cd "$APP"
    exec ./deploy/remote.sh
    ;;
  *)
    echo "forbidden command: $ENTRY_CMD" >&2
    exit 1
    ;;
esac
