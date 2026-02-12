#!/usr/bin/env bash
set -euo pipefail

export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
fi

HOST="${HOST:-127.0.0.1}" PORT="${PORT:-4333}" ADMIN_USER="${ADMIN_USER:-HAMDIJAWHER}" ADMIN_PASS="${ADMIN_PASS:-Lifechanging2023@}" node server.mjs
