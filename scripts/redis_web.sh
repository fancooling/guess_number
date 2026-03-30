#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../env/.dev.env"

PORT=8081
REDIS_HOST=${REDIS_HOST:-localhost}
REDIS_PORT=${REDIS_PORT:-6379}

# Stop any existing redis-commander container
docker rm -f redis-commander 2>/dev/null

docker run -d --rm \
  --name redis-commander \
  --network host \
  -e REDIS_HOSTS=local:${REDIS_HOST}:${REDIS_PORT} \
  -e PORT=${PORT} \
  rediscommander/redis-commander

if [ $? -eq 0 ]; then
  echo "Redis Commander is running at: http://localhost:${PORT}"
else
  echo "Failed to start Redis Commander" >&2
  exit 1
fi
