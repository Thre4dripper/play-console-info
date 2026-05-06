#!/bin/bash
echo "Building mock CLI binary for macOS..."

# Navigate to project root
cd "$(dirname "$0")/../.."

# Create bin directory structure if it doesn't exist
mkdir -p "bin/mock/mac"

# Detect architecture to pick the right Bun target
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    BUN_TARGET="bun-darwin-arm64"
else
    BUN_TARGET="bun-darwin-x64"
fi

echo "Detected architecture: $ARCH, using Bun target: $BUN_TARGET"

# Build the binary
echo "Compiling to macOS executable..."
bun build --compile --target="$BUN_TARGET" ./cli/mock/mockCli.js --outfile bin/mock/mac/mockCli-mac

if [ $? -eq 0 ]; then
    echo "✅ Mock CLI binary built successfully: bin/mock/mac/mockCli-mac"
    chmod +x "bin/mock/mac/mockCli-mac"
else
    echo "❌ Build failed"
    exit 1
fi

echo "Build complete!"
