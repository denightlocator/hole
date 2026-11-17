#!/usr/bin/env bash
# ============================================================
#  Arena Shell :: start.sh  (macOS / Linux equivalent of start.bat)
# ============================================================
echo
echo "   =========================================="
echo "      A R E N A   S H E L L   |   start.sh"
echo "   =========================================="
echo

echo "   Date     : $(date)"
echo "   User     : ${USER:-unknown}"
echo "   Work dir : $(pwd)"
echo

export ARENA_SHELL=1
export ARENA_SHELL_HOME="$(pwd)"
export ARENA_SHELL_HOME_URL="${ARENA_SHELL_HOME_URL:-https://arena.ai/agent}"

if [ -f "$(dirname "$0")/proxy.js" ] && command -v node >/dev/null 2>&1; then
  echo "   Found proxy.js - starting local proxy..."
  (node "$(dirname "$0")/proxy.js" >/dev/null 2>&1 &)
fi

if [ -f "$(dirname "$0")/helpers/boot.sh" ]; then
  echo "   Found helpers/boot.sh - running it..."
  bash "$(dirname "$0")/helpers/boot.sh"
fi

echo "   Ready. Handing control back to Arena Shell."
echo
exit 0
