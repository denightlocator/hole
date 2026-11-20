#!/usr/bin/env bash
# Build the Orbit Client jar -> build/libs/orbit-*.jar
set -euo pipefail
cd "$(dirname "$0")/.."
bash tools/setup.sh
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
/opt/gradle/gradle-9.9.1/bin/gradle build --no-daemon "$@"
ls -lh build/libs/*.jar
