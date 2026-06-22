#!/bin/bash
# Finds the latest installed claudeclaw version and starts the daemon
CLAW_DIR="$HOME/.claude/plugins/cache/claudeclaw/claudeclaw"
LATEST=$(ls -t "$CLAW_DIR" 2>/dev/null | head -1)
if [ -z "$LATEST" ]; then
  echo "claudeclaw not found in $CLAW_DIR" >&2
  exit 1
fi
exec "$HOME/.bun/bin/bun" run "$CLAW_DIR/$LATEST/src/index.ts" start --web
