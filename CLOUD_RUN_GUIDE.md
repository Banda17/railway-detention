# 🚀 Google Cloud Run Deployment Guide

This guide explains how to deploy the **Railway Terminal Detention Management System** to **Google Cloud Run** with public HTTPS access for both PC and Mobile.

---

## ⚡ Option 1: Deploy in 2 Minutes via Cloud Shell (Easiest & Free)

You do **not** need Docker or `gcloud` installed on your PC. You can deploy directly from your web browser using Google Cloud Shell.

1. **Open Google Cloud Shell**:
   - Go to [https://shell.cloud.google.com](https://shell.cloud.google.com) and sign in.
   - Select your Google Cloud Project.

2. **Upload Project Folder**:
   - In Cloud Shell, click the three dots (`⋮`) menu in the upper-right corner and choose **Upload**.
   - Upload your `terminal detention` folder (or zip it first as `terminal_detention.zip` and run `unzip terminal_detention.zip`).

3. **Deploy with One Command**:
   ```bash
   cd "terminal detention"
   bash deploy_cloudrun.sh
   ```
   *(Or run directly:)*
   ```bash
   gcloud run deploy railway-detention \
     --source . \
     --region us-central1 \
     --allow-unauthenticated \
     --port 8080
   ```

4. **Done!**
   Google Cloud will automatically build your container and give you a secure public URL like:
   - 🖥️ **Desktop App**: `https://railway-detention-xxxx-uc.a.run.app/`
   - 📱 **Mobile Phone**: `https://railway-detention-xxxx-uc.a.run.app/mobile.html`

---

## 🌐 Option 2: Deploy from Google Cloud Console Web UI

1. Open [Google Cloud Console - Cloud Run](https://console.cloud.google.com/run).
2. Click **Create Service**.
3. Under **Deployment**, choose **"Continuously deploy from a repository"** (or upload to Artifact Registry).
4. Service name: `railway-detention`.
5. Region: choose your preferred region (e.g., `asia-south1` Mumbai or `us-central1`).
6. Authentication: Choose **"Allow unauthenticated invocations"** (so anyone with the link or your team can access it).
7. Under **Container > Port**: set to `8080`.
8. Click **Create**.

---

## 💻 Option 3: Deploy using Local `gcloud` CLI (Windows)

If you have Google Cloud SDK installed on your Windows PC:
1. Open PowerShell or Command Prompt.
2. Navigate to your project folder:
   ```cmd
   cd "C:\Users\RAMSAKETH\Documents\terminal detention"
   ```
3. Run the deployment script:
   ```cmd
   deploy_cloudrun.bat
   ```
   Or:
   ```cmd
   gcloud run deploy railway-detention --source . --region us-central1 --allow-unauthenticated
   ```

---

## 💾 Notes on Database Persistence on Cloud Run

- Cloud Run containers are serverless. Out of the box, the pre-baked SQLite database (`detention.db` with all 53 terminals and detention records) is loaded into the container.
- If you want edits and new entries to persist indefinitely across container restarts, Cloud Run allows mounting a **Cloud Storage Bucket**:
  - In Cloud Run service settings -> **Volumes** -> Add Volume -> **Cloud Storage Bucket**.
  - Mount path: `/mnt/data`
  - Environment variable: `DB_PATH=/mnt/data/detention.db`

