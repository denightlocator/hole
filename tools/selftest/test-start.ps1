# Run on 64-bit Windows with: powershell -NoProfile -ExecutionPolicy Bypass -File tools/selftest/test-start.ps1
# Exercises the starter with local fixtures only; it does not download a JDK or build Minecraft.
$ErrorActionPreference = 'Stop'
$repository = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$starter = Join-Path $repository 'start.bat'
$contents = [IO.File]::ReadAllText($starter)
$parts = $contents -split '(?m)^# ORBIT-STARTER-POWERSHELL\r?$', 2
if ($parts.Count -ne 2) { throw 'PowerShell payload marker not found.' }
$payload = $parts[1] -split '(?m)^# ORBIT-STARTER-MAIN\r?$', 2
if ($payload.Count -ne 2) { throw 'PowerShell main marker not found.' }
. ([scriptblock]::Create($payload[0]))
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Check {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw "FAILED: $Message" }
    Write-Host "  ok: $Message"
}
function Expect-Failure {
    param([scriptblock]$Action, [string]$Message)
    $failed = $false
    try { & $Action } catch { $failed = $true }
    Check $failed $Message
}
function New-EmptyFile {
    param([string]$Path)
    [void](New-Item -ItemType Directory -Path (Split-Path -Parent $Path) -Force)
    [IO.File]::WriteAllText($Path, 'fixture')
}
function New-FixtureJar {
    param([string]$Path, [string]$Id = 'orbit', [bool]$MissingGeode = $false)
    $contentsDir = Join-Path $script:temporary ('jar-' + [guid]::NewGuid().ToString('N'))
    [void](New-Item -ItemType Directory -Path $contentsDir)
    $entries = @(
        'fabric.mod.json', 'orbit.mixins.json', 'orbit.accesswidener',
        'dev/orbit/client/Orbit.class', 'dev/orbit/client/mixin/ActivityClientWorldMixin.class',
        'dev/orbit/client/module/impl/render/ChunkActivity.class',
        'dev/orbit/client/module/impl/render/GeodeAge.class'
    )
    foreach ($entry in $entries) {
        if ($MissingGeode -and $entry -like '*GeodeAge.class') { continue }
        $entryPath = Join-Path $contentsDir ($entry -replace '/', '\')
        New-EmptyFile $entryPath
        if ($entry -eq 'fabric.mod.json') {
            [IO.File]::WriteAllText($entryPath, ('{"id":"' + $Id + '","environment":"client","version":"0.1.0",' +
                '"accessWidener":"orbit.accesswidener","mixins":["orbit.mixins.json"],' +
                '"entrypoints":{"client":["dev.orbit.client.Orbit"]}}'))
        }
    }
    [IO.Compression.ZipFile]::CreateFromDirectory($contentsDir, $Path)
    Remove-Item -LiteralPath $contentsDir -Recurse -Force
}

$temporary = Join-Path ([IO.Path]::GetTempPath()) ('orbit-starter-test-' + [guid]::NewGuid().ToString('N'))
[void](New-Item -ItemType Directory -Path $temporary)
$oldJavaHome = $env:JAVA_HOME
$oldNoOpen = $env:ORBIT_NO_OPEN
$oldTestJar = $env:ORBIT_TEST_JAR
$oldTestFail = $env:ORBIT_TEST_FAIL
try {
    Check (-not ($contents -match '(?<!\r)\n')) 'starter has Windows line endings, including the raw download'
    $wrapperContents = [IO.File]::ReadAllText((Join-Path $repository 'gradlew.bat'))
    Check (-not ($wrapperContents -match '(?<!\r)\n')) 'Gradle wrapper has Windows line endings in source ZIPs'
    $project = Join-Path $temporary 'project with spaces [test]'
    [void](New-Item -ItemType Directory -Path $project)
    Copy-Item -LiteralPath $starter -Destination (Join-Path $project 'start.bat')
    $requiredSource = @(
        'gradlew.bat', 'gradle\wrapper\gradle-wrapper.jar', 'gradle\wrapper\gradle-wrapper.properties',
        'gradle.properties', 'settings.gradle', 'build.gradle', 'src\main\resources\fabric.mod.json',
        'src\main\resources\orbit.mixins.json', 'src\main\resources\orbit.accesswidener',
        'src\main\java\dev\orbit\client\Orbit.java',
        'src\main\java\dev\orbit\client\mixin\ActivityClientWorldMixin.java',
        'src\main\java\dev\orbit\client\module\impl\render\ChunkActivity.java',
        'src\main\java\dev\orbit\client\module\impl\render\GeodeAge.java'
    )
    foreach ($path in $requiredSource) { New-EmptyFile (Join-Path $project $path) }
    [IO.File]::WriteAllText((Join-Path $project 'gradle.properties'), "archives_base_name=orbit`r`nmod_version=0.1.0`r`n")
    Check (Test-OrbitSource $project) 'recognizes a complete source tree in a path containing spaces and brackets'
    $geodeSource = Join-Path $project 'src\main\java\dev\orbit\client\module\impl\render\GeodeAge.java'
    Remove-Item -LiteralPath $geodeSource
    Check (-not (Test-OrbitSource $project)) 'rejects a source tree missing Geode Age'
    New-EmptyFile $geodeSource
    Check ((Get-GradleProperty (Join-Path $project 'gradle.properties') 'mod_version') -eq '0.1.0') 'reads the Gradle version'
    Expect-Failure { Get-GradleProperty (Join-Path $project 'gradle.properties') 'missing' } 'rejects a missing property'

    $fakeJdk = Join-Path $temporary 'fake JDK 21'
    New-EmptyFile (Join-Path $fakeJdk 'bin\java.exe')
    New-EmptyFile (Join-Path $fakeJdk 'bin\javac.exe')
    [IO.File]::WriteAllText((Join-Path $fakeJdk 'release'), 'JAVA_VERSION="21.0.12"')
    Check (Test-Jdk21 $fakeJdk) 'recognizes a complete Java 21 JDK'
    $fakeCompiler = Join-Path $fakeJdk 'bin\javac.exe'
    Remove-Item -LiteralPath $fakeCompiler
    Check (-not (Test-Jdk21 $fakeJdk)) 'rejects a Java runtime without a compiler'
    New-EmptyFile $fakeCompiler
    [IO.File]::WriteAllText((Join-Path $fakeJdk 'release'), 'JAVA_VERSION="17.0.12"')
    Check (-not (Test-Jdk21 $fakeJdk)) 'rejects Java 17'
    [IO.File]::WriteAllText((Join-Path $fakeJdk 'release'), 'JAVA_VERSION="210.0.1"')
    Check (-not (Test-Jdk21 $fakeJdk)) 'rejects Java 210 instead of matching its prefix'
    Check (-not (Test-Jdk21 '?:\missing-jdk')) 'ignores an invalid or stale JAVA_HOME path'
    [IO.File]::WriteAllText((Join-Path $fakeJdk 'release'), 'JAVA_VERSION="21.0.12"')
    $env:JAVA_HOME = $fakeJdk
    Check ((Find-Jdk21 (Join-Path $temporary 'empty cache')) -eq $fakeJdk) 'finds JAVA_HOME without installing anything'

    $goodJar = Join-Path $temporary 'fixture.jar'
    $badJar = Join-Path $temporary 'missing-geode.jar'
    $wrongId = Join-Path $temporary 'wrong-id.jar'
    $corruptJar = Join-Path $temporary 'corrupt.jar'
    New-FixtureJar $goodJar
    New-FixtureJar $badJar 'orbit' $true
    New-FixtureJar $wrongId 'other'
    New-EmptyFile $corruptJar
    Test-OrbitJar $goodJar '0.1.0'
    Check $true 'accepts a jar with the expected Orbit classes and metadata'
    Expect-Failure { Test-OrbitJar $badJar '0.1.0' } 'rejects a jar missing Geode Age'
    Expect-Failure { Test-OrbitJar $wrongId '0.1.0' } 'rejects a jar with the wrong mod ID'
    Expect-Failure { Test-OrbitJar $goodJar '0.2.0' } 'rejects a jar with an unexpected version'
    Expect-Failure { Test-OrbitJar $corruptJar '0.1.0' } 'rejects a corrupt jar'

    # GitHub release JSON arrays are emitted as one pipeline object by Invoke-RestMethod in 5.1.
    # Return a nested array here to reproduce that behavior while checking stable ARM fallback.
    $script:releaseMode = 'fixtures'
    $script:releaseDigest = 'sha256:' + ('a' * 64)
    function Invoke-RestMethod {
        param([switch]$UseBasicParsing, $Headers, [string]$Uri, [int]$TimeoutSec)
        if ($script:releaseMode -eq 'empty') {
            if ($Uri.EndsWith('/latest')) { return [pscustomobject]@{ assets = @() } }
            return ,@()
        }
        $x64 = [pscustomobject]@{ name = 'OpenJDK21U-jdk_x64_windows_hotspot_latest.zip'; digest = $script:releaseDigest }
        if ($Uri.EndsWith('/latest')) { return [pscustomobject]@{ assets = @($x64) } }
        $old = [pscustomobject]@{ name = 'OpenJDK21U-jdk_aarch64_windows_hotspot_old.zip'; digest = $script:releaseDigest }
        $new = [pscustomobject]@{ name = 'OpenJDK21U-jdk_aarch64_windows_hotspot_new.zip'; digest = $script:releaseDigest }
        $unsigned = [pscustomobject]@{ name = 'OpenJDK21U-jdk_aarch64_windows_hotspot_unsigned.zip'; digest = $null }
        return ,@(
            [pscustomobject]@{ assets = @($old); draft = $false; prerelease = $false; published_at = '2025-01-01T00:00:00Z' },
            [pscustomobject]@{ assets = @($old); draft = $false; prerelease = $true; published_at = '2028-01-01T00:00:00Z' },
            [pscustomobject]@{ assets = @($unsigned); draft = $false; prerelease = $false; published_at = '2027-01-01T00:00:00Z' },
            [pscustomobject]@{ assets = @($new); draft = $false; prerelease = $false; published_at = '2026-01-01T00:00:00Z' }
        )
    }
    Check ((Get-TemurinAsset 'x64').name -like '*_x64_*') 'selects the latest verified x64 JDK'
    Check ((Get-TemurinAsset 'aarch64').name -like '*new.zip') 'selects the newest stable verified ARM64 JDK from a REST array'
    $script:releaseMode = 'empty'
    Expect-Failure { Get-TemurinAsset 'x64' } 'rejects a release list with no verified JDK'

    # Exercise checksum verification and source fallback with local fixture archives, not the network.
    $jdkBundle = Join-Path $temporary 'jdk bundle'
    [void](New-Item -ItemType Directory -Path $jdkBundle)
    Copy-Item -LiteralPath $fakeJdk -Destination (Join-Path $jdkBundle 'jdk-21') -Recurse
    $jdkZip = Join-Path $temporary 'jdk.zip'
    [IO.Compression.ZipFile]::CreateFromDirectory($jdkBundle, $jdkZip)
    $script:fixtureDownload = $jdkZip
    $script:fixtureMode = 'jdk'
    $script:fixtureDigest = 'sha256:' + (Get-FileHash -LiteralPath $jdkZip -Algorithm SHA256).Hash
    function Get-TemurinAsset {
        param([string]$Architecture)
        return [pscustomobject]@{
            browser_download_url = 'https://github.com/adoptium/temurin21-binaries/releases/download/test/jdk.zip'
            digest = $script:fixtureDigest
            size = (Get-Item -LiteralPath $script:fixtureDownload).Length
        }
    }
    function Invoke-WebRequest {
        param([switch]$UseBasicParsing, [string]$Uri, [string]$OutFile, [int]$TimeoutSec)
        if ($script:fixtureMode -eq 'source' -and $Uri -like '*/arena/*') { throw 'Simulated unavailable branch' }
        Copy-Item -LiteralPath $script:fixtureDownload -Destination $OutFile
    }
    $jdkCache = Join-Path $temporary 'jdk cache'
    $installed = Install-Jdk21 $jdkCache
    Check (Test-Jdk21 $installed) 'installs and verifies a local JDK fixture'
    $script:fixtureDigest = 'sha256:' + ('0' * 64)
    Expect-Failure { Install-Jdk21 $jdkCache } 'rejects a JDK with a mismatched checksum'
    Check (@(Get-ChildItem -LiteralPath $jdkCache -Directory -Force | Where-Object Name -like '.install-*').Count -eq 0) 'cleans up JDK staging directories'

    $sourceContainer = Join-Path $temporary 'source bundle'
    [void](New-Item -ItemType Directory -Path $sourceContainer)
    Copy-Item -LiteralPath $project -Destination (Join-Path $sourceContainer 'orbit-project') -Recurse
    $sourceZip = Join-Path $temporary 'source.zip'
    [IO.Compression.ZipFile]::CreateFromDirectory($sourceContainer, $sourceZip)
    $script:fixtureMode = 'source'
    $script:fixtureDownload = $sourceZip
    $sourceDownloaded = Get-OrbitSource (Join-Path $temporary 'downloaded source')
    Check (Test-OrbitSource $sourceDownloaded) 'falls back to main if the branch download fails'

    # Run the actual batch file against a fake Gradle wrapper. This validates exit codes, logging,
    # paths with spaces, output placement and preservation of the old jar on a failed rebuild.
    $wrapper = @'
@echo off
if "%ORBIT_TEST_FAIL%"=="1" (
    echo mock Gradle failure 1>&2
    exit /b 7
)
if not exist build\libs mkdir build\libs
copy /Y "%ORBIT_TEST_JAR%" build\libs\orbit-0.1.0.jar >nul
if errorlevel 1 exit /b 9
echo mock Gradle build succeeded
exit /b 0
'@
    $wrapper = $wrapper -replace '\r?\n', "`r`n"
    [IO.File]::WriteAllText((Join-Path $project 'gradlew.bat'), $wrapper, [Text.Encoding]::ASCII)
    $env:ORBIT_NO_OPEN = '1'
    $env:ORBIT_TEST_JAR = $goodJar
    $env:ORBIT_TEST_FAIL = '0'
    $savedPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & (Join-Path $project 'start.bat') --no-pause 2>&1 | Out-String | Write-Host
        $successExit = $LASTEXITCODE
    } finally { $ErrorActionPreference = $savedPreference }
    Check ($successExit -eq 0) 'batch exits successfully after a successful fixture build'
    $outputJar = Join-Path $project 'Orbit-Client\orbit-0.1.0.jar'
    Check (Test-Path -LiteralPath $outputJar -PathType Leaf) 'batch places the combined jar next to start.bat'
    $previousHash = (Get-FileHash -LiteralPath $outputJar -Algorithm SHA256).Hash
    Check ($previousHash -eq (Get-FileHash -LiteralPath $goodJar -Algorithm SHA256).Hash) 'output jar matches the verified build'
    Check (Test-Path -LiteralPath (Join-Path $project 'Orbit-Client\starter.log') -PathType Leaf) 'starter log is created'

    $env:ORBIT_TEST_JAR = $badJar
    try {
        $ErrorActionPreference = 'Continue'
        & (Join-Path $project 'start.bat') --no-pause 2>&1 | Out-String | Write-Host
        $invalidExit = $LASTEXITCODE
    } finally { $ErrorActionPreference = $savedPreference }
    Check ($invalidExit -ne 0) 'batch rejects a successful build with an incomplete jar'
    Check (((Get-FileHash -LiteralPath $outputJar -Algorithm SHA256).Hash) -eq $previousHash) 'invalid jar does not replace the previous output'

    $env:ORBIT_TEST_JAR = $goodJar
    $env:ORBIT_TEST_FAIL = '1'
    try {
        $ErrorActionPreference = 'Continue'
        & (Join-Path $project 'start.bat') --no-pause 2>&1 | Out-String | Write-Host
        $failureExit = $LASTEXITCODE
    } finally { $ErrorActionPreference = $savedPreference }
    Check ($failureExit -ne 0) 'batch reports a Gradle failure'
    Check (((Get-FileHash -LiteralPath $outputJar -Algorithm SHA256).Hash) -eq $previousHash) 'failed rebuild does not replace the previous jar'
    $buildLog = Join-Path $project 'Orbit-Client\gradle-build.log'
    Check ((Get-Content -LiteralPath $buildLog -Raw) -match 'mock Gradle failure') 'failure details are written to the Gradle log'
    Write-Host 'Starter fixture tests passed. A real Fabric build and Minecraft test are still required.'
} finally {
    $env:JAVA_HOME = $oldJavaHome
    $env:ORBIT_NO_OPEN = $oldNoOpen
    $env:ORBIT_TEST_JAR = $oldTestJar
    $env:ORBIT_TEST_FAIL = $oldTestFail
    Remove-Item -LiteralPath $temporary -Recurse -Force -ErrorAction SilentlyContinue
}
