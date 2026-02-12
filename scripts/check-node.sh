#!/usr/bin/env bash
set -euo pipefail

export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
fi

node --check script.js
node --check data/index.js
node --check admin/admin.js
node --check out/out.js
node --check scripts/rotateWeekly.mjs
node --check server.mjs

echo "Node syntax checks passed."
