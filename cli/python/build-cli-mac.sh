#!/bin/bash
echo "Building Python CLI binary for macOS..."

# Navigate to project root
cd "$(dirname "$0")/../.."

# Create bin directory structure if it doesn't exist
mkdir -p "bin/python/mac"

# Create a virtual environment if not already present
if [ ! -d ".venv/bin" ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install --upgrade pip
pip install -r cli/python/requirements.txt

# Use PyInstaller to create a standalone executable
echo "Compiling Python to macOS executable..."
PyInstaller -F cli/python/play_console_cli.py \
  --distpath bin/python/mac \
  --workpath cli/python/build \
  --specpath cli/python \
  --name play_console_cli-mac

if [ $? -eq 0 ]; then
    echo "✅ Python CLI binary built successfully: bin/python/mac/play_console_cli-mac"
    chmod +x "bin/python/mac/play_console_cli-mac"
else
    echo "❌ Build failed"
    exit 1
fi

echo "Build complete!"
