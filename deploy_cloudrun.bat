@echo off
title Deploy Railway Detention System to Google Cloud Run
cd /d "%~dp0"

echo =====================================================================
echo    DEPLOY TO GOOGLE CLOUD RUN
echo =====================================================================
echo.

where gcloud >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] 'gcloud' CLI is not found on your system PATH.
    echo.
    echo You have 2 easy options:
    echo  1. Free Google Cloud Shell in your browser (Recommended - no setup needed!):
    echo     - Go to: https://shell.cloud.google.com
    echo     - Upload this 'terminal detention' folder
    echo     - Run: bash deploy_cloudrun.sh
    echo.
    echo  2. Install Google Cloud SDK:
    echo     - Download from: https://cloud.google.com/sdk/docs/install
    echo.
    pause
    exit /b 1
)

echo Authenticated Project:
call gcloud config get-value project
echo.

set /p SERVICE_NAME="Enter Cloud Run Service Name [default: railway-detention]: "
if "%SERVICE_NAME%"=="" set SERVICE_NAME=railway-detention

set /p REGION="Enter GCP Region [default: us-central1]: "
if "%REGION%"=="" set REGION=us-central1

for /f "tokens=*" %%i in ('call gcloud config get-value project 2^>nul') do set GCP_PROJECT=%%i
if "%GCP_PROJECT%"=="" set GCP_PROJECT=railway-data
set BUCKET_NAME=%GCP_PROJECT%-detention-storage

echo.
echo Checking/Creating Persistent Cloud Storage Bucket: gs://%BUCKET_NAME%...
call gsutil mb -l %REGION% gs://%BUCKET_NAME% 2>nul

echo.
echo Deploying %SERVICE_NAME% to Google Cloud Run in %REGION%...
echo - Persistent Storage: Mounted to /mnt/data
echo - Min Instances     : 1 (Always-on, prevents cold-start wipes)
echo - Code & DB Baseline: Packaged together
echo.

call gcloud run deploy %SERVICE_NAME% ^
    --source . ^
    --region %REGION% ^
    --platform managed ^
    --allow-unauthenticated ^
    --port 8080 ^
    --memory 512Mi ^
    --execution-environment gen2 ^
    --min-instances 1 ^
    --set-env-vars "PERSISTENT_DIR=/mnt/data,DB_PATH=/mnt/data/detention.db,LOG_DIR=/mnt/data/logs,BACKUP_DIR=/mnt/data/backups" ^
    --add-volume name=data-vol,type=cloud-storage,bucket=%BUCKET_NAME% ^
    --add-volume-mount volume=data-vol,mount-path=/mnt/data

echo.
echo =====================================================================
echo  DEPLOYMENT COMPLETE!
echo  Visit your HTTPS Cloud Run URL provided above.
echo =====================================================================
pause

