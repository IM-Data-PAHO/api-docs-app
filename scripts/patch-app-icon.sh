#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT_DIR/build/app"
BUNDLE_DIR="$ROOT_DIR/build/bundle"
SOURCE_ICON="$ROOT_DIR/src/assets/app-logo.svg"

if [[ ! -f "$SOURCE_ICON" ]]; then
    echo "[icon-patch] Source icon not found: $SOURCE_ICON"
    exit 1
fi

if [[ ! -d "$APP_DIR" ]]; then
    echo "[icon-patch] Build output not found: $APP_DIR"
    echo "[icon-patch] Run yarn build first."
    exit 1
fi

if ! command -v magick >/dev/null 2>&1; then
    echo "[icon-patch] ImageMagick 'magick' is required but not installed."
    exit 1
fi

magick "$SOURCE_ICON" -background none -resize 48x48 "$APP_DIR/dhis2-app-icon.png"
magick "$SOURCE_ICON" -background none -resize 48x48 "$APP_DIR/favicon-48x48.png"

APP_NAME="$(node -e 'console.log(require(process.argv[1]).name)' "$ROOT_DIR/d2.config.js")"
APP_VERSION="$(node -e 'console.log(require(process.argv[1]).version)' "$ROOT_DIR/package.json")"
ZIP_FILE="$BUNDLE_DIR/${APP_NAME}-${APP_VERSION}.zip"

if [[ -f "$ZIP_FILE" ]]; then
    rm -f "$ZIP_FILE"
fi

(
    cd "$APP_DIR"
    zip --quiet -r "$ZIP_FILE" .
)

echo "[icon-patch] Patched app icon and rebuilt bundle: $ZIP_FILE"
