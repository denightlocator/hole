#!/usr/bin/env bash
# Compile actual Orbit config/modules against Gson and minimal Minecraft/Fabric doubles.
# Requires JDK 21 and GSON_JAR or a Gson jar in the local Gradle dependency cache.
set -euo pipefail
cd "$(dirname "$0")/../.."

if [[ -n "${JAVA_HOME:-}" ]]; then
  javac="${JAVA_HOME}/bin/javac"
  java="${JAVA_HOME}/bin/java"
else
  javac=javac
  java=java
fi

if [[ -z "${GSON_JAR:-}" ]]; then
  cache="${GRADLE_USER_HOME:-${HOME}/.gradle}/caches/modules-2/files-2.1/com.google.code.gson/gson"
  if [[ -d "$cache" ]]; then
    GSON_JAR="$(find "$cache" -type f -name 'gson-*.jar' ! -name '*-sources.jar' ! -name '*-javadoc.jar' -print -quit)"
  fi
fi
if [[ -z "${GSON_JAR:-}" || ! -f "$GSON_JAR" ]]; then
  echo 'Set GSON_JAR to a Gson jar, or run the Gradle build first to populate its cache.' >&2
  exit 1
fi

classes="$(mktemp -d "${TMPDIR:-/tmp}/orbit-config-test.XXXXXX")"
trap 'rm -rf "$classes"' EXIT
mapfile -t doubles < <(find tools/selftest/config-mocks/src tools/selftest/mocks/src/net \
  tools/selftest/mocks/src/org -type f -name '*.java' | sort)
"$javac" --release 21 -encoding UTF-8 -cp "$GSON_JAR" -d "$classes" \
  "${doubles[@]}" \
  tools/selftest/mocks/src/dev/orbit/client/render/EspRenderer.java \
  src/main/java/dev/orbit/client/module/Category.java \
  src/main/java/dev/orbit/client/module/Module.java \
  src/main/java/dev/orbit/client/module/ModuleRegistry.java \
  src/main/java/dev/orbit/client/module/setting/*.java \
  src/main/java/dev/orbit/client/module/impl/misc/TitleScreenModule.java \
  src/main/java/dev/orbit/client/module/impl/render/ChunkActivity.java \
  src/main/java/dev/orbit/client/module/impl/render/GeodeAge.java \
  src/main/java/dev/orbit/client/observation/*.java \
  src/main/java/dev/orbit/client/hud/HudLayout.java \
  src/main/java/dev/orbit/client/config/ConfigManager.java \
  tools/selftest/ConfigIntegrationSelfTest.java
"$java" -cp "$classes:$GSON_JAR" ConfigIntegrationSelfTest
