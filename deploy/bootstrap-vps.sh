#!/bin/sh
# One-time VPS bootstrap (run as root)
# Usage: USER_NAME=kbds APP_DIR=/home/kbds/kbds ./deploy/bootstrap-vps.sh
# Optionally set DEPLOY_PUBKEY to install restricted deploy key in one step.

set -eu
USER_NAME="${USER_NAME:-kbds}"
APP_DIR="${APP_DIR:-/home/${USER_NAME}/kbds}"

id "$USER_NAME" 2>/dev/null || useradd -m -s /bin/bash "$USER_NAME"
usermod -aG docker "$USER_NAME"
mkdir -p "$APP_DIR" "$APP_DIR/deploy"
# Ensure .ssh for deploy user
mkdir -p "/home/${USER_NAME}/.ssh"
chmod 700 "/home/${USER_NAME}/.ssh"
touch "/home/${USER_NAME}/.ssh/authorized_keys"
chmod 600 "/home/${USER_NAME}/.ssh/authorized_keys"
chown -R "$USER_NAME:$USER_NAME" "/home/$USER_NAME"

# Optional: install restricted deploy key if provided via env
if [ -n "${DEPLOY_PUBKEY:-}" ]; then
  # ForceCommand to ci-entry.sh, deny port/agent/X11/pty forwarding
  KEY_LINE="command=\"/home/${USER_NAME}/kbds/deploy/ci-entry.sh\",no-agent-forwarding,no-port-forwarding,no-X11-forwarding,no-pty ${DEPLOY_PUBKEY}"
  # Avoid duplicates
  grep -Fq "${DEPLOY_PUBKEY}" "/home/${USER_NAME}/.ssh/authorized_keys" 2>/dev/null || echo "$KEY_LINE" >> "/home/${USER_NAME}/.ssh/authorized_keys"
  chown "$USER_NAME:$USER_NAME" "/home/${USER_NAME}/.ssh/authorized_keys"
  chmod 600 "/home/${USER_NAME}/.ssh/authorized_keys"
  echo "Deploy key installed for $USER_NAME (restricted to ci-entry.sh)"
fi

echo "Bootstrap complete for user $USER_NAME at $APP_DIR"
echo "Next: ensure .env exists at $APP_DIR/.env and run docker compose up"
