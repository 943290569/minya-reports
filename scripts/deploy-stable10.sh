#!/usr/bin/env bash
set -euo pipefail

cd /home/eng_mohamad_jeb/minya-reports

git pull --ff-only origin main
npm test
npm run build:app
pm2 restart minya-landfill --update-env
pm2 status
curl -fsSI http://127.0.0.1:6000 >/dev/null

echo "Stable 10 deployment checks passed on port 6000."
