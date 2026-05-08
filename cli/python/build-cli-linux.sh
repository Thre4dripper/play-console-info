#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/../.."

ARCH="${1:-}"
if [ -z "$ARCH" ]; then
  RAW=$(uname -m)
  ARCH=$([ "$RAW" = "aarch64" ] || [ "$RAW" = "arm64" ] && echo "arm64" || echo "x64")
fi
VENV_DIR="cli/python/.venv-linux-$ARCH"
mkdir -p bin/python/linux

if [ ! -x "$VENV_DIR/bin/python" ]; then
  python3 -m venv "$VENV_DIR"
fi
"$VENV_DIR/bin/python" -m pip install --upgrade pip
"$VENV_DIR/bin/python" -m pip install -r cli/python/requirements.txt

"$VENV_DIR/bin/python" -m PyInstaller -F cli/python/play_console_cli.py \
  --distpath bin/python/linux \
  --workpath cli/python/build \
  --specpath cli/python \
  --name "play_console_cli-linux-$ARCH"

chmod +x "bin/python/linux/play_console_cli-linux-$ARCH"
echo "Built: bin/python/linux/play_console_cli-linux-$ARCH"