@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "SPROUT_HOME=%LOCALAPPDATA%\Sprout\desktop-v5"
for %%F in (run-sprout.bat server.py desktop.py study.py) do if not exist "%SPROUT_HOME%\%%F" goto install
goto launch

:install
echo Downloading Sprout from denightlocator/hole on GitHub...
powershell.exe -NoLogo -NoProfile -NonInteractive -Command ^
 "$ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; $tmp=Join-Path ([IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString()); try { New-Item -ItemType Directory -Path $tmp | Out-Null; $zip=Join-Path $tmp 'source.zip'; Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/denightlocator/hole/archive/refs/heads/arena/e00e47c7-hole.zip' -OutFile $zip; Expand-Archive -LiteralPath $zip -DestinationPath $tmp; $root=(Get-ChildItem -LiteralPath $tmp -Directory | Select-Object -First 1).FullName; $files=@('server.py','desktop.py','study.py','README.md','run-sprout.bat'); foreach($f in $files){if(!(Test-Path -LiteralPath (Join-Path $root $f) -PathType Leaf)){throw ('Missing file: '+$f)}}; [IO.Directory]::CreateDirectory($env:SPROUT_HOME) | Out-Null; foreach($f in $files){Copy-Item -LiteralPath (Join-Path $root $f) -Destination $env:SPROUT_HOME -Force} } finally { if(Test-Path -LiteralPath $tmp){Remove-Item -LiteralPath $tmp -Recurse -Force} }"
if errorlevel 1 goto failed
:launch
call "%SPROUT_HOME%\run-sprout.bat"
exit /b %errorlevel%
:failed
echo Could not install Sprout from GitHub. Check your connection and repository access, then retry.
pause
exit /b 1
