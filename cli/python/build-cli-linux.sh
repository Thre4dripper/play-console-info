#!/bin/bash
echo "Building Python CLI binary for Linux..."

# Navigate to project root
cd "$(dirname "$0")/../.." || exit

# PyInstaller builds natively only — allow explicit arch but default to host
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

VENV_DIR="cli/python/.venv-linux-$ARCH_SUFFIX"

mkdir -p "bin/python/linux"

# Create a virtual environment if not already present
if [ ! -x "$VENV_DIR/bin/python" ]; then
  python3 -m venv "$VENV_DIR"
fi
"$VENV_DIR/bin/python" -m pip install --upgrade pip
"$VENV_DIR/bin/python" -m pip install -r cli/python/requirements.txt

# Use PyInstaller to create a standalone executable
echo "Compiling Python to Linux $ARCH_SUFFIX executable..."
"$VENV_DIR/bin/python" -m PyInstaller -F cli/python/play_console_cli.py \
  --distpath "bin/python/linux" \
  --workpath cli/python/build \
  --specpath cli/python \
  --name "play_console_cli-linux-$ARCH_SUFFIX"

if [ $? -eq 0 ]; then
  echo "Python CLI binary built successfully: bin/python/linux/play_console_cli-linux-$ARCH_SUFFIX"
    chmod +x "bin/python/linux/play_console_cli-linux-$ARCH_SUFFIX"
else
  echo "Build failed"
    exit 1
fi

echo "Build complete!"