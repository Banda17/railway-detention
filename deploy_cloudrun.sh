#!/usr/bin/env bash
# Deploy Railway Detention System to Google Cloud Run
set -e

SERVICE_NAME="${1:-railway-detention}"
REGION="${2:-us-central1}"

echo "====================================================================="
echo " Deploying Railway Terminal Detention System to Google Cloud Run"
echo " Service : ${SERVICE_NAME}"
echo " Region  : ${REGION}"
echo "====================================================================="

gcloud run deploy "${SERVICE_NAME}" \
  --source . \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080

echo ""
echo "====================================================================="
echo " Deployment Complete!"
echo " Desktop App : (Use the Service URL printed above)"
echo " Mobile App  : (Use Service URL)/mobile.html"
echo "====================================================================="

