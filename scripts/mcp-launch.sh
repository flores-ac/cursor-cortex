#!/bin/bash
# Cursor MCP entry: some configs use bash + this script (PATH often has no `node`).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INDEX="${ROOT}/index.js"

try_exec() {
  local bin="$1"
  [[ -x "$bin" ]] || return 1
  if ! "$bin" -e 'if (typeof fetch !== "function") process.exit(1)' 2>/dev/null; then
    return 1
  fi
  exec "$bin" "$INDEX"
}

try_exec "/opt/homebrew/bin/node" || true
if [[ -d "${HOME}/.nvm/versions/node" ]]; then
  for verdir in $(ls -1 "${HOME}/.nvm/versions/node" 2>/dev/null | sort -V -r); do
    try_exec "${HOME}/.nvm/versions/node/${verdir}/bin/node" && exit 0
  done
fi
try_exec "/usr/local/bin/node" || true

echo "mcp-launch.sh: need Node 18+ (global fetch). Edit this script or fix MCP command." >&2
exit 1
