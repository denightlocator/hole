<#
  Arena Shell :: bootstrap.ps1

  This script is what makes start.bat self-installing. It:
    1. downloads the app source from GitHub (codeload zip, no git needed)
    2. downloads the matching Electron runtime for this OS
    3. unpacks both into %LOCALAPPDATA%\ArenaShell
    4. writes app\data\shell-settings.json so the shell opens arena.ai/agent
    5. starts the app detached

  Everything lives in ONE folder, so removing it is a clean uninstall.

  Usage (start.bat does this for you):
    powershell -NoProfile -ExecutionPolicy Bypass -File bootstrap.ps1
    -Repo denightlocator/hole -Ref main            # or a branch / tag / sha
    -InstallDir "C:\path"                          # optional
    -Force                                         # re-download everything
    -NoLaunch                                      # install only
#>

[CmdletBinding()]
param(
  [string] $Repo       = 'denightlocator/hole',
  [string] $Ref        = 'arena/67ffee91-hole',
  [string] $InstallDir = (Join-Path $env:LOCALAPPDATA 'ArenaShell'),
  [string] $ElectronVersion = '',
  [string] $HomeUrl    = 'https://arena.ai/agent',
  [switch] $Force,
  [switch] $NoLaunch,
  [switch] $Offline,
  [switch] $Quiet
)

$ErrorActionPreference = 'Stop'
$ProgressPreference    = 'SilentlyContinue'   # massively faster Invoke-WebRequest

# ---------------------------------------------------------------- helpers ---
function Write-Step([string] $Message) {
  if (-not $Quiet) { Write-Host "   $Message" -ForegroundColor DarkGray }
}
function Write-Ok([string] $Message) {
  if (-not $Quiet) { Write-Host "   $Message" -ForegroundColor Green }
}
function Write-Warn([string] $Message) {
  Write-Host "   $Message" -ForegroundColor Yellow
}

function Fail([string] $Message, [string] $Hint) {
  Write-Host ''
  Write-Host "   [x] $Message" -ForegroundColor Red
  if ($Hint) { Write-Host "       $Hint" -ForegroundColor DarkGray }
  Write-Host ''
  exit 1
}

function Get-Remote([string] $Url, [string] $OutFile) {
  $prev = $ProgressPreference
  $ProgressPreference = 'SilentlyContinue'
  $attempts = 4
  for ($i = 1; $i -le $attempts; $i++) {
    try {
      Invoke-WebRequest -Uri $Url -OutFile $OutFile -UseBasicParsing `
        -MaximumRedirection 8 -TimeoutSec 600
      return
    } catch {
      Remove-Item $OutFile -Force -ErrorAction SilentlyContinue
      if ($i -eq $attempts) { throw }
      Write-Warn "download failed (attempt $i of $attempts), retrying..."
      Start-Sleep -Seconds (2 * $i)
    }
  }
}

function Expand-Zip([string] $Zip, [string] $Dest) {
  if (Test-Path $Dest) { Remove-Item $Dest -Recurse -Force }
  New-Item -ItemType Directory -Path $Dest -Force | Out-Null
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [System.IO.Compression.ZipFile]::ExtractToDirectory($Zip, $Dest)
}

function Get-CachedPath {
  # A usable download cache survives reinstalls and makes relaunches instant.
  if ($env:LOCALAPPDATA) {
    $cache = Join-Path $env:LOCALAPPDATA 'ArenaShellCache'
    New-Item -ItemType Directory -Path $cache -Force | Out-Null
    return $cache
  }
  return $env:TEMP
}

function Get-ElectronVersionFromPackage([string] $PackageJson) {
  if (-not (Test-Path $PackageJson)) { return $null }
  try {
    $pkg = Get-Content $PackageJson -Raw | ConvertFrom-Json
    $dep = [string] $pkg.devDependencies.electron
    # "33.4.11" / "^33.4.11" / "~33.4.11" -> "33.4.11"
    $m = [regex]::Match($dep, '\d+\.\d+\.\d+')
    if ($m.Success) { return $m.Value }
  } catch { }
  return $null
}

# ------------------------------------------------------------------ banner ---
if (-not $Quiet) {
  Write-Host ''
  Write-Host '   ============================================================' -ForegroundColor DarkCyan
  Write-Host '        A R E N A   S H E L L   ::   self-installing launcher' -ForegroundColor Cyan
  Write-Host '   ============================================================' -ForegroundColor DarkCyan
  Write-Host ''
  Write-Host "   repo : $Repo" -ForegroundColor DarkGray
  Write-Host "   ref  : $Ref" -ForegroundColor DarkGray
  Write-Host "   into : $InstallDir" -ForegroundColor DarkGray
  Write-Host ''
}

# ------------------------------------------------------------- preflight ---
if ($PSVersionTable.PSVersion.Major -lt 5) {
  Fail 'PowerShell 5 or newer is required.' 'Windows 10/11 ship with it by default.'
}
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }
$appDir  = Join-Path $InstallDir 'app'
$dataDir = Join-Path $appDir 'data'
$runtime = Join-Path $InstallDir 'electron'
$exePath = Join-Path $runtime 'electron.exe'
$cache   = Get-CachedPath

# --------------------------------------------------------- 1. get source ---
function Get-RemoteCommit {
  # Cheap (one JSON request) way to tell whether the ref moved since last run.
  if ($Offline) { return $null }
  try {
    $api = "https://api.github.com/repos/$Repo/commits/$Ref"
    $resp = Invoke-RestMethod -Uri $api -UseBasicParsing -TimeoutSec 20 `
      -Headers @{ 'User-Agent' = 'ArenaShell-Launcher'; 'Accept' = 'application/vnd.github+json' }
    return [string] $resp.sha
  } catch {
    return $null
  }
}

$stampFile  = Join-Path $InstallDir '.ref'
$shaFile    = Join-Path $InstallDir '.sha'
$appPresent = Test-Path (Join-Path $appDir 'electron\main.js')

$needSource = $Force -or -not $appPresent
$remoteSha  = $null

if (-not $needSource) {
  if ($Offline) {
    Write-Ok 'offline mode: using the installed copy'
  } else {
    $currentRef = if (Test-Path $stampFile) { (Get-Content $stampFile -Raw).Trim() } else { '' }
    if ($currentRef -ne $Ref) {
      Write-Step "ref changed ('$currentRef' -> '$Ref'), re-downloading source"
      $needSource = $true
    } else {
      $remoteSha = Get-RemoteCommit
      $localSha  = if (Test-Path $shaFile) { (Get-Content $shaFile -Raw).Trim() } else { '' }
      if ($remoteSha -and $localSha -and ($remoteSha -ne $localSha)) {
        Write-Step "update available ($($localSha.Substring(0,7)) -> $($remoteSha.Substring(0,7)))"
        $needSource = $true
      } elseif (-not $remoteSha) {
        Write-Ok 'could not reach GitHub; using the installed copy'
      }
    }
  }
}

if ($needSource) {
  if ($Offline) { Fail 'Nothing is installed yet and -Offline was set.' 'Run once without -Offline.' }

  $zip = Join-Path $cache "arena-shell-src-$([guid]::NewGuid().ToString('N')).zip"
  $zipUrl = "https://codeload.github.com/$Repo/zip/$Ref"
  Write-Step 'downloading app source from GitHub...'
  try {
    Get-Remote -Url $zipUrl -OutFile $zip
  } catch {
    Fail 'Could not download the app source.' "URL: $zipUrl`n       Check your connection, or that the repo/ref exists."
  }
  $sizeMb = [math]::Round((Get-Item $zip).Length / 1MB, 1)
  Write-Ok "source downloaded ($sizeMb MB)"

  Write-Step 'unpacking...'
  $tmpDir = Join-Path $cache 'src-unpack'
  Expand-Zip -Zip $zip -Dest $tmpDir
  Remove-Item $zip -Force -ErrorAction SilentlyContinue

  # codeload nests everything under <repo>-<ref>/. Verify it is really the app
  # instead of trusting "the first folder in the zip".
  $inner = Get-ChildItem $tmpDir -Directory | Where-Object {
    (Test-Path (Join-Path $_.FullName 'package.json')) -and
    (Test-Path (Join-Path $_.FullName 'electron\main.js'))
  } | Select-Object -First 1
  if (-not $inner) {
    Fail 'The download did not look like Arena Shell.' 'Expected package.json + electron/main.js in the archive.'
  }

  # Keep the launcher's own files next to the app so re-running start.bat always
  # uses the copy the user actually has.
  if (Test-Path $appDir) { Remove-Item $appDir -Recurse -Force -ErrorAction SilentlyContinue }
  New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
  Move-Item $inner.FullName $appDir
  Remove-Item $tmpDir -Recurse -Force -ErrorAction SilentlyContinue

  Set-Content -Path $stampFile -Value $Ref -NoNewline
  if (-not $remoteSha) { $remoteSha = Get-RemoteCommit }
  if ($remoteSha) { Set-Content -Path $shaFile -Value $remoteSha -NoNewline }
  Write-Ok 'source installed'
} else {
  Write-Ok 'app source is up to date (use -Force to re-download)'
}

# ------------------------------------------------------ 2. get electron -----
$ver = if ($ElectronVersion) { $ElectronVersion } else { Get-ElectronVersionFromPackage (Join-Path $appDir 'package.json') }
if (-not $ver) { $ver = '33.4.11' }

$needRuntime = $Force -or -not (Test-Path $exePath)
if (-not $needRuntime -and (Test-Path $exePath)) {
  # The exe records its own version; skip the download when it matches.
  $existing = (Get-Item $exePath).VersionInfo.ProductVersion
  if ($existing -and -not $existing.StartsWith($ver)) {
    Write-Step "electron $existing != $ver, upgrading"
    $needRuntime = $true
  }
}

if ($needRuntime) {
  $eZip = Join-Path $cache "electron-v$ver-win32-$arch.zip"
  $eUrl = "https://github.com/electron/electron/releases/download/v$ver/electron-v$ver-win32-$arch.zip"

  if ((Test-Path $eZip) -and ((Get-Item $eZip).Length -gt 50MB)) {
    Write-Ok "using cached Electron $ver"
  } else {
    Write-Step "downloading Electron $ver (~110 MB, one time)…"
    try {
      Get-Remote -Url $eUrl -OutFile $eZip
    } catch {
      Fail 'Could not download the Electron runtime (~110 MB).' @"
URL: $eUrl
       Check your connection. Behind a proxy:

         `$env:HTTPS_PROXY = 'http://host:port'

       Or download the zip yourself, drop it here, and run start.bat again:

         $eZip
"@
    }
    $eMb = [math]::Round((Get-Item $eZip).Length / 1MB, 1)
    Write-Ok "runtime downloaded ($eMb MB)"
  }

  Write-Step 'unpacking runtime…'
  Expand-Zip -Zip $eZip -Dest $runtime
  if (-not (Test-Path $exePath)) { Fail "The runtime unpacked but electron.exe is missing." 'Try again with -Force.' }
  Write-Ok 'runtime installed'
} else {
  Write-Ok "Electron $ver is up to date"
}

# --------------------------------------------------- 3. seed the settings ---
New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
$settingsFile = Join-Path $dataDir 'shell-settings.json'
if (-not (Test-Path $settingsFile)) {
  $seed = [ordered]@{
    homeUrl           = $HomeUrl
    connections       = @(
      [ordered]@{ id = 'arena-agent'; name = 'Arena Agent'; url = $HomeUrl; icon = '*' }
    )
    activeConnectionId = 'arena-agent'
    theme             = 'arena'
    runScriptOnStartup = $false   # the launcher already ran this batch file
  }
  $seed | ConvertTo-Json -Depth 6 | Set-Content -Path $settingsFile -Encoding UTF8
  Write-Ok 'first-run settings written'
}

# -------------------------------------------------------- 4. launch app -----
# Arguments go AFTER a "--" so Electron treats them as app arguments, not
# Chromium switches.
$appArgs = @(
  "`"$appDir`""
  '--'
  "--settings-file=`"$settingsFile`""
  "--install-dir=`"$InstallDir`""
)

if ($NoLaunch) {
  Write-Ok 'install complete (not launching, -NoLaunch was set)'
  Write-Host ''
  exit 0
}

Write-Step 'starting Arena Shell…'
try {
  Start-Process -FilePath $exePath -ArgumentList $appArgs -WorkingDirectory $appDir | Out-Null
} catch {
  Fail "Could not start the app." $_.Exception.Message
}

Write-Host ''
Write-Ok 'Arena Shell is running.'
Write-Host "   Install folder : $InstallDir" -ForegroundColor DarkGray
Write-Host "   To uninstall   : delete that folder." -ForegroundColor DarkGray
Write-Host ''
exit 0
