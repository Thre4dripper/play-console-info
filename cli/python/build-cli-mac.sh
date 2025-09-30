#!/bin/zsh
echo "Building Python CLI binary for macOS..."

# Navigate to project root
cd "$(dirname "$0")/../.." || exit

# Create bin directory structure if it doesn't exist
mkdir -p "bin/python/macos"

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
  --distpath bin/python/macos \
  --workpath cli/python/build \
  --specpath cli/python \
  --name play_console_cli

if [ $? -eq 0 ]; then
    echo "✅ Python CLI binary built successfully: bin/python/macos/play_console_cli"
    chmod +x "bin/python/macos/play_console_cli"
else
    echo "❌ Build failed"
    exit 1
fi

echo "Build complete!"