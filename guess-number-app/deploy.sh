#!/bin/bash
echo "Deploying to Google Cloud Run (austin-test-450819)..."

gcloud run deploy guessnumber \
  --source . \
  --project austin-test-450819 \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080

echo ""
echo "Deployment successful."
echo "IMPORTANT: Don't forget to map your custom domain 'guessnumber.flamebots.org' to this Cloud Run service in the Google Cloud Console:"
echo "1. Go to Cloud Run -> 'guessnumber' service"
echo "2. Click -> Integrations -> Add Integration -> Custom Domains"
echo "3. Follow the steps to map 'guessnumber.flamebots.org'"
