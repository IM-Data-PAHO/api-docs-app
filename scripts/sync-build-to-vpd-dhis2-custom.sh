#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUNDLE_DIR="$ROOT_DIR/build/bundle"
TARGET_DIR="/Users/PAHO/vpd-dhis2-custom/api-docs-app"

if [[ ! -d "$BUNDLE_DIR" ]]; then
    echo "[sync-build] Bundle directory not found: $BUNDLE_DIR"
    echo "[sync-build] Run yarn build first."
    exit 1
fi

ZIP_FILE="$(ls -1 "$BUNDLE_DIR"/vpd-api-docs-*.zip 2>/dev/null | head -n 1 || true)"

if [[ -z "$ZIP_FILE" ]]; then
    echo "[sync-build] No vpd-api-docs zip found in $BUNDLE_DIR"
    exit 1
fi

mkdir -p "$TARGET_DIR"
cp "$ZIP_FILE" "$TARGET_DIR/"

echo "[sync-build] Copied $(basename "$ZIP_FILE") to $TARGET_DIR"
