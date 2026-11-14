#!/usr/bin/env bash
# Production deploy to the Devya VPS. The app left Vercel after the 2026-11-13
# account pause and runs there as a Docker container behind nginx.
#
#   bash scripts/deploy.sh        (or: npm run deploy)
#
# Ships origin/main as a tarball (the VPS has no GitHub access) into a staging
# directory, builds the image there under the box-wide build lock, swaps the
# directory and the container, waits for the app to answer, then checks every
# public host against the VPS (over HTTPS once its certificate exists, plain
# HTTP before DNS moves). The previous tree stays at <dir>.prev; roll back with
#   ssh root@72.61.81.59 'cd /home/devya/projects/devya-tasks-app.prev && docker compose -p devya-tasks-app -f docker-compose.prod.yml up -d --build'
# Needs key-based ssh to root@72.61.81.59. DEPLOY_REF=<ref> ships another ref.
set -euo pipefail
cd "$(dirname "$0")/.."

VPS_HOST=72.61.81.59
VPS="root@$VPS_HOST"
APP=devya-tasks-app            # directory, compose project, image and container name
DIR="/home/devya/projects/$APP"
PORT=3173                         # loopback port nginx proxies to
HOSTS=(tasks.devya-solutions.com)
CHECK_PATH=/login
REF="${DEPLOY_REF:-origin/main}"

git fetch -q origin main
SHA="$(git rev-parse --short=12 "$REF")"
echo "deploy: $APP @ $SHA -> $VPS:$DIR"

git archive --format=tar "$REF" \
  | ssh "$VPS" "set -e; rm -rf '${DIR:?}.next'; mkdir -p '$DIR.next'; tar -x -C '$DIR.next'; echo '$SHA' > '$DIR.next/REVISION'"

# One string argument, not a script on stdin: stdin stays /dev/null so nothing
# in the remote steps can swallow the rest of the script.
ssh "$VPS" "set -euo pipefail
cd '$DIR.next'
envf=(); if [ -f '$DIR.env' ]; then envf=(--env-file '$DIR.env'); fi
export GIT_SHA='$SHA'
flock /tmp/vx-build.lock docker compose -p '$APP' \"\${envf[@]}\" -f docker-compose.prod.yml build
cd /home/devya/projects
if [ -d '$DIR' ]; then rm -rf '$DIR.prev'; mv '$DIR' '$DIR.prev'; fi
mv '$DIR.next' '$DIR'
cd '$DIR'
docker compose -p '$APP' \"\${envf[@]}\" -f docker-compose.prod.yml up -d --no-build
docker image prune -f >/dev/null
for i in \$(seq 1 40); do
  if curl -fsS -o /dev/null -m 5 'http://127.0.0.1:$PORT$CHECK_PATH'; then echo 'deploy: container answers on 127.0.0.1:$PORT'; exit 0; fi
  sleep 3
done
echo 'deploy: no answer on 127.0.0.1:$PORT after 120s' >&2
docker logs --tail 60 '$APP' >&2
exit 1" </dev/null

status=0
for host in "${HOSTS[@]}"; do
  dns="$(dig +short A "$host" @1.1.1.1 | tail -1)"
  via=https
  code="$(curl -s -o /dev/null -m 15 -w '%{http_code}' --resolve "$host:443:$VPS_HOST" "https://$host$CHECK_PATH" || true)"
  if [ "$code" = 000 ]; then
    via=http  # no certificate yet: pending-certs issues it once DNS points here
    code="$(curl -s -o /dev/null -m 15 -w '%{http_code}' --resolve "$host:80:$VPS_HOST" "http://$host$CHECK_PATH" || true)"
  fi
  echo "deploy: $via://$host$CHECK_PATH on the VPS -> $code (public DNS: ${dns:-none})"
  case "$code" in 200|30[1278]) ;; *) status=1 ;; esac
done
exit "$status"
