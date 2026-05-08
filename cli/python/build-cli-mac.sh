#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/../.."

VENV_DIR="cli/python/.venv-mac-arm64"
mkdir -p bin/python/mac

if [ ! -x "$VENV_DIR/bin/python" ]; then
  python3 -m venv "$VENV_DIR"
fi
"$VENV_DIR/bin/python" -m pip install --upgrade pip
"$VENV_DIR/bin/python" -m pip install -r cli/python/requirements.txt

"$VENV_DIR/bin/python" -m PyInstaller -F cli/python/play_console_cli.py \
  --distpath bin/python/mac \
  --workpath cli/python/build \
  --specpath cli/python \
  --target-architecture arm64 \
  --name play_console_cli-mac-arm64

chmod +x bin/python/mac/play_console_cli-mac-arm64
echo "Built: bin/python/mac/play_console_cli-mac-arm64"
