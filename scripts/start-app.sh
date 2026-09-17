#!/bin/bash
# Launched at login by ~/Library/LaunchAgents/com.rhythmmapsearch.launcher.plist.
# Starts the Next.js dev server (if not already up) then Electron against it —
# this app has no packaged build yet, so "open at login" means replaying the
# same dev-mode launch sequence used throughout development.
set -e

# launchd's default PATH is just /usr/bin:/bin:/usr/sbin:/sbin — it doesn't know
# about Node installed at ~/.hermes/node, which the electron CLI wrapper execs.
export PATH="/Users/paul/.hermes/node/bin:$PATH"

PROJECT_DIR="/Users/paul/Personal/Sandbox/Corner qw[]/rhythm-map-search"
cd "$PROJECT_DIR"

if ! lsof -iTCP:3001 -sTCP:LISTEN -n -P >/dev/null 2>&1; then
  nohup ./node_modules/.bin/next dev -p 3001 > /tmp/rhythm-map-search-next.log 2>&1 &
  disown
fi

for i in $(seq 1 60); do
  if curl -s -o /dev/null http://localhost:3001; then
    break
  fi
  sleep 0.5
done

if pgrep -f "rhythm-map-search.*Electron.app/Contents/MacOS/Electron" >/dev/null 2>&1; then
  exit 0
fi

# exec (not background + exit) so launchd tracks Electron itself as the job's
# process — a backgrounded `&` child gets reaped once this script exits under
# launchd, even though the same pattern survives fine in an interactive shell.
exec env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron . > /tmp/rhythm-map-search-electron.log 2>&1
