@echo off
setlocal enabledelayedexpansion
title Arena Shell - startup script

REM ============================================================
REM  Arena Shell :: start.bat
REM ------------------------------------------------------------
REM  This is the script Arena Shell runs when it boots (and
REM  every time you press "Restart script" in Settings).
REM
REM  Put anything you like in here: start a local server, set
REM  environment variables, launch a proxy, pre-warm a cache...
REM  The app does not wait for it to finish unless you tell it
REM  to. Edit freely, it is yours.
REM ============================================================

echo.
echo   ==========================================
echo      A R E N A   S H E L L   ^|   start.bat
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
