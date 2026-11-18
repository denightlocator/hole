@echo off
setlocal
cd /d "%~dp0"
set "PY=py -3"
py -3 -c "import sys;assert sys.version_info >= (3,8)" >nul 2>&1 && goto python_ready
set "PY=python"
python -c "import sys;assert sys.version_info >= (3,8)" >nul 2>&1 && goto python_ready
echo Installing Python with Windows Package Manager...
winget install -e --id Python.Python.3.12 --scope user --accept-source-agreements --accept-package-agreements || goto fail
set "PY="%LocalAppData%\Programs\Python\Python312\python.exe""
:python_ready
where ollama >nul 2>&1 && goto model
if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" goto add_path
echo Installing Ollama for local inference...
winget install -e --id Ollama.Ollama --accept-source-agreements --accept-package-agreements || goto fail
:add_path
set "PATH=%LOCALAPPDATA%\Programs\Ollama;%PATH%"
:model
set "OLLAMA_HOST=127.0.0.1:11434"
ollama list >nul 2>&1 || start "Sprout model engine" /min ollama serve
%PY% -c "import subprocess,time,sys;sys.exit(0 if any(subprocess.run(['ollama','list'],capture_output=True).returncode==0 or time.sleep(1) for _ in range(30)) else 1)" || goto fail
ollama show qwen2.5:1.5b >nul 2>&1 || ollama pull qwen2.5:1.5b || goto fail
%PY% server.py || goto fail
exit /b 0
:fail
echo Sprout could not start. Check the error above. Installation needs internet and Windows App Installer (winget).
pause
exit /b 1
