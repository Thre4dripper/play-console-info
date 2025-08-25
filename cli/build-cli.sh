#!/bin/bash

# Create a virtual environment and install dependencies
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r cli/requirements.txt

# Use PyInstaller to create a standalone executable
PyInstaller -F cli/play_console_cli.py --distpath cli/dist --workpath cli/build --specpath cli --name play_console_cli