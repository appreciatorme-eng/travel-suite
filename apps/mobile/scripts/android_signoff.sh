#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[1/6] Flutter pub get"
flutter pub get

echo "[2/6] Static analysis"
flutter analyze

echo "[3/6] Unit/widget tests"
flutter test

echo "[4/6] Coverage"
flutter test --coverage

echo "[5/6] Build Android release apk"
flutter build apk --release

echo "[6/6] Build Android appbundle"
flutter build appbundle --release

echo "Android sign-off checks completed."
