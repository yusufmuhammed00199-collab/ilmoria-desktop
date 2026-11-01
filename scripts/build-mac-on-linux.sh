#!/usr/bin/env bash
# Builds the macOS app on Linux (no Mac needed): electron-builder makes the .app for Apple silicon
# and Intel, rcodesign signs it "ad hoc" (needed for it to open on Apple silicon), and zip keeps
# the framework links. A Mac (or the GitHub workflow) is needed for .dmg files and Apple signing.
#   RCODESIGN=/path/to/rcodesign scripts/build-mac-on-linux.sh
set -euo pipefail
cd "$(dirname "$0")/.."
RCODESIGN="${RCODESIGN:-rcodesign}"
VERSION=$(node -p "require('./package.json').version")
npx electron-builder --mac dir --arm64 --x64 -c.mac.identity=null
for pair in "mac-arm64:arm64" "mac:x64"; do
  dir="dist/${pair%%:*}"; arch="${pair##*:}"
  "$RCODESIGN" sign "$dir/Ilmoria.app"
  (cd "$dir" && rm -f "../Ilmoria-$VERSION-mac-$arch.zip" && zip -qry -X "../Ilmoria-$VERSION-mac-$arch.zip" Ilmoria.app)
done
ls -la dist/*.zip
