#!/bin/bash
set -e

DEPLOY_DIR="/opt/agentic-ai/deployments/frontend"
APP_DIR="/opt/agentic-ai/agentic_ai_frontend"
ROOT_DIR="/opt/agentic-ai"

echo "Starting frontend deployment..."

mkdir -p "$APP_DIR"

rsync -a --delete \
  --exclude ".git" \
  --exclude "node_modules" \
  --exclude ".next" \
  "$DEPLOY_DIR/" "$APP_DIR/"

cd "$ROOT_DIR"

echo "Building frontend Docker container..."
docker compose build frontend

echo "Starting frontend Docker container..."
docker compose up -d frontend

echo "Restarting nginx..."
docker compose restart nginx

echo "Cleaning old Docker images..."
docker image prune -f

echo "Frontend deployment completed."