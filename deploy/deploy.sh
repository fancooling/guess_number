#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "Deploying Guess Number Game..."

# Auto-detect public IP for nginx port binding
export HOST_IP=$(hostname -I | awk '{print $1}')
echo "Binding to HOST_IP=$HOST_IP"

# Check .prod.env
if [ ! -f ../env/.prod.env ]; then
    echo "ERROR: ../env/.prod.env not found. Create it from .prod.env template."
    exit 1
fi

# Export env vars for docker-compose build args
set -a
source ../env/.prod.env
set +a

docker compose down
docker compose build --no-cache
docker compose up -d

echo ""
echo "Deployment complete!"
echo "  App:   https://guessnumber.flamebots.org"
echo "  Logs:  docker compose logs -f"
