@echo off
setlocal enabledelayedexpansion
title Arena Shell - launcher

REM ===========================================================================
REM  A R E N A   S H E L L
REM ---------------------------------------------------------------------------
REM  This is the ONLY file you need. Double-click it. It will:
REM
REM    1. fetch the app from GitHub            (~3 MB, skipped when unchanged)
REM    2. fetch the Electron runtime          (~110 MB, one time)
REM    3. install into  %LOCALAPPDATA%\ArenaShell
REM    4. launch the app
REM
REM  Run it again any time - it updates itself when the repo has new commits.
REM  Uninstall: delete %LOCALAPPDATA%\ArenaShell
REM ===========================================================================

set "ARENA_REPO=denightlocator/hole"
set "ARENA_REF=arena/67ffee91-hole"

REM ---- optional overrides (leave blank for defaults) ------------------------
set "ARENA_HOME_URL="
set "ARENA_INSTALL_DIR="
set "ARENA_FORCE="
set "ARENA_OFFLINE="

REM ===========================================================================
echo.
echo   ============================================================
echo        A R E N A   S H E L L   ^|   launcher
echo   ============================================================
echo.

where powershell >nul 2>nul
if errorlevel 1 (
  echo   [x] PowerShell was not found on PATH.
  echo       Windows 10/11 include it by default.
  echo.
  pause
  exit /b 1
)

REM ---- the bootstrap does the real work ------------------------------------
set "BOOTSTRAP=%~dp0bootstrap.ps1"

if not exist "%BOOTSTRAP%" (
  echo   Fetching bootstrap.ps1...
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ProgressPreference='SilentlyContinue';" ^
    "$z=Join-Path $env:TEMP 'arena-shell-src.zip';" ^
    "$d=Join-Path $env:TEMP 'arena-shell-src';" ^
    "try {" ^
    "  Invoke-WebRequest -UseBasicParsing -Uri 'https://codeload.github.com/%ARENA_REPO%/zip/%ARENA_REF%' -OutFile $z;" ^
    "  if (Test-Path $d) { Remove-Item $d -Recurse -Force };" ^
    "  Add-Type -AssemblyName System.IO.Compression.FileSystem;" ^
    "  [System.IO.Compression.ZipFile]::ExtractToDirectory($z, $d);" ^
    "  $f = Get-ChildItem $d -Recurse -Filter bootstrap.ps1 | Select-Object -First 1;" ^
    "  Copy-Item $f.FullName '%BOOTSTRAP%' -Force;" ^
    "  Write-Host '   bootstrap.ps1 fetched'" ^
    "} catch { Write-Host ('   [x] ' + $_.Exception.Message); exit 1 }"

  if errorlevel 1 (
    echo.
    echo   [x] Could not fetch bootstrap.ps1.
    echo       Put bootstrap.ps1 next to start.bat and try again.
    echo.
    pause
    exit /b 1
  )
)

set "PS_ARGS=-NoProfile -ExecutionPolicy Bypass -File "%BOOTSTRAP%" -Repo "%ARENA_REPO%" -Ref "%ARENA_REF%""
if defined ARENA_HOME_URL    set "PS_ARGS=!PS_ARGS! -HomeUrl "%ARENA_HOME_URL%""
if defined ARENA_INSTALL_DIR set "PS_ARGS=!PS_ARGS! -InstallDir "%ARENA_INSTALL_DIR%""
if defined ARENA_FORCE       set "PS_ARGS=!PS_ARGS! -Force"
if defined ARENA_OFFLINE     set "PS_ARGS=!PS_ARGS! -Offline"

powershell %PS_ARGS%

if errorlevel 1 (
  echo.
  echo   [x] Setup did not finish. The messages above should say why.
  echo.
  pause
  exit /b 1
)

echo.
echo   Done. This window closes in 3 seconds.
timeout /t 3 /nobreak >nul
endlocal & exit /b 0
