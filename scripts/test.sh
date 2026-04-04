#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/../guess-number-app"

echo "Running server & common tests..."
npx jest --config jest.config.js
