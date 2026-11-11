#!/usr/bin/env bash
# Deploy Railway Detention System to Google Cloud Run with Persistent Cloud Storage & Zero Data Loss
set -e

SERVICE_NAME="${1:-railway-detention}"
REGION="${2:-us-central1}"
PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "railway-proj")
BUCKET_NAME="${3:-${PROJECT_ID}-detention-storage}"

echo "====================================================================="
echo " Deploying Railway Terminal Detention System to Google Cloud Run"
echo " Service : ${SERVICE_NAME}"
echo " Region  : ${REGION}"
echo " Storage : gs://${BUCKET_NAME} (Persistent Volume Mounted at /mnt/data)"
echo " Min Inst: 1 (Prevents container shutdown & idle cold-start wipes)"
echo "====================================================================="

# Ensure bucket exists
if ! gsutil ls -b "gs://${BUCKET_NAME}" >/dev/null 2>&1; then
  echo "Creating persistent Cloud Storage bucket gs://${BUCKET_NAME}..."
  gsutil mb -l "${REGION}" "gs://${BUCKET_NAME}" || true
fi

# Deploy with persistent volume attached to /mnt/data and min-instances=1
gcloud run deploy "${SERVICE_NAME}" \
  --source . \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --execution-environment gen2 \
  --min-instances 1 \
  --set-env-vars "PERSISTENT_DIR=/mnt/data,DB_PATH=/mnt/data/detention.db,LOG_DIR=/mnt/data/logs,BACKUP_DIR=/mnt/data/backups" \
  --add-volume name=data-vol,type=cloud-storage,bucket="${BUCKET_NAME}" \
  --add-volume-mount volume=data-vol,mount-path=/mnt/data

echo ""
echo "====================================================================="
echo " Deployment Complete! Data & Logs are safely stored in Cloud Storage."
echo " Desktop App : (Use the Service URL printed above)"
echo " Mobile App  : (Use Service URL)/mobile.html"
echo " Activity Log: (Use Service URL)/api/logs"
echo "====================================================================="

