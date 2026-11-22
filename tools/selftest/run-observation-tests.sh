#!/usr/bin/env bash
# Run pure logic, module-flow, and companion adapter tests with handwritten Minecraft/Fabric stubs.
# JDK 21 and Python 3 are required. These stubs do not validate a real mod build or runtime.
set -euo pipefail
cd "$(dirname "$0")/../.."

if [[ -n "${JAVA_HOME:-}" ]]; then
  javac="${JAVA_HOME}/bin/javac"
  java="${JAVA_HOME}/bin/java"
else
  javac=javac
  java=java
fi

classes="$(mktemp -d "${TMPDIR:-/tmp}/orbit-observation-test.XXXXXX")"
trap 'rm -rf "$classes"' EXIT
mapfile -t mocks < <(find tools/selftest/mocks/src -type f -name '*.java' ! -name 'CompanionSelfTest.java' | sort)

"$javac" --release 21 -encoding UTF-8 -d "$classes" \
  "${mocks[@]}" \
  src/main/java/dev/orbit/client/observation/*.java \
  src/main/java/dev/orbit/client/module/impl/render/ChunkActivity.java \
  src/main/java/dev/orbit/client/module/impl/render/GeodeAge.java \
  src/main/java/dev/orbit/client/mixin/ActivityClientWorldMixin.java \
  tools/selftest/ObservationSelfTest.java

"$java" -cp "$classes" ObservationSelfTest
"$java" -cp "$classes" MockFeatureIntegrationTest

# Mirror Gradle's namespace relocation for the standalone companion in a temporary directory.
mkdir -p "$classes/companion-src"
python3 - "$PWD" "$classes/companion-src" <<'PY'
import pathlib, sys
root, out = map(pathlib.Path, sys.argv[1:])
base = root / 'src/main/java/dev/orbit/client'
files = list((base / 'observation').glob('*.java')) + [
    base / 'module/impl/render/ChunkActivity.java',
    base / 'module/impl/render/GeodeAge.java',
    base / 'mixin/ActivityClientWorldMixin.java',
]
for source in files:
    target = out / 'dev/orbitobserver/client' / source.relative_to(base)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(source.read_text().replace('dev.orbit.client.', 'dev.orbitobserver.client.'))
PY
mapfile -t companion_sources < <(find "$classes/companion-src" companion/src/main/java \
  tools/selftest/mocks/src/net tools/selftest/mocks/src/org -type f -name '*.java' | sort)
"$javac" --release 21 -encoding UTF-8 -d "$classes/companion" \
  "${companion_sources[@]}" tools/selftest/CompanionSelfTest.java
"$java" -cp "$classes/companion" CompanionSelfTest
