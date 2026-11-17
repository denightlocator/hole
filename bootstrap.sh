#!/usr/bin/env bash
# ============================================================================
#  Arena Shell :: bootstrap.sh   (macOS / Linux equivalent of bootstrap.ps1)
#
#  Downloads the app source + Electron runtime and launches the shell, so
#  `bash start.sh` is all you need on a fresh machine.
# ============================================================================
set -euo pipefail

REPO="${ARENA_REPO:-denightlocator/hole}"
REF="${ARENA_REF:-arena/67ffee91-hole}"
INSTALL_DIR="${ARENA_INSTALL_DIR:-$HOME/.local/share/ArenaShell}"
HOME_URL="${ARENA_HOME_URL:-https://arena.ai/agent}"
FORCE="${ARENA_FORCE:-}"
NO_LAUNCH="${ARENA_NO_LAUNCH:-}"
OFFLINE="${ARENA_OFFLINE:-}"

step() { printf '   %s\n' "$1"; }
ok()   { printf '   \033[32m%s\033[0m\n' "$1"; }
warn() { printf '   \033[33m%s\033[0m\n' "$1"; }
fail() { printf '\n   \033[31m[x] %s\033[0m\n\n' "$1"; exit 1; }

os="$(uname -s)"
case "$os" in
  Darwin*) platform="darwin" ;;
  Linux*)  platform="linux" ;;
  *) fail "Unsupported OS: $os" ;;
esac

case "$(uname -m)" in
  x86_64|amd64) arch="x64" ;;
  arm64|aarch64) arch="arm64" ;;
  *) fail "Unsupported CPU architecture: $(uname -m)" ;;
esac

command -v curl >/dev/null 2>&1 || fail "curl is required but was not found."
command -v unzip >/dev/null 2>&1 || fail "unzip is required but was not found."

printf '\n'
printf '   ============================================================\n'
printf '        A R E N A   S H E L L   ::   self-installing launcher\n'
printf '   ============================================================\n\n'
printf '   repo : %s\n' "$REPO"
printf '   ref  : %s\n' "$REF"
printf '   into : %s\n\n' "$INSTALL_DIR"

APP_DIR="$INSTALL_DIR/app"
DATA_DIR="$APP_DIR/data"
RUNTIME="$INSTALL_DIR/electron"
CACHE="$INSTALL_DIR/cache"
mkdir -p "$CACHE"

# ---------------------------------------------------------------- helpers ---
# Cheap update check: compare the tip commit with the one we installed.
remote_sha() {
  [ -n "$OFFLINE" ] && return 0
  curl -fsSL -H 'Accept: application/vnd.github+json' -H 'User-Agent: ArenaShell' \
    "https://api.github.com/repos/$REPO/commits/$REF" 2>/dev/null \
    | sed -n 's/.*"sha"[[:space:]]*:[[:space:]]*"\([0-9a-f]\{40\}\)".*/\1/p' | head -1
}

# ------------------------------------------------------------------ source ---
need_source=""
[ -n "$FORCE" ] && need_source=1
[ -f "$APP_DIR/electron/main.js" ] || need_source=1

if [ -z "$need_source" ]; then
  installed_ref="$(cat "$INSTALL_DIR/.ref" 2>/dev/null || true)"
  if [ "$installed_ref" != "$REF" ]; then
    step "ref changed ('$installed_ref' -> '$REF'), re-downloading"
    need_source=1
  else
    rsha="$(remote_sha || true)"
    lsha="$(cat "$INSTALL_DIR/.sha" 2>/dev/null || true)"
    if [ -n "$rsha" ] && [ -n "$lsha" ] && [ "$rsha" != "$lsha" ]; then
      step "update available (${lsha:0:7} -> ${rsha:0:7})"
      need_source=1
    elif [ -z "$rsha" ]; then
      ok "could not reach GitHub; using the installed copy"
    fi
  fi
fi

if [ -n "$need_source" ]; then
  [ -n "$OFFLINE" ] && fail "Nothing installed yet and ARENA_OFFLINE is set."
  step "downloading app source from GitHub..."
  tmp_zip="$CACHE/src-$$.zip"
  curl -fL --retry 3 --progress-bar "https://codeload.github.com/$REPO/zip/$REF" -o "$tmp_zip" \
    || fail "Could not download the app source from codeload.github.com"
  ok "source downloaded ($(( $(wc -c < "$tmp_zip") / 1024 )) KB)"

  step "unpacking..."
  tmp_dir="$CACHE/src-$$"
  rm -rf "$tmp_dir"; mkdir -p "$tmp_dir"
  unzip -q "$tmp_zip" -d "$tmp_dir"
  rm -f "$tmp_zip"
  # codeload nests everything under <repo>-<ref>/. Require the real app, not
  # merely "some directory".
  inner=""
  for candidate in "$tmp_dir"/*/; do
    if [ -f "${candidate}package.json" ] && [ -f "${candidate}electron/main.js" ]; then
      inner="${candidate%/}"
      break
    fi
  done
  [ -n "$inner" ] || fail "The downloaded archive does not look like Arena Shell (no package.json + electron/main.js)."
  rm -rf "$APP_DIR"
  mkdir -p "$INSTALL_DIR"
  mv "$inner" "$APP_DIR"
  rm -rf "$tmp_dir"
  printf '%s' "$REF" > "$INSTALL_DIR/.ref"
  rsha="$(remote_sha || true)"
  [ -n "$rsha" ] && printf '%s' "$rsha" > "$INSTALL_DIR/.sha"
  ok "source installed"
else
  ok "app source is up to date (set ARENA_FORCE=1 to re-download)"
fi

# ---------------------------------------------------------------- runtime ---
# Take the Electron version from the app's own package.json so the two match.
ver="${ARENA_ELECTRON_VERSION:-}"
# Pin first appears in package.json; the lockfile's resolved entry is the
# fallback (its root entry would otherwise report a range like ^33.2.0).
if [ -z "$ver" ] && [ -f "$APP_DIR/package.json" ]; then
  ver="$(sed -n 's/.*"electron"[[:space:]]*:[[:space:]]*"[^0-9]*\([0-9][0-9.]*\).*/\1/p' "$APP_DIR/package.json" | head -1)"
fi
if [ -z "$ver" ] && [ -f "$APP_DIR/package-lock.json" ]; then
  ver="$(tr -d '\n' < "$APP_DIR/package-lock.json" \
    | sed -n 's/.*"node_modules\/electron"[[:space:]]*:[[:space:]]*{[^}]*"version"[[:space:]]*:[[:space:]]*"\([0-9][0-9.]*\)".*/\1/p' \
    | head -1)"
fi
[ -n "$ver" ] || ver="33.4.11"

need_runtime=""
[ -n "$FORCE" ] && need_runtime=1
[ -x "$RUNTIME/electron" ] || [ -d "$RUNTIME/Electron.app" ] || need_runtime=1

if [ -n "$need_runtime" ]; then
  zip_name="electron-v$ver-$platform-$arch.zip"
  zip_path="$CACHE/$zip_name"
  if [ -f "$zip_path" ]; then
    ok "using cached Electron $ver"
  else
    step "downloading Electron $ver (~110 MB, one time)..."
    curl -fL --retry 5 --retry-delay 2 --retry-all-errors --connect-timeout 30 \
      --progress-bar \
      "https://github.com/electron/electron/releases/download/v$ver/$zip_name" -o "$zip_path" \
      || fail "Could not download the Electron runtime (~110 MB).
       Check your connection, or behind a proxy run:
         export HTTPS_PROXY=http://host:port
       You can also pre-place the zip at:
         $zip_path
       and run this script again."
    ok "runtime downloaded ($(( $(wc -c < "$zip_path") / 1024 / 1024 )) MB)"
  fi
  step "unpacking runtime..."
  rm -rf "$RUNTIME"; mkdir -p "$RUNTIME"
  unzip -q "$zip_path" -d "$RUNTIME"
  if [ "$platform" = "darwin" ]; then
    xattr -dr com.apple.quarantine "$RUNTIME/Electron.app" 2>/dev/null || true
  else
    chmod +x "$RUNTIME/electron" 2>/dev/null || true
  fi
  ok "runtime installed"
else
  ok "Electron $ver is up to date"
fi

# --------------------------------------------------------------- settings ---
mkdir -p "$DATA_DIR"
settings_file="$DATA_DIR/shell-settings.json"
if [ ! -f "$settings_file" ]; then
  cat > "$settings_file" <<JSON
{
  "homeUrl": "$HOME_URL",
  "connections": [{ "id": "arena-agent", "name": "Arena Agent", "url": "$HOME_URL", "icon": "*" }],
  "activeConnectionId": "arena-agent",
  "theme": "arena",
  "runScriptOnStartup": false
}
JSON
  ok "first-run settings written"
fi

# ----------------------------------------------------------------- launch ---
if [ -n "$NO_LAUNCH" ]; then
  ok "install complete (not launching)"
  exit 0
fi

step "starting Arena Shell..."
if [ "$platform" = "darwin" ]; then
  exe="$RUNTIME/Electron.app/Contents/MacOS/Electron"
else
  exe="$RUNTIME/electron"
fi
[ -x "$exe" ] || fail "The runtime did not unpack correctly: $exe"

# Everything after a bare "--" is handed to the app, not to Chromium.
nohup "$exe" "$APP_DIR" -- \
  "--settings-file=$settings_file" \
  "--install-dir=$INSTALL_DIR" >"$INSTALL_DIR/launch.log" 2>&1 &

ok "Arena Shell is running."
printf '   Install folder : %s\n' "$INSTALL_DIR"
printf '   To uninstall   : delete that folder.\n\n'
