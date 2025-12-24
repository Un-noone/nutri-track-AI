#!/bin/sh
set -eu

WORKDIR="${WORKDIR:-/app}"
cd "$WORKDIR"

hash_input() {
  sha256sum package.json | awk '{print $1}'
}

STAMP_FILE="node_modules/.deps-hash"

ensure_deps() {
  if [ ! -d node_modules ]; then
    mkdir -p node_modules
  fi

  current_hash="$(hash_input)"
  saved_hash=""
  if [ -f "$STAMP_FILE" ]; then
    saved_hash="$(cat "$STAMP_FILE" 2>/dev/null || true)"
  fi

  if [ "$current_hash" != "$saved_hash" ]; then
    echo "[entrypoint] installing dependencies..."
    npm install --no-package-lock
    echo "$current_hash" > "$STAMP_FILE"
    echo "[entrypoint] deps installed."
  fi
}

ensure_deps
exec "$@"
