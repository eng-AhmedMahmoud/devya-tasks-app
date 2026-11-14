#!/usr/bin/env bash
# Production deploy to the Devya VPS. The app left Vercel after the 2026-11-13
# account pause and runs there as a container behind nginx.
#
#   bash scripts/deploy.sh        (or: npm run deploy; DEPLOY_REF=<ref> ships another ref)
#
# Nothing builds on the VPS (developer rule, 2026-11-14: the 2-vCPU box serves
# live sites). Run on the Mac, this script:
#   1. exports $REF (default origin/main) into a temp dir and runs npm ci +
#      next build there with deploy/production.env;
#   2. assembles the standalone server with public/ and .next/static and swaps
#      the Mac's native sharp binaries for linux-musl-x64 ones (every .node file
#      must come out ELF x86-64, or the deploy stops);
#   3. ships it to $DIR/releases/<sha> with the runtime compose file and env,
#      points $DIR/current at it and runs `docker compose up -d` (stock
#      node:24.22.1-alpine, release mounted read-only at /app), keeping the
#      last 3 releases;
#   4. waits for /login, then checks every public host through nginx on the box.
# Roll back: ssh root@72.61.81.59, cd $DIR, `ln -sfn releases/<older-sha> current`,
# `docker compose -p devya-tasks-app -f docker-compose.prod.yml up -d --force-recreate`.
set -euo pipefail
cd "$(dirname "$0")/.."

VPS="root@72.61.81.59"
APP=devya-tasks-app            # directory, compose project and container name
DIR="/home/devya/projects/$APP"
PORT=3173                         # loopback port nginx proxies to
HOSTS=(tasks.devya-solutions.com)
CHECK_PATH=/login
HOST_BUILD_ENV=""   # VPS file with build-time values kept out of git
REF="${DEPLOY_REF:-origin/main}"

# Mac pacing: wait while the 1-minute load is above 15.
while [ "$(sysctl -n vm.loadavg 2>/dev/null | awk '{print int($2)}')" -gt 15 ] 2>/dev/null; do sleep 20; done

git fetch -q origin
SHA="$(git rev-parse --short=12 "$REF")"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/$APP-deploy.XXXXXX")"
trap 'rm -rf "${WORK:?}"' EXIT
echo "deploy: building $APP @ $SHA locally in $WORK"

mkdir "$WORK/src"
git archive --format=tar "$REF" | tar -x -C "$WORK/src"
cd "$WORK/src"
set -a
. deploy/production.env
if [ -n "$HOST_BUILD_ENV" ]; then
  ssh "$VPS" "cat '$HOST_BUILD_ENV'" </dev/null > "$WORK/host-build.env"
  . "$WORK/host-build.env"
fi
GIT_SHA="$SHA"
NEXT_TELEMETRY_DISABLED=1
set +a
npm ci --no-audit --no-fund
npx next build

REL="$WORK/release"
mv .next/standalone "$REL"
[ -d public ] && cp -R public "$REL/public"
cp -R .next/static "$REL/.next/static"
if [ -d "$REL/node_modules/sharp" ]; then
  sharp_ver="$(node -p "require('$REL/node_modules/sharp/package.json').version")"
  mkdir "$WORK/sharp"
  npm install --prefix "$WORK/sharp" --no-save --no-package-lock --no-audit --no-fund \
    --os=linux --libc=musl --cpu=x64 "sharp@$sharp_ver" >/dev/null
  rm -rf "$REL"/node_modules/@img/sharp-*
  cp -R "$WORK"/sharp/node_modules/@img/sharp-*linuxmusl-x64 "$REL/node_modules/@img/"
fi
bad="$(find "$REL" -name '*.node' -exec file {} + | grep -v 'ELF 64-bit LSB.*x86-64' || true)"
if [ -n "$bad" ]; then echo "deploy: native modules not built for linux x86-64:" >&2; echo "$bad" >&2; exit 1; fi
echo "$SHA" > "$REL/REVISION"
mkdir -p "$REL/.next/cache"   # mount point for the container's tmpfs cache
du -sh "$REL" | sed 's/^/deploy: release size /'

COPYFILE_DISABLE=1 tar --no-xattrs -C "$REL" -czf - . \
  | ssh "$VPS" "set -e; rm -rf '${DIR:?}/releases/$SHA'; mkdir -p '$DIR/releases/$SHA'; tar -xzf - --no-same-owner -C '$DIR/releases/$SHA'"
mkdir "$WORK/ship"
cp docker-compose.prod.yml "$WORK/ship/"
cp deploy/production.env "$WORK/ship/production.env"
COPYFILE_DISABLE=1 tar --no-xattrs -C "$WORK/ship" -cf - . | ssh "$VPS" "tar -xf - --no-same-owner -C '$DIR'"

# One string argument, not a script on stdin: stdin stays /dev/null so nothing
# in the remote steps can swallow the rest of the script.
ssh "$VPS" "set -euo pipefail
cd '$DIR'
ln -sfn 'releases/$SHA' current
docker compose -p '$APP' -f docker-compose.prod.yml up -d --force-recreate
ls -1t releases | tail -n +4 | while read -r old; do
  if [ -n \"\$old\" ] && [ \"\$old\" != '$SHA' ]; then rm -rf \"releases/\$old\"; fi
done
for i in \$(seq 1 40); do
  if curl -fs -o /dev/null -m 5 'http://127.0.0.1:$PORT$CHECK_PATH'; then echo 'deploy: container answers on 127.0.0.1:$PORT'; exit 0; fi
  sleep 3
done
echo 'deploy: no answer on 127.0.0.1:$PORT after 120s' >&2
docker logs --tail 60 '$APP' >&2
exit 1" </dev/null

# Through nginx on the box: HTTPS once the certificate exists (pending-certs
# issues it after DNS points here), plain HTTP before that.
ssh "$VPS" "status=0
for h in ${HOSTS[*]}; do
  via=https
  code=\$(curl -s -o /dev/null -m 15 -w '%{http_code}' --resolve \"\$h:443:127.0.0.1\" \"https://\$h/\" || true)
  if [ \"\$code\" = 000 ]; then via=http; code=\$(curl -s -o /dev/null -m 15 -w '%{http_code}' -H \"Host: \$h\" http://127.0.0.1/ || true); fi
  if [ \"\$via\" = https ]; then page=\$(curl -s -m 15 --resolve \"\$h:443:127.0.0.1\" \"https://\$h$CHECK_PATH\" || true)
  else page=\$(curl -s -m 15 -H \"Host: \$h\" \"http://127.0.0.1$CHECK_PATH\" || true); fi
  title=\$(printf '%s' \"\$page\" | grep -o '<title>[^<]*</title>' | head -1)
  echo \"deploy: \$via://\$h/ -> \$code; $CHECK_PATH \${title:-(no title: redirect)}\"
  case \"\$code\" in 200|30[1278]) ;; *) status=1 ;; esac
done
exit \$status" </dev/null
