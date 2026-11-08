#!/usr/bin/env bash
# Deploy Railway Detention System to Google Cloud Run with Persistent Cloud Storage
set -e

SERVICE_NAME="${1:-railway-detention}"
REGION="${2:-us-central1}"
BUCKET_NAME="${3:-railway-detention-data-banda17}"

echo "====================================================================="
echo " Deploying Railway Terminal Detention System to Google Cloud Run"
echo " Service : ${SERVICE_NAME}"
echo " Region  : ${REGION}"
echo " Storage : gs://${BUCKET_NAME} (Persistent SQLite Volume)"
echo "====================================================================="

# Ensure bucket exists
if ! gsutil ls -b "gs://${BUCKET_NAME}" >/dev/null 2>&1; then
  echo "Creating persistent Cloud Storage bucket gs://${BUCKET_NAME}..."
  gsutil mb -l "${REGION}" "gs://${BUCKET_NAME}" || true
fi

# Deploy with persistent volume attached to /mnt/data
gcloud run deploy "${SERVICE_NAME}" \
  --source . \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --set-env-vars "DB_PATH=/mnt/data/detention.db" \
  --add-volume name=data-vol,type=cloud-storage,bucket="${BUCKET_NAME}" \
  --add-volume-mount volume=data-vol,mount-path=/mnt/data

echo ""
echo "====================================================================="
echo " Deployment Complete! Data is safely stored in Cloud Storage."
echo " Desktop App : (Use the Service URL printed above)"
echo " Mobile App  : (Use Service URL)/mobile.html"
echo " Activity Log: (Use Service URL)/api/logs"
echo "====================================================================="

