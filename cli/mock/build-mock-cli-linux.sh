#!/bin/bash
echo "Building mock CLI binary for Linux..."

# Navigate to project root
cd "$(dirname "$0")/../.." || exit

# Create bin directory structure if it doesn't exist
mkdir -p "bin/mock/linux"

# Build the binary
echo "Compiling TypeScript to Linux executable..."
bun build --compile --target=bun-linux-x64 ./cli/mock/mockCli.js --outfile bin/mock/linux/mockCli-linux

if [ $? -eq 0 ]; then
    echo "✅ Mock CLI binary built successfully: bin/mock/linux/mockCli-linux"
    chmod +x "bin/mock/linux/mockCli-linux"
else
    echo "❌ Build failed"
    exit 1
fi

echo "Build complete!"