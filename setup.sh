#!/usr/bin/env bash
# Orbit Client - build environment bootstrap (sandbox rebuilds from scratch each session)
# Installs JDK 21 + Gradle 9.9.1 (Minecraft 1.21.11 requires Java 21).
set -euo pipefail

GRADLE_VERSION="9.9.1"
JDK_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
GRADLE_HOME="/opt/gradle/gradle-${GRADLE_VERSION}"

if [ ! -d "${JDK_HOME}" ]; then
  echo ">> installing JDK 21 (needs sudo)"
  sudo apt-get update -q >/dev/null 2>&1 || true
  sudo apt-get install -y openjdk-21-jdk-headless >/dev/null
fi

if [ ! -x "${GRADLE_HOME}/bin/gradle" ]; then
  echo ">> installing Gradle ${GRADLE_VERSION}"
  tmp="$(mktemp -d)"
  curl -sL -o "${tmp}/gradle.zip" "https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip"
  sudo mkdir -p /opt/gradle
  sudo unzip -q "${tmp}/gradle.zip" -d /opt/gradle
  rm -rf "${tmp}"
fi

echo ">> ready: $(${JDK_HOME}/bin/java -version 2>&1 | head -1) / $(${GRADLE_HOME}/bin/gradle --version | grep Gradle)"
