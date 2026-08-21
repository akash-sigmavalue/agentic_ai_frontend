#!/bin/bash

set -Eeuo pipefail

ROOT_DIR="/opt/agentic-ai"

echo "========================================"
echo "Validating frontend"
echo "========================================"

for attempt in $(seq 1 30); do

    if curl -fsS \
        --connect-timeout 3 \
        --max-time 5 \
        http://localhost/ \
        > /dev/null; then

        echo "Frontend validation passed."
        exit 0
    fi

    echo "Frontend not ready. Attempt ${attempt}/30..."
    sleep 5
done

echo "ERROR: Frontend validation failed."

cd "$ROOT_DIR"

echo "Frontend container status:"
docker compose ps frontend || true

echo "Frontend logs:"
docker compose logs --tail=150 frontend || true

echo "Nginx status:"
docker compose ps nginx || true

echo "Nginx logs:"
docker compose logs --tail=100 nginx || true

exit 1