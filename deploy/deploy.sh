#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "Deploying Guess Number Game..."

# Check .prod.env
if [ ! -f ../env/.prod.env ]; then
    echo "ERROR: ../env/.prod.env not found. Create it from .prod.env template."
    exit 1
fi

# Export env vars for docker-compose build args
set -a
source ../env/.prod.env
set +a

if [ "$1" = "--all" ]; then
    echo "Rebuilding all services..."
    docker compose down
    docker compose build --no-cache
    docker compose up -d
else
    echo "Rebuilding app only (keeping redis running)..."
    docker compose build --no-cache app
    docker compose up -d --no-deps app
fi

echo ""
echo "Deployment complete!"
echo "  App:   https://guessnumber.flamebots.org"
echo "  Logs:  docker compose logs -f"
