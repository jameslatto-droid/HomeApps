@echo off
REM ============================================================================
REM JimL Backup Launcher
REM ============================================================================
REM This batch file launches the PowerShell backup script with the correct
REM execution policy to avoid security restrictions.
REM
REM Usage: Simply double-click this file from Windows Explorer.
REM ============================================================================

REM Get the directory where this batch file is located
SET SCRIPT_DIR=%~dp0

REM Remove trailing backslash from SCRIPT_DIR
SET SCRIPT_DIR=%SCRIPT_DIR:~0,-1%

REM Launch PowerShell with execution policy bypass for this session only
PowerShell.exe -ExecutionPolicy Bypass -NoExit -NoProfile -File "%SCRIPT_DIR%\Run-JimLBackup.ps1"

REM Exit code will be passed through from PowerShell script
exit /b %ERRORLEVEL%
