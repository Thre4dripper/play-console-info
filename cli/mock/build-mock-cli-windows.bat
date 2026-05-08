@echo off
echo Building mock CLI binary for Windows...

REM Navigate to project root
cd /d "%~dp0..\.."

REM Create bin directory structure if it doesn't exist
if not exist "bin\mock\windows" mkdir "bin\mock\windows"

REM Build the binary
echo Compiling JavaScript to Windows executable...
bun build --compile --target=bun-windows-x64 .\cli\mock\mockCli.js --outfile bin\mock\windows\mockCli-windows-x64.exe

if %ERRORLEVEL% EQU 0 (
    echo Mock CLI binary built successfully: bin\mock\windows\mockCli-windows-x64.exe
) else (
    echo Build failed with error code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)

echo Build complete!