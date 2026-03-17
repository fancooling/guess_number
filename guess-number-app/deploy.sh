#!/bin/bash

if ! command -v gcloud &> /dev/null
then
    echo "❌ ERROR: gcloud CLI could not be found."
    echo "Google Cloud Run deployment requires the Google Cloud SDK."
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    echo "After installation, run 'gcloud auth login' and try this script again."
    exit 1
fi

# Load .env file if it exists
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# Check if Firebase config is set via environment variables
if [ -z "$FIREBASE_API_KEY" ] || [ -z "$FIREBASE_PROJECT_ID" ]; then
    echo "❌ ERROR: Firebase environment variables not set."
    echo "Please set them before deploying:"
    echo "  export FIREBASE_API_KEY=your_api_key"
    echo "  export FIREBASE_PROJECT_ID=your_project_id"
    echo "  export FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com"
    echo "  export FIREBASE_STORAGE_BUCKET=your_project.appspot.com"
    echo "  export FIREBASE_MESSAGING_SENDER_ID=your_sender_id"
    echo "  export FIREBASE_APP_ID=your_app_id"
    echo "  export FIREBASE_DB_NAME=(default)  # optional"
    exit 1
fi

echo "🚀 Deploying to Google Cloud Run (austin-test-450819)..."

gcloud run deploy guessnumber \
  --source . \
  --project austin-test-450819 \
  --region us-west1 \
  --allow-unauthenticated \
  --port 8080

echo ""
echo "Deployment successful."
echo "IMPORTANT: Don't forget to map your custom domain 'guessnumber.flamebots.org' to this Cloud Run service in the Google Cloud Console:"
echo "1. Go to Cloud Run -> 'guessnumber' service"
echo "2. Click -> Integrations -> Add Integration -> Custom Domains"
echo "3. Follow the steps to map 'guessnumber.flamebots.org'"
