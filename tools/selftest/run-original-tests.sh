#!/usr/bin/env bash
# Standalone tests for rendering geometry, sky preparation, inspector layout, and local audio.
# Requires a full JDK 21 (including the java.desktop and jdk.httpserver modules) and Python 3.
set -euo pipefail
cd "$(dirname "$0")/../.."
if [[ -n "${JAVA_HOME:-}" ]]; then
  javac="${JAVA_HOME}/bin/javac"
  java="${JAVA_HOME}/bin/java"
else
  javac=javac
  java=java
fi
classes="$(mktemp -d "${TMPDIR:-/tmp}/orbit-original-test.XXXXXX")"
trap 'rm -rf "$classes"' EXIT
"$javac" --release 21 -encoding UTF-8 -d "$classes" \
  src/main/java/dev/orbit/client/gui/RoundedSpans.java \
  src/main/java/dev/orbit/client/gui/InspectorViewport.java \
  src/main/java/dev/orbit/client/gui/InspectorModeLayout.java \
  src/main/java/dev/orbit/client/render/SkyPanorama.java \
  src/main/java/dev/orbit/client/audio/LocalAudioServer.java \
  tools/selftest/SpanSelfTest.java tools/selftest/InspectorViewportSelfTest.java \
  tools/selftest/InspectorModeLayoutSelfTest.java tools/selftest/SkyPanoramaSelfTest.java \
  tools/selftest/ServerSelfTest.java
"$java" -cp "$classes" SpanSelfTest
"$java" -cp "$classes" dev.orbit.client.gui.InspectorViewportSelfTest
"$java" -cp "$classes" dev.orbit.client.gui.InspectorModeLayoutSelfTest
"$java" -Djava.awt.headless=true -cp "$classes" dev.orbit.client.render.SkyPanoramaSelfTest
python3 tools/selftest/sky-assets-test.py
"$java" -cp "$classes" ServerSelfTest
"$java" -Djava.net.preferIPv6Addresses=true -cp "$classes" ServerSelfTest
