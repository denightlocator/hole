#!/usr/bin/env bash
# Build the Orbit Client jar -> build/libs/orbit-*.jar
set -euo pipefail
cd "$(dirname "$0")/.."
# Use an installed JDK 21. The wrapper downloads and verifies the Gradle distribution.
./gradlew build --no-daemon "$@"
ls -lh build/libs/*.jar
