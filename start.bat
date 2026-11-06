@echo off
title Railway Terminal Detention Manager - Server
cd /d "%~dp0"

echo =====================================================================
echo   RAILWAY TERMINAL DETENTION MANAGEMENT SYSTEM
echo =====================================================================
echo.

if not exist "detention.db" (
    echo [1/3] Initializing SQLite database...
    python init_db.py
)

echo [2/3] Opening desktop application in browser...
start "" "http://localhost:8080"

echo [3/3] Starting Python web server on port 8080...
echo.
echo =====================================================================
echo   SERVER ACTIVE AND RUNNING!
echo   Desktop : http://localhost:8080
echo   Mobile  : http://localhost:8080/mobile.html
echo.
echo   KEEP THIS WINDOW OPEN WHILE WORKING.
echo   To shut down, close this window or press Ctrl+C.
echo =====================================================================
echo.

python server.py
pause
