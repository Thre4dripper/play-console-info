#!/bin/bash
echo "Building mock CLI binary for macOS..."

# Navigate to project root
cd "$(dirname "$0")/../.." || exit

# Resolve architecture: accept $1 (x64|arm64), else detect current
if [ -n "$1" ]; then
    ARCH_SUFFIX="$1"
else
    RAW_ARCH=$(uname -m)
    if [ "$RAW_ARCH" = "arm64" ]; then
        ARCH_SUFFIX="arm64"
    else
        ARCH_SUFFIX="x64"
    fi
fi

if [ "$ARCH_SUFFIX" = "arm64" ]; then
    BUN_TARGET="bun-darwin-arm64"
else
    BUN_TARGET="bun-darwin-x64"
fi

mkdir -p "bin/mock/mac"

echo "Compiling to macOS $ARCH_SUFFIX executable..."
bun build --compile --target="$BUN_TARGET" ./cli/mock/mockCli.js --outfile "bin/mock/mac/mockCli-mac-$ARCH_SUFFIX"

if [ $? -eq 0 ]; then
    echo "✅ Mock CLI binary built successfully: bin/mock/mac/mockCli-mac-$ARCH_SUFFIX"
    chmod +x "bin/mock/mac/mockCli-mac-$ARCH_SUFFIX"
else
    echo "❌ Build failed"
    exit 1
fi

echo "Build complete!"
