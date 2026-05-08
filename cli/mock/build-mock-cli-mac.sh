#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/../.."

mkdir -p bin/mock/mac
bun build --compile --target=bun-darwin-arm64 ./cli/mock/mockCli.js --outfile bin/mock/mac/mockCli-mac-arm64
chmod +x bin/mock/mac/mockCli-mac-arm64
echo "Built: bin/mock/mac/mockCli-mac-arm64"
