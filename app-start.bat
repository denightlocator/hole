@echo off
setlocal enabledelayedexpansion
title Arena Shell - startup script

REM ============================================================
REM  Arena Shell :: app-start.bat
REM ------------------------------------------------------------
REM  Runs INSIDE the app, every time it boots (and whenever you
REM  press "Run now" in Settings -> Startup script).
REM
REM  Do NOT put the launcher here - start.bat is the launcher
REM  that downloads and updates this app. This file is for your
REM  own setup work: local servers, env vars, proxies, caches.
REM
REM  Edit freely, it is yours.
REM ============================================================

echo.
echo   ==========================================
echo      A R E N A   S H E L L   ^|   app-start.bat
echo   ==========================================
echo.

REM ---- 1. Show a little environment info ----------------------
echo   Date        : %DATE% %TIME%
echo   User        : %USERNAME%
echo   Work dir    : %CD%
echo.

REM ---- 2. Variables other tools in this folder can use -------
set "ARENA_SHELL=1"
set "ARENA_SHELL_HOME=%CD%"

REM Point this at whatever web app you want the shell to open.
if "%ARENA_SHELL_HOME_URL%"=="" set "ARENA_SHELL_HOME_URL=https://arena.ai/agent"

REM ---- 3. Optional: run a local helper if one exists ---------
if exist "%~dp0proxy.js" (
  echo   Found proxy.js - starting local proxy...
  where node >nul 2>nul
  if !ERRORLEVEL! EQU 0 (
    start "" /b node "%~dp0proxy.js"
  ) else (
    echo   [warn] node.exe not found, skipping proxy.js
  )
)

if exist "%~dp0helpers\boot.ps1" (
  echo   Found helpers\boot.ps1 - running it...
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0helpers\boot.ps1"
)

echo   Ready. Handing control back to Arena Shell.
echo.
endlocal & exit /b 0
