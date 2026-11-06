# PowerShell Installation and Setup Script for Railway Detention Management System
$ErrorActionPreference = "Stop"

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host " RAILWAY TERMINAL DETENTION MANAGEMENT SYSTEM - SETUP SCRIPT" -ForegroundColor Yellow
Write-Host "=====================================================================" -ForegroundColor Cyan

Set-Location $PSScriptRoot

Write-Host "`n[1/3] Checking Python..." -ForegroundColor Green
$pyVer = python --version
Write-Host "Found: $pyVer" -ForegroundColor White

Write-Host "`n[2/3] Initializing Optimized SQLite Multi-Table Database..." -ForegroundColor Green
python init_db.py

Write-Host "`n[3/3] System Verified!" -ForegroundColor Green
Write-Host "`nTo start the application, run: .\start.bat or 'python server.py'`n" -ForegroundColor Yellow

