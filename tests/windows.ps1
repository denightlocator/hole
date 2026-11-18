[CmdletBinding()]
param([switch]$SmokeWindow, [switch]$TestLauncher)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$build = Join-Path $root 'build'
[void][IO.Directory]::CreateDirectory($build)
$compiler = Join-Path ([Runtime.InteropServices.RuntimeEnvironment]::GetRuntimeDirectory()) 'csc.exe'
if (-not (Test-Path -LiteralPath $compiler)) { throw 'Run this script with Windows PowerShell (powershell.exe), not PowerShell 7.' }
$sources = @(Get-ChildItem -LiteralPath (Join-Path $root 'src') -Filter '*.cs' | ForEach-Object FullName)
$common = @('/nologo', '/noconfig', '/warnaserror+', '/optimize+', '/codepage:65001', '/langversion:5', '/platform:anycpu',
    '/r:System.dll', '/r:System.Core.dll', '/r:System.Windows.Forms.dll', '/r:System.Drawing.dll')
$app = Join-Path $build 'TaskTape.exe'
$tests = Join-Path $build 'TaskTape.Tests.exe'
$portable = Join-Path $build 'TaskTape portable.exe'
& $compiler @common '/target:winexe' "/out:$app" @sources
if ($LASTEXITCODE -ne 0) { throw 'App compilation failed.' }
& $compiler @common '/target:exe' '/main:TaskTape.Tests' "/out:$tests" @sources (Join-Path $PSScriptRoot 'Tests.cs')
if ($LASTEXITCODE -ne 0) { throw 'Test compilation failed.' }
& $tests $app $portable
if ($LASTEXITCODE -ne 0) { throw 'TaskTape tests failed.' }

function Confirm-AppStarted([Diagnostics.Process]$appProcess) {
    if (-not $appProcess.WaitForInputIdle(10000)) { throw 'TaskTape did not open its window.' }
    Start-Sleep -Milliseconds 350
    if ($appProcess.HasExited) { throw 'TaskTape exited during startup.' }
}

function Stop-TestApp([Diagnostics.Process]$appProcess) {
    if (-not $appProcess.HasExited) {
        if (-not $appProcess.CloseMainWindow() -or -not $appProcess.WaitForExit(3000)) {
            $appProcess.Kill()
            $appProcess.WaitForExit()
        }
    }
}

if ($SmokeWindow) {
    foreach ($exe in @($app, $portable)) {
        $process = Start-Process -FilePath $exe -PassThru
        try { Confirm-AppStarted $process }
        finally { Stop-TestApp $process }
        Write-Host "Started and closed $exe."
    }
}

if ($TestLauncher -and (Test-Path -LiteralPath (Join-Path $root 'start.bat'))) {
    Push-Location -LiteralPath $root
    $oldAppData = $env:LOCALAPPDATA
    $env:LOCALAPPDATA = Join-Path $build ('Launcher profile [' + [guid]::NewGuid() + ']')
    try {
        $cachedTime = $null
        for ($pass = 0; $pass -lt 2; $pass++) {
            & $env:ComSpec /d /c start.bat
            if ($LASTEXITCODE -ne 0) { throw "Launcher failed on run $pass." }
            $found = @(Get-ChildItem -LiteralPath $env:LOCALAPPDATA -Filter 'TaskTape.exe' -Recurse)
            if ($found.Count -ne 1) { throw 'Launcher did not install exactly one app.' }
            if ($null -ne $cachedTime -and $found[0].LastWriteTimeUtc -ne $cachedTime) { throw 'Launcher did not reuse the installed executable.' }
            $cachedTime = $found[0].LastWriteTimeUtc
            $process = Get-Process -Name TaskTape | Where-Object Path -eq $found[0].FullName | Select-Object -First 1
            if ($null -eq $process) { throw 'Launcher did not start the installed app.' }
            try { Confirm-AppStarted $process }
            finally { Stop-TestApp $process }
        }
        Write-Host 'Launcher download, compile, launch, and cached restart passed.'
    }
    finally {
        Remove-Item -LiteralPath $env:LOCALAPPDATA -Force -Recurse -ErrorAction SilentlyContinue
        $env:LOCALAPPDATA = $oldAppData
        Pop-Location
    }
}
