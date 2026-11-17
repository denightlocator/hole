#!/usr/bin/env bash
# ============================================================================
#  Arena Shell :: start.sh  (macOS / Linux launcher)
#
#  The only file you need. Downloads the app from GitHub and launches it.
#  Run it again any time to update.
# ============================================================================
set -euo pipefail

REPO="${ARENA_REPO:-denightlocator/hole}"
REF="${ARENA_REF:-arena/67ffee91-hole}"

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOOTSTRAP="$HERE/bootstrap.sh"

if [ ! -f "$BOOTSTRAP" ]; then
  echo "   Fetching bootstrap.sh..."
  tmp="$(mktemp -d)"
  curl -fsSL "https://codeload.github.com/$REPO/zip/$REF" -o "$tmp/src.zip" \
    || { echo "   [x] Could not download the repo."; exit 1; }
  unzip -q "$tmp/src.zip" -d "$tmp"
  found="$(find "$tmp" -name bootstrap.sh -type f | head -1)"
  [ -n "$found" ] || { echo "   [x] bootstrap.sh not found in the archive."; exit 1; }
  cp "$found" "$BOOTSTRAP"
  rm -rf "$tmp"
  echo "   bootstrap.sh fetched"
fi

ARENA_REPO="$REPO" ARENA_REF="$REF" exec bash "$BOOTSTRAP"
