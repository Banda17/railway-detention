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

echo.
echo Deploying %SERVICE_NAME% to Google Cloud Run in %REGION%...
echo (Google Cloud Build will package and deploy your container)
echo.

call gcloud run deploy %SERVICE_NAME% ^
    --source . ^
    --region %REGION% ^
    --platform managed ^
    --allow-unauthenticated ^
    --port 8080

echo.
echo =====================================================================
echo  DEPLOYMENT COMPLETE!
echo  Visit your HTTPS Cloud Run URL provided above.
echo =====================================================================
pause

