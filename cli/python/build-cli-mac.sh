#!/bin/bash
echo "Building Python CLI binary for macOS..."

# Navigate to project root
cd "$(dirname "$0")/../.." || exit

TARGET_ARCH=""
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
  TARGET_ARCH="arm64"
elif [ "$ARCH_SUFFIX" = "x64" ]; then
  TARGET_ARCH="x86_64"
fi

mkdir -p "bin/python/mac"

# Create a virtual environment if not already present
if [ ! -d ".venv/bin" ]; then
  python3 -m venv .venv
fi
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r cli/python/requirements.txt

# Use PyInstaller to create a standalone executable
echo "Compiling Python to macOS $ARCH_SUFFIX executable..."
.venv/bin/python -m PyInstaller -F cli/python/play_console_cli.py \
  --distpath "bin/python/mac" \
  --workpath cli/python/build \
  --specpath cli/python \
  --target-architecture "$TARGET_ARCH" \
  --name "play_console_cli-mac-$ARCH_SUFFIX"

if [ $? -eq 0 ]; then
  echo "Python CLI binary built successfully: bin/python/mac/play_console_cli-mac-$ARCH_SUFFIX"
    chmod +x "bin/python/mac/play_console_cli-mac-$ARCH_SUFFIX"
else
  echo "Build failed"
    exit 1
fi

echo "Build complete!"
