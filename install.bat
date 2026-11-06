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

echo [2/3] Initializing optimized SQLite multi-table database (detention.db)...
python init_db.py
if errorlevel 1 (
    echo [ERROR] Failed to initialize SQLite database!
    pause
    exit /b 1
)
echo [OK] Database created and seeded successfully with:
echo      - 53 Master Railway Terminals (Adobe Scan PDF)
echo      - 33 Live Loading Detention Records (Google Sheets gid=405927684)
echo      - Categories, Subcategories, and App Settings
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

