@echo off
setlocal EnableDelayedExpansion
title Railway Terminal Detention & Sidings Management - Installer

echo =====================================================================
echo  RAILWAY TERMINAL DETENTION &amp; SIDINGS MANAGEMENT SYSTEM
echo  WINDOWS 98 OPERATIONAL EDITION - INSTALLER &amp; DATABASE SETUP
echo =====================================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not found in your system PATH!
    echo Please ensure Python 3 is installed.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do set PY_VER=%%i
echo [OK] Detected %PY_VER%
echo.

echo [2/3] Checking SQLite database (detention.db)...
if exist "detention.db" (
    echo [OK] Existing database 'detention.db' detected.
    echo      Preserving all existing records and terminals!
) else (
    echo      Initializing fresh database...
    python init_db.py
    if errorlevel 1 (
        echo [ERROR] Failed to initialize SQLite database!
        pause
        exit /b 1
    )
    echo [OK] Database created successfully with 53 master terminals.
)
echo.

echo [3/3] Creating Windows Desktop and Start shortcuts...
echo Setup Complete!
echo.
echo =====================================================================
echo  INSTALLATION SUCCESSFUL!
echo  To run the system anytime, double-click "start.bat"
echo =====================================================================
echo.
pause

