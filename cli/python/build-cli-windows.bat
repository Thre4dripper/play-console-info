@echo off
echo Building Python CLI binary for Windows...

REM Navigate to project root
cd /d "%~dp0..\.."

REM Create bin directory structure if it doesn't exist
if not exist "bin\python\windows" mkdir "bin\python\windows"

REM Create a virtual environment if not already present
if not exist ".venv\Scripts" (
    python -m venv .venv
)
.venv\Scripts\python -m pip install --upgrade pip
.venv\Scripts\python -m pip install -r cli\python\requirements.txt

REM Use PyInstaller to create a standalone executable
echo Compiling Python to Windows executable...
.venv\Scripts\python -m PyInstaller -F cli\python\play_console_cli.py --distpath bin\python\windows --workpath cli\python\build --specpath cli\python --name play_console_cli-windows-x64

if %ERRORLEVEL% EQU 0 (
    echo Python CLI binary built successfully: bin\python\windows\play_console_cli-windows-x64.exe
) else (
    echo Build failed with error code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)

echo Build complete!
