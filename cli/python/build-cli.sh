#!/bin/bash

# Create a virtual environment if not already present
if [ ! -d "venv/bin" ]; then
  python3 -m venv venv
fi
source venv/bin/activate
pip install --upgrade pip
pip install -r cli/python/requirements.txt

# Use PyInstaller to create a standalone executable
PyInstaller -F cli/python/play_console_cli.python/py --distpath cli/python/dist --workpath cli/python/build --specpath cli/python --name play_console_cli