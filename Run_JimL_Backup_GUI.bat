@echo off
REM ============================================================================
REM JimL Backup GUI Launcher
REM ============================================================================
REM This batch file launches the PowerShell GUI backup application.
REM
REM Usage: Simply double-click this file from Windows Explorer.
REM ============================================================================

REM Get the directory where this batch file is located
SET SCRIPT_DIR=%~dp0

REM Remove trailing backslash from SCRIPT_DIR
SET SCRIPT_DIR=%SCRIPT_DIR:~0,-1%

REM Launch PowerShell GUI with execution policy bypass for this session only
REM -WindowStyle Hidden hides the PowerShell console window
PowerShell.exe -ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File "%SCRIPT_DIR%\Run-JimLBackup-GUI.ps1"

REM Exit code will be passed through from PowerShell script
exit /b %ERRORLEVEL%
