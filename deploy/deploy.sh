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
    echo "Rebuilding all services (app, redis, redisinsight)..."
    docker compose down
    docker compose build --no-cache
    docker compose up -d
else
    echo "Rebuilding app only (keeping redis & redisinsight running)..."
    docker compose build --no-cache app
    docker compose up -d --no-deps app
fi

echo ""
echo "Deployment complete!"
echo "  App:          https://guessnumber.flamebots.org"
echo "  Logs:         docker compose logs -f"
echo "  RedisInsight: http://127.0.0.1:5540 on the VPS"
echo "                (from local: ssh -L 5540:localhost:5540 <vps-user>@<vps-host>)"
