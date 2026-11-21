#!/usr/bin/env bash
# Standalone tests for rounded rendering geometry and local audio serving.
# Requires a full JDK 21 (including the jdk.httpserver module).
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
  src/main/java/dev/orbit/client/audio/LocalAudioServer.java \
  tools/selftest/SpanSelfTest.java tools/selftest/ServerSelfTest.java
"$java" -cp "$classes" SpanSelfTest
"$java" -cp "$classes" ServerSelfTest
"$java" -Djava.net.preferIPv6Addresses=true -cp "$classes" ServerSelfTest
