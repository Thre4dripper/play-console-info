#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/../.."

ARCH="${1:-}"
if [ -z "$ARCH" ]; then
  RAW=$(uname -m)
  ARCH=$([ "$RAW" = "aarch64" ] || [ "$RAW" = "arm64" ] && echo "arm64" || echo "x64")
fi
if [ "$ARCH" = "arm64" ]; then
  BUN_TARGET="bun-linux-arm64"
else
  BUN_TARGET="bun-linux-x64"
fi

mkdir -p bin/mock/linux
bun build --compile --target="$BUN_TARGET" ./cli/mock/mockCli.js --outfile "bin/mock/linux/mockCli-linux-$ARCH"
chmod +x "bin/mock/linux/mockCli-linux-$ARCH"
echo "Built: bin/mock/linux/mockCli-linux-$ARCH"