#!/bin/bash

set -Eeuo pipefail

DEPLOY_DIR="/opt/agentic-ai/deployments/frontend"
APP_DIR="/opt/agentic-ai/agentic_ai_frontend"
ROOT_DIR="/opt/agentic-ai"

# Frontend and backend use the same Docker Compose project.
# This lock prevents both deployments from modifying Docker at the same time.
LOCK_FILE="/tmp/agentic-ai-docker-deploy.lock"

echo "========================================"
echo "Starting frontend deployment"
echo "========================================"

mkdir -p "$APP_DIR"

echo "Syncing frontend files..."

rsync -a --delete \
  --exclude ".git" \
  --exclude "node_modules" \
  --exclude ".next" \
  "$DEPLOY_DIR/" "$APP_DIR/"

cd "$ROOT_DIR"

# File descriptor 9 is used for the deployment lock.
exec 9>"$LOCK_FILE"

echo "Waiting for Docker deployment lock..."

if ! flock -w 1200 9; then
    echo "ERROR: Could not acquire Docker deployment lock within 20 minutes."
    exit 1
fi

echo "Docker deployment lock acquired."

echo "Building frontend Docker image..."

if ! docker compose build frontend; then
    echo "ERROR: Frontend Docker build failed."
    docker compose logs --tail=100 frontend || true
    exit 1
fi

echo "Starting frontend container..."

if ! docker compose up -d --no-deps frontend; then
    echo "ERROR: Frontend container failed to start."
    docker compose logs --tail=100 frontend || true
    exit 1
fi

echo "Frontend container status:"
docker compose ps frontend || true

echo "Restarting nginx..."
docker compose restart nginx

echo "Nginx status:"
docker compose ps nginx || true

echo "Releasing Docker deployment lock..."

flock -u 9

echo "========================================"
echo "Frontend deployment completed"
echo "========================================"