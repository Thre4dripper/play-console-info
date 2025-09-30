#!/bin/zsh
echo "Building mock CLI binary for macOS..."

# Navigate to project root
cd "$(dirname "$0")/../.." || exit

# Create bin directory structure if it doesn't exist
mkdir -p "bin/mock/macos"

# Build the binary
echo "Compiling TypeScript to macOS executable..."
bun build --compile --target=bun-darwin-x64 ./cli/mock/mockCli.js --outfile bin/mock/macos/mockCli

if [ $? -eq 0 ]; then
    echo "✅ Mock CLI binary built successfully: bin/mock/macos/mockCli"
    chmod +x "bin/mock/macos/mockCli"
else
    echo "❌ Build failed"
    exit 1
fi

echo "Build complete!"