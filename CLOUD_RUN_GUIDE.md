# 🚀 Google Cloud Run Deployment & Persistence Guide

This guide explains how to deploy the **Railway Terminal Detention Management System** to **Google Cloud Run** with public HTTPS access for PC and Mobile, with **Zero Data Loss & Full Persistence**.

---

## ⚠️ Why Did Data & Logs Reset Previously?

By default, Cloud Run is a **stateless, serverless environment**:
1. When traffic is idle for 15 minutes, Cloud Run automatically shuts down (scales down to 0).
2. When a new request arrives, a fresh container is booted.
3. If files are stored in the temporary container root (`/app/`), they are destroyed upon container recycle.
4. Furthermore, if `.dockerignore` excluded `detention.db`, the container booted completely empty!

### ✅ What We Fixed to Guarantee Zero Data Loss:
1. **Baked-in Master Baseline**: `detention.db` (53 terminals + master records) is now packaged inside the image, so a container never starts blank.
2. **Persistent Cloud Storage Volume**: Container data (`detention.db`, `logs/`, `backups/`) is mounted to a Google Cloud Storage bucket at `/mnt/data`.
3. **Always-On Instance (`--min-instances 1`)**: Cloud Run keeps at least 1 container warm 24/7 so it never sleeps or recycles unexpectedly.
4. **Client-Side Data Recovery Guard**: If the server ever reboots empty, your browser & phone caches automatically push your records back to the server.
5. **Persistent Activity Logging**: System activity is stored both on persistent disk and in local browser storage, and combined in real time.

---

## ⚡ Option 1: Deploy in 2 Minutes via Google Cloud Shell (Recommended)

You do **not** need Docker or `gcloud` installed on your PC. You can deploy directly from your web browser using Google Cloud Shell.

1. **Open Google Cloud Shell**:
   - Go to [https://shell.cloud.google.com](https://shell.cloud.google.com) and sign in.
   - Select your Google Cloud Project.

2. **Upload Project Folder**:
   - In Cloud Shell, click the three dots (`⋮`) menu in the upper-right corner and choose **Upload**.
   - Upload your `railway-detention` folder (or zip it first as `railway-detention.zip` and run `unzip railway-detention.zip`).

3. **Deploy with One Command (Persistent & Always-On)**:
   ```bash
   cd railway-detention
   bash deploy_cloudrun.sh
   ```
   *The script automatically creates your persistent storage bucket, mounts it to `/mnt/data`, configures `--min-instances 1`, and deploys.*

4. **Done!**
   Google Cloud will output your secure public URL:
   - 🖥️ **Desktop App**: `https://railway-detention-xxxx-uc.a.run.app/`
   - 📱 **Mobile Phone**: `https://railway-detention-xxxx-uc.a.run.app/mobile.html`
   - 📋 **Activity Log**: `https://railway-detention-xxxx-uc.a.run.app/api/logs`

---

## 💻 Option 2: Deploy from Windows PC (`deploy_cloudrun.bat`)

If you have Google Cloud SDK installed on your Windows PC:
1. Double-click `deploy_cloudrun.bat`.
2. Follow the prompt to deploy with persistent Cloud Storage mounted to `/mnt/data`.

---

## 🖥️ Running Locally on PC (Offline Mode)

If you prefer to run locally on your own Windows computer:
1. Python 3.12 is now installed on your system.
2. Simply double-click **`start.bat`**.
3. It starts the server on port 8080 and opens `http://localhost:8080` in your browser.
4. All data, backups, and logs are saved directly in your folder.

