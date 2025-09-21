@echo off

@REM Create a virtual environment if not already present
if not exist venv/Scripts ( virtualenv venv )
call venv\Scripts\activate
pip install --upgrade pip
pip install -r cli\python\requirements.txt

@REM Use PyInstaller to create a standalone executable
pyinstaller -F cli\python\play_console_cli.py --distpath cli\python\dist --workpath cli\python\build --specpath cli\python --name play_console_cli

