@echo off
title Stop Railway Detention Server
echo Stopping Railway Detention Server on port 8080...

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8080" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo =====================================================================
echo  SERVER STOPPED SUCCESSFULLY!
echo =====================================================================
ping 127.0.0.1 -n 2 >nul
