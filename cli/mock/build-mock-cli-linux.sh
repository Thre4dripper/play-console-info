#!/bin/bash
echo "Building mock CLI binary for Linux..."

# Navigate to project root
cd "$(dirname "$0")/../.." || exit

# Resolve architecture: accept $1 (x64|arm64), else detect current
if [ -n "$1" ]; then
    ARCH_SUFFIX="$1"
else
    RAW_ARCH=$(uname -m)
    if [ "$RAW_ARCH" = "arm64" ] || [ "$RAW_ARCH" = "aarch64" ]; then
        ARCH_SUFFIX="arm64"
    else
        ARCH_SUFFIX="x64"
    fi
fi

if [ "$ARCH_SUFFIX" = "arm64" ]; then
    BUN_TARGET="bun-linux-arm64"
else
    BUN_TARGET="bun-linux-x64"
fi

mkdir -p "bin/mock/linux"

echo "Compiling to Linux $ARCH_SUFFIX executable..."
bun build --compile --target="$BUN_TARGET" ./cli/mock/mockCli.js --outfile "bin/mock/linux/mockCli-linux-$ARCH_SUFFIX"

if [ $? -eq 0 ]; then
    echo "✅ Mock CLI binary built successfully: bin/mock/linux/mockCli-linux-$ARCH_SUFFIX"
    chmod +x "bin/mock/linux/mockCli-linux-$ARCH_SUFFIX"
else
    echo "❌ Build failed"
    exit 1
fi

echo "Build complete!"