@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Orbit Client Jar Builder
set "ORBIT_STARTER=%~f0"
set "ORBIT_OUTPUT_BASE=%~dp0"
set "ORBIT_ERROR_REPORTED="

echo Orbit Client jar builder
echo.
echo This will download what it needs and build Orbit from source.
echo The first run can take several minutes. Please keep this window open.
echo.

set "ORBIT_POWERSHELL=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%ORBIT_POWERSHELL%" (
    set "ORBIT_POWERSHELL=powershell.exe"
    where powershell.exe >nul 2>&1
    if errorlevel 1 (
        echo ERROR: Windows PowerShell was not found.
        if /I not "%~1"=="--no-pause" pause
        exit /b 1
    )
)

"%ORBIT_POWERSHELL%" -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; try { $parts=[IO.File]::ReadAllText($env:ORBIT_STARTER) -split '(?m)^# ORBIT-STARTER-POWERSHELL\r?$',2; if ($parts.Count -ne 2) { throw 'The starter file is incomplete.' }; & ([scriptblock]::Create($parts[1])); exit 0 } catch { if ($env:ORBIT_ERROR_REPORTED -ne '1') { Write-Host ('ERROR: ' + $_.Exception.Message) -ForegroundColor Red }; exit 1 }"
set "ORBIT_RESULT=%ERRORLEVEL%"
echo.
if not "%ORBIT_RESULT%"=="0" (
    echo The build did not finish. Check the logs before using any jar in the output folder.
)
if /I not "%~1"=="--no-pause" pause
exit /b %ORBIT_RESULT%
# ORBIT-STARTER-POWERSHELL

# This PowerShell payload is part of start.bat; it does not require a separate script download.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Test-OrbitSource {
    param([string]$Directory)
    if ([string]::IsNullOrWhiteSpace($Directory) -or -not (Test-Path -LiteralPath $Directory -PathType Container)) {
        return $false
    }
    $required = @(
        'gradlew.bat',
        'gradle\wrapper\gradle-wrapper.jar',
        'gradle\wrapper\gradle-wrapper.properties',
        'gradle.properties',
        'settings.gradle',
        'build.gradle',
        'src\main\resources\fabric.mod.json',
        'src\main\resources\orbit.mixins.json',
        'src\main\resources\orbit.accesswidener',
        'src\main\java\dev\orbit\client\Orbit.java',
        'src\main\java\dev\orbit\client\mixin\ActivityClientWorldMixin.java',
        'src\main\java\dev\orbit\client\module\impl\render\ChunkActivity.java',
        'src\main\java\dev\orbit\client\module\impl\render\GeodeAge.java'
    )
    foreach ($relative in $required) {
        if (-not (Test-Path -LiteralPath (Join-Path $Directory $relative) -PathType Leaf)) {
            return $false
        }
    }
    return $true
}

function Test-Jdk21 {
    param([string]$Directory)
    if ([string]::IsNullOrWhiteSpace($Directory)) { return $false }
    try {
        # A stale JAVA_HOME may refer to a missing drive; ignore it rather than aborting discovery.
        $jdkHome = $Directory.Trim().Trim('"')
        if (-not (Test-Path -LiteralPath $jdkHome -PathType Container)) { return $false }
        $releaseFile = Join-Path $jdkHome 'release'
        if (-not (Test-Path -LiteralPath (Join-Path $jdkHome 'bin\java.exe') -PathType Leaf) -or
            -not (Test-Path -LiteralPath (Join-Path $jdkHome 'bin\javac.exe') -PathType Leaf) -or
            -not (Test-Path -LiteralPath $releaseFile -PathType Leaf)) {
            return $false
        }
        $release = Get-Content -LiteralPath $releaseFile -Raw
        return [bool]($release -match '(?m)^JAVA_VERSION="21(?:\.|["])')
    } catch {
        return $false
    }
}

function Find-Jdk21 {
    param([string]$JdkCache)
    $candidates = New-Object 'System.Collections.Generic.List[string]'
    if ($env:JAVA_HOME) { [void]$candidates.Add($env:JAVA_HOME) }
    $javac = Get-Command javac.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -ne $javac -and $javac.Source) {
        $bin = Split-Path -Parent $javac.Source
        [void]$candidates.Add((Split-Path -Parent $bin))
    }
    $roots = @($JdkCache)
    if ($env:USERPROFILE) { $roots += (Join-Path $env:USERPROFILE '.jdks') }
    if ($env:ProgramFiles) {
        $roots += (Join-Path $env:ProgramFiles 'Eclipse Adoptium')
        $roots += (Join-Path $env:ProgramFiles 'Java')
        $roots += (Join-Path $env:ProgramFiles 'Microsoft')
    }
    foreach ($root in $roots) {
        if (Test-Path -LiteralPath $root -PathType Container) {
            foreach ($item in @(Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue)) {
                [void]$candidates.Add($item.FullName)
            }
        }
    }
    foreach ($candidate in $candidates) {
        if (Test-Jdk21 $candidate) { return $candidate.Trim().Trim('"') }
    }
    return $null
}

function Get-TemurinAsset {
    param([string]$Architecture)
    $headers = @{ 'User-Agent' = 'Orbit-Jar-Builder'; 'Accept' = 'application/vnd.github+json' }
    $pattern = '^OpenJDK21U-jdk_' + [regex]::Escape($Architecture) + '_windows_hotspot_.*\.zip$'
    $api = 'https://api.github.com/repos/adoptium/temurin21-binaries/releases'
    $latest = Invoke-RestMethod -UseBasicParsing -Headers $headers -Uri ($api + '/latest') -TimeoutSec 120
    $asset = @($latest.assets | Where-Object {
        $_.name -match $pattern -and $_.digest -match '^sha256:[0-9a-fA-F]{64}$'
    } | Select-Object -First 1)
    if ($asset.Count -eq 0) {
        # Some emergency releases contain only x64 builds. Find the newest complete release for ARM.
        # Invoke-RestMethod emits a JSON array as one pipeline object on Windows PowerShell 5.1.
        # Assign it first so the individual releases are enumerated before filtering and sorting.
        $releaseList = Invoke-RestMethod -UseBasicParsing -Headers $headers -Uri ($api + '?per_page=40') -TimeoutSec 120
        $releases = @($releaseList | Where-Object { -not $_.draft -and -not $_.prerelease } |
            Sort-Object published_at -Descending)
        foreach ($release in $releases) {
            $asset = @($release.assets | Where-Object {
                $_.name -match $pattern -and $_.digest -match '^sha256:[0-9a-fA-F]{64}$'
            } | Select-Object -First 1)
            if ($asset.Count -gt 0) { break }
        }
    }
    if ($asset.Count -eq 0) {
        throw 'Could not find a verified Java 21 download. Install a JDK 21 in IntelliJ or set JAVA_HOME, then run start.bat again.'
    }
    return $asset[0]
}

function Install-Jdk21 {
    param([string]$JdkCache)
    if (-not [Environment]::Is64BitOperatingSystem) {
        throw 'The automatic Java download requires 64-bit Windows.'
    }
    $machine = $env:PROCESSOR_ARCHITEW6432
    if (-not $machine) { $machine = $env:PROCESSOR_ARCHITECTURE }
    $architecture = switch -Regex ($machine) {
        '^AMD64$' { 'x64'; break }
        '^ARM64$' { 'aarch64'; break }
        default { throw "Unsupported Windows processor architecture: $machine" }
    }
    Write-Host 'Java 21 was not found. Looking up the official Eclipse Temurin JDK...'
    $asset = Get-TemurinAsset $architecture
    $url = [Uri]$asset.browser_download_url
    if ($url.Scheme -ne 'https' -or $url.Host -ne 'github.com' -or
        -not $url.AbsolutePath.StartsWith('/adoptium/temurin21-binaries/releases/download/')) {
        throw 'The JDK download URL was not an official Temurin GitHub release.'
    }
    $expectedHash = $asset.digest.Substring(7)
    [void](New-Item -ItemType Directory -Path $JdkCache -Force)
    $stage = Join-Path $JdkCache ('.install-' + [guid]::NewGuid().ToString('N'))
    [void](New-Item -ItemType Directory -Path $stage)
    try {
        $zip = Join-Path $stage 'jdk.zip'
        Write-Host ('Downloading Java 21 (approximately {0} MB)...' -f [math]::Round($asset.size / 1048576))
        Invoke-WebRequest -UseBasicParsing -Uri $url.AbsoluteUri -OutFile $zip -TimeoutSec 1800
        $actualHash = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash
        if (-not [string]::Equals($actualHash, $expectedHash, [StringComparison]::OrdinalIgnoreCase)) {
            throw 'The Java download did not match its official SHA-256 checksum.'
        }
        Write-Host 'Java checksum verified. Extracting the JDK...'
        $extracted = Join-Path $stage 'extracted'
        Expand-Archive -LiteralPath $zip -DestinationPath $extracted
        $unpackedHome = $null
        if (Test-Jdk21 $extracted) { $unpackedHome = $extracted }
        if (-not $unpackedHome) {
            foreach ($item in @(Get-ChildItem -LiteralPath $extracted -Directory)) {
                if (Test-Jdk21 $item.FullName) { $unpackedHome = $item.FullName; break }
            }
        }
        if (-not $unpackedHome) { throw 'The downloaded archive did not contain a complete JDK 21.' }
        $destination = Join-Path $JdkCache ('temurin-21-' + [guid]::NewGuid().ToString('N'))
        Move-Item -LiteralPath $unpackedHome -Destination $destination
        if (-not (Test-Jdk21 $destination)) { throw 'The extracted JDK could not be verified.' }
        return $destination
    } finally {
        Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue
    }
}

function Get-OrbitSource {
    param([string]$Scratch)
    [void](New-Item -ItemType Directory -Path $Scratch)
    $urls = @(
        'https://codeload.github.com/denightlocator/hole/zip/refs/heads/arena/7c4bcf9d-hole',
        'https://codeload.github.com/denightlocator/hole/zip/refs/heads/main'
    )
    $attempt = 0
    foreach ($url in $urls) {
        $attempt++
        $zip = Join-Path $Scratch ("source-$attempt.zip")
        $unpacked = Join-Path $Scratch ("source-$attempt")
        try {
            Write-Host 'Downloading the Orbit source from GitHub...'
            Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $zip -TimeoutSec 1200
            Expand-Archive -LiteralPath $zip -DestinationPath $unpacked
            foreach ($directory in @(Get-ChildItem -LiteralPath $unpacked -Directory)) {
                if (Test-OrbitSource $directory.FullName) { return $directory.FullName }
            }
            throw 'The download did not contain the combined Orbit client source.'
        } catch {
            Write-Host ('Source download could not be used: ' + $_.Exception.Message)
        }
    }
    throw 'Could not download the combined Orbit source. Check your Internet connection and try again.'
}

function Get-GradleProperty {
    param([string]$File, [string]$Name)
    $pattern = '^\s*' + [regex]::Escape($Name) + '\s*=\s*([A-Za-z0-9._+-]+)\s*$'
    foreach ($line in (Get-Content -LiteralPath $File)) {
        $match = [regex]::Match($line, $pattern)
        if ($match.Success) { return $match.Groups[1].Value }
    }
    throw "Could not read $Name from gradle.properties."
}

function Test-OrbitJar {
    param([string]$Jar, [string]$ExpectedVersion)
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [System.IO.Compression.ZipFile]::OpenRead($Jar)
    try {
        $required = @(
            'fabric.mod.json',
            'orbit.mixins.json',
            'orbit.accesswidener',
            'dev/orbit/client/Orbit.class',
            'dev/orbit/client/mixin/ActivityClientWorldMixin.class',
            'dev/orbit/client/module/impl/render/ChunkActivity.class',
            'dev/orbit/client/module/impl/render/GeodeAge.class'
        )
        foreach ($entry in $required) {
            if ($null -eq $archive.GetEntry($entry)) { throw "The built jar is missing $entry." }
        }
        $reader = [System.IO.StreamReader]::new($archive.GetEntry('fabric.mod.json').Open())
        try { $metadata = $reader.ReadToEnd() | ConvertFrom-Json } finally { $reader.Dispose() }
        if ($metadata.id -ne 'orbit' -or $metadata.environment -ne 'client' -or
            $metadata.version -ne $ExpectedVersion -or $metadata.accessWidener -ne 'orbit.accesswidener' -or
            'orbit.mixins.json' -notin $metadata.mixins -or
            'dev.orbit.client.Orbit' -notin $metadata.entrypoints.client) {
            throw 'The built jar has unexpected Orbit mod metadata.'
        }
    } finally {
        $archive.Dispose()
    }
}

# ORBIT-STARTER-MAIN
$sourceScratch = $null
$transcriptStarted = $false
$outputDir = Join-Path ([IO.Path]::GetFullPath($env:ORBIT_OUTPUT_BASE)) 'Orbit-Client'
$sessionLog = Join-Path $outputDir 'starter.log'
$gradleLog = Join-Path $outputDir 'gradle-build.log'
try {
    [void](New-Item -ItemType Directory -Path $outputDir -Force)
    try {
        Start-Transcript -LiteralPath $sessionLog -Force | Out-Null
        $transcriptStarted = $true
    } catch {
        Write-Host ('Could not create the starter log: ' + $_.Exception.Message)
    }
    Write-Host ("Output folder: " + $outputDir)
    # Do not leave an older Gradle log looking like the result of this run.
    if (Test-Path -LiteralPath $gradleLog -PathType Leaf) {
        Remove-Item -LiteralPath $gradleLog -Force
    }
    $project = [IO.Path]::GetFullPath($env:ORBIT_OUTPUT_BASE)
    if (Test-OrbitSource $project) {
        Write-Host 'Using the Orbit source next to start.bat.'
    } else {
        $sourceScratch = Join-Path ([IO.Path]::GetTempPath()) ('orbit-source-' + [guid]::NewGuid().ToString('N'))
        $project = Get-OrbitSource $sourceScratch
    }
    $localAppData = [Environment]::GetFolderPath('LocalApplicationData')
    if ([string]::IsNullOrWhiteSpace($localAppData)) { throw 'Cannot find the Windows LocalAppData folder.' }
    $jdkCache = Join-Path $localAppData 'OrbitBuilder\jdks'
    $jdk = Find-Jdk21 $jdkCache
    if (-not $jdk) { $jdk = Install-Jdk21 $jdkCache }
    $env:JAVA_HOME = $jdk
    $env:PATH = (Join-Path $jdk 'bin') + ';' + $env:PATH
    Write-Host ("Using Java 21: " + $jdk)
    Write-Host 'Building the Fabric client. Gradle will download its dependencies on the first run...'
    Write-Host ("Build log: " + $gradleLog)

    $previousErrorAction = $ErrorActionPreference
    Push-Location -LiteralPath $project
    try {
        # Native tools write some normal progress to stderr. Capture both streams without treating
        # stderr itself as a failure; the Gradle process exit code remains authoritative.
        $ErrorActionPreference = 'Continue'
        # Native processes set the global automatic variable, even when this payload runs in a
        # child scriptblock scope. Do not shadow it with a local $LASTEXITCODE.
        $global:LASTEXITCODE = 1
        & (Join-Path $project 'gradlew.bat') --no-daemon build --stacktrace 2>&1 |
            Tee-Object -LiteralPath $gradleLog
        $gradleExit = $global:LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorAction
        Pop-Location
    }
    if ($gradleExit -ne 0) { throw "Gradle failed. See $gradleLog for details." }

    $properties = Join-Path $project 'gradle.properties'
    $baseName = Get-GradleProperty $properties 'archives_base_name'
    $version = Get-GradleProperty $properties 'mod_version'
    $builtJar = Join-Path $project ("build\libs\$baseName-$version.jar")
    if (-not (Test-Path -LiteralPath $builtJar -PathType Leaf)) {
        throw "Gradle reported success but did not produce the expected remapped jar: $builtJar"
    }
    Test-OrbitJar $builtJar $version
    $destination = Join-Path $outputDir ("$baseName-$version.jar")
    $pending = Join-Path $outputDir ('.orbit-' + [guid]::NewGuid().ToString('N') + '.tmp')
    try {
        Copy-Item -LiteralPath $builtJar -Destination $pending
        $sourceHash = (Get-FileHash -LiteralPath $builtJar -Algorithm SHA256).Hash
        $copyHash = (Get-FileHash -LiteralPath $pending -Algorithm SHA256).Hash
        if ($sourceHash -ne $copyHash) { throw 'The copied jar did not match the built file.' }
        Move-Item -LiteralPath $pending -Destination $destination -Force
    } finally {
        Remove-Item -LiteralPath $pending -Force -ErrorAction SilentlyContinue
    }
    Write-Host ''
    Write-Host 'SUCCESS - Orbit jar created:' -ForegroundColor Green
    Write-Host $destination
    Write-Host ('SHA-256: ' + $copyHash)
    Write-Host 'Use it with Minecraft 1.21.11, Fabric Loader 0.17.3+ and Fabric API 0.141.6+1.21.11.'
    Write-Host 'Copy the jar into your Minecraft instance mods folder. Do not install the companion alongside it.'
    if ($env:ORBIT_NO_OPEN -ne '1') {
        try { Invoke-Item -LiteralPath $outputDir } catch { Write-Host 'Open the output folder above to find the jar.' }
    }
} catch {
    Write-Host ''
    Write-Host ('ERROR: ' + $_.Exception.Message) -ForegroundColor Red
    Write-Host ('Troubleshooting logs, if created: ' + $outputDir)
    $env:ORBIT_ERROR_REPORTED = '1'
    throw
} finally {
    if ($sourceScratch -and (Test-Path -LiteralPath $sourceScratch)) {
        Remove-Item -LiteralPath $sourceScratch -Recurse -Force -ErrorAction SilentlyContinue
    }
    if ($transcriptStarted) {
        try { Stop-Transcript | Out-Null } catch { }
    }
}
