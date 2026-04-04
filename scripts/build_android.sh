#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/../guess-number-app"

echo "Building Angular app..."
npm run build -- --configuration production

echo "Syncing Capacitor..."
npx cap sync android

cd android

if [ "$1" = "--production" ]; then
    if [ -z "$KEYSTORE_PASSWORD" ]; then
        read -s -p "Enter keystore password: " KEYSTORE_PASSWORD
        echo
        export KEYSTORE_PASSWORD
    fi
    echo "Building release bundle and APK..."
    ./gradlew bundleRelease assembleRelease
    echo ""
    echo "Release bundle: android/app/build/outputs/bundle/release/app-release.aab"
    echo "Release APK:    android/app/build/outputs/apk/release/app-release.apk"
else
    echo "Building debug APK..."
    ./gradlew assembleDebug
    echo ""
    echo "Debug APK: android/app/build/outputs/apk/debug/app-debug.apk"
fi
