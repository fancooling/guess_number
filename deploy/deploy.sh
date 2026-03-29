#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "Deploying Guess Number Game..."

# Check .prod.env
if [ ! -f ../env/.prod.env ]; then
    echo "ERROR: ../env/.prod.env not found. Create it from .prod.env template."
    exit 1
fi

docker compose down
docker compose build --no-cache
docker compose up -d

echo ""
echo "Deployment complete!"
echo "  App:   http://guessnumber.flamebots.org"
echo "  Logs:  docker compose logs -f"
