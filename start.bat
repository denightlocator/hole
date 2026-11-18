@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem TaskTape: free Windows macro recorder. Source: github.com/denightlocator/hole
rem First run downloads and checks a fixed source version; later runs reuse it.
title TaskTape
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -NonInteractive -Command ^
  "$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue';" ^
  "$version = '492dbe083dc9a400acf906affc4e158796da387f';" ^
  "$hashes = [ordered]@{ 'Engine.cs' = '0b7a9a1f09596603548f9d7f711d5510aa804b2a4fe861ff317497b83152b54f'; 'Macro.cs' = 'ea7f7bc26370efec8cd944f7624100e7d4ae8e930b718120d7943e5e7cd993d6'; 'NativeInput.cs' = '0aede13032681c68e835db891cb76ef8c8516e5e255e0a28d558e13ab6c87bd1'; 'TaskTape.cs' = '0ed33a9d2ee59dd391fa3429dca6f579cea2bfc3f8029707d55f37c591e54a6a' };" ^
  "try {" ^
  "  if (-not $env:LOCALAPPDATA) { throw 'Windows did not supply LOCALAPPDATA.' };" ^
  "  $dir = [IO.Path]::Combine($env:LOCALAPPDATA, 'TaskTape', ('app-' + $version));" ^
  "  $exe = Join-Path $dir 'TaskTape.exe';" ^
  "  if (-not [IO.File]::Exists($exe)) {" ^
  "    Write-Host 'Downloading TaskTape from GitHub (first run)...';" ^
  "    $compiler = Join-Path ([Runtime.InteropServices.RuntimeEnvironment]::GetRuntimeDirectory()) 'csc.exe';" ^
  "    if (-not [IO.File]::Exists($compiler)) { throw 'The Windows .NET Framework compiler is missing. Use an up-to-date Windows 10 or 11 PC.' };" ^
  "    $stage = Join-Path $dir ([Guid]::NewGuid().ToString('N'));" ^
  "    [void][IO.Directory]::CreateDirectory($stage);" ^
  "    try {" ^
  "      [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12;" ^
  "      $base = 'https://raw.githubusercontent.com/denightlocator/hole/' + $version + '/src/';" ^
  "      $sources = @(); foreach ($name in $hashes.Keys) {" ^
  "        $file = Join-Path $stage $name;" ^
  "        Invoke-WebRequest -Uri ($base + $name) -OutFile $file -UseBasicParsing -TimeoutSec 30;" ^
  "        if ((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash -ne $hashes[$name]) { throw ('Download failed its integrity check: ' + $name) };" ^
  "        $sources += $file;" ^
  "      };" ^
  "      Write-Host 'Building TaskTape...';" ^
  "      $built = Join-Path $stage 'TaskTape.exe';" ^
  "      & $compiler /nologo /noconfig /warnaserror+ /optimize+ /codepage:65001 /langversion:5 /platform:anycpu /target:winexe /r:System.dll /r:System.Core.dll /r:System.Windows.Forms.dll /r:System.Drawing.dll ('/out:' + $built) @sources;" ^
  "      if ($LASTEXITCODE -ne 0 -or -not [IO.File]::Exists($built)) { throw 'Windows could not build TaskTape.' };" ^
  "      try { [IO.File]::Move($built, $exe) } catch [IO.IOException] { if (-not [IO.File]::Exists($exe)) { throw } };" ^
  "    } finally { Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue };" ^
  "  };" ^
  "  Start-Process -FilePath $exe -WorkingDirectory $dir;" ^
  "} catch { Write-Host ('TaskTape could not start: ' + $_.Exception.Message) -ForegroundColor Red; exit 1 }; exit 0"
if errorlevel 1 (
  echo.
  echo Check the message above and make sure GitHub is reachable on Windows 10 or 11.
  pause
  exit /b 1
)
exit /b 0
