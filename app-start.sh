#!/usr/bin/env bash
# ============================================================
#  Arena Shell :: app-start.sh
#  Runs INSIDE the app on every boot (and from Settings).
#  This is your hook for local servers / env vars / proxies.
#  Do NOT call start.sh here - that is the launcher.
# ============================================================
echo
echo "   =========================================="
echo "      A R E N A   S H E L L   |   app-start.sh"
echo "   =========================================="
echo
echo "   Date     : $(date)"
echo "   User     : ${USER:-unknown}"
echo "   Work dir : $(pwd)"
echo
export ARENA_SHELL=1
echo "   Ready. Handing control back to Arena Shell."
echo
exit 0
