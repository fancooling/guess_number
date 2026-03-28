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

# Check if Firebase config is available (either via env vars or environment.ts)
ENV_TS="src/environments/environment.ts"
if [ -z "$FIREBASE_API_KEY" ] || [ -z "$FIREBASE_PROJECT_ID" ]; then
    if [ -f "$ENV_TS" ] && grep -q "apiKey" "$ENV_TS"; then
        echo "ℹ️  Using Firebase config from $ENV_TS"
    else
        echo "❌ ERROR: Firebase config not found."
        echo "Either set environment variables or edit $ENV_TS"
        exit 1
    fi
fi

PROJECT_ID="austin-test-450819"
REGION="us-west1"
SERVICE_NAME="guessnumber"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🚀 Deploying to Google Cloud Run (${PROJECT_ID})..."

# Build the Docker image, passing Firebase env vars as build args if set
echo "📦 Building Docker image..."
BUILD_ARGS=""
if [ -n "$FIREBASE_API_KEY" ]; then
    BUILD_ARGS="$BUILD_ARGS --build-arg FIREBASE_API_KEY=${FIREBASE_API_KEY}"
    BUILD_ARGS="$BUILD_ARGS --build-arg FIREBASE_AUTH_DOMAIN=${FIREBASE_AUTH_DOMAIN}"
    BUILD_ARGS="$BUILD_ARGS --build-arg FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}"
    BUILD_ARGS="$BUILD_ARGS --build-arg FIREBASE_STORAGE_BUCKET=${FIREBASE_STORAGE_BUCKET}"
    BUILD_ARGS="$BUILD_ARGS --build-arg FIREBASE_MESSAGING_SENDER_ID=${FIREBASE_MESSAGING_SENDER_ID}"
    BUILD_ARGS="$BUILD_ARGS --build-arg FIREBASE_APP_ID=${FIREBASE_APP_ID}"
    BUILD_ARGS="$BUILD_ARGS --build-arg FIREBASE_DB_NAME=${FIREBASE_DB_NAME:-(default)}"
fi

gcloud builds submit \
  --project "$PROJECT_ID" \
  --tag "$IMAGE" \
  $BUILD_ARGS

if [ $? -ne 0 ]; then
    echo "❌ ERROR: Docker image build failed."
    exit 1
fi

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --image "$IMAGE" \
  --allow-unauthenticated \
  --port 8080

if [ $? -ne 0 ]; then
    echo "❌ ERROR: Cloud Run deployment failed."
    exit 1
fi

echo ""
echo "✅ Deployment successful."
echo "IMPORTANT: Don't forget to map your custom domain 'guessnumber.flamebots.org' to this Cloud Run service in the Google Cloud Console:"
echo "1. Go to Cloud Run -> 'guessnumber' service"
echo "2. Click -> Integrations -> Add Integration -> Custom Domains"
echo "3. Follow the steps to map 'guessnumber.flamebots.org'"
