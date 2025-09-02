@echo off

@REM Create a virtual environment if not already present
if not exist venv/Scripts ( virtualenv venv )
call venv\Scripts\activate
pip install --upgrade pip
pip install -r cli\requirements.txt

@REM Use PyInstaller to create a standalone executable
pyinstaller -F cli\play_console_cli.py --distpath cli\dist --workpath cli\build --specpath cli --name play_console_cli

