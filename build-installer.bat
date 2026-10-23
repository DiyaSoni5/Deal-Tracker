@echo off
echo Building Deal Tracker Installer...

REM Create installers directory
if not exist "dist\installers" mkdir "dist\installers"

REM Check if Inno Setup is installed
if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" (
    echo Using Inno Setup to create installer...
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer.iss
    echo Installer created successfully!
    echo Location: dist\installers\Deal-Tracker-Setup.exe
) else if exist "C:\Program Files\Inno Setup 6\ISCC.exe" (
    echo Using Inno Setup to create installer...
    "C:\Program Files\Inno Setup 6\ISCC.exe" installer.iss
    echo Installer created successfully!
    echo Location: dist\installers\Deal-Tracker-Setup.exe
) else (
    echo Inno Setup not found. Creating portable version instead...
    echo.
    echo Your application is ready to use!
    echo Executable location: dist\deal-tracker-win32-x64\deal-tracker.exe
    echo.
    echo To create an installer:
    echo 1. Download Inno Setup from https://jrsoftware.org/isinfo.php
    echo 2. Install it
    echo 3. Run this script again
)

pause