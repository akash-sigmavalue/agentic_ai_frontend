#!/bin/bash
set -e

echo "Validating frontend..."

curl -f http://localhost > /dev/null

echo "Frontend validation passed."