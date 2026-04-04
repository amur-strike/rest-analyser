#!/bin/bash

set -e

echo "Building and running backend in Docker locally..."

cd backend

# Build Docker image
docker build -t rest-analyser-backend .

# Run container
docker run -d \
  --name rest-analyser-backend \
  -p 3001:3001 \
  -v $(pwd)/data:/app/data \
  -e NODE_ENV=development \
  -e BASE_URL=http://localhost:3001 \
  rest-analyser-backend

echo "Backend is running on http://localhost:3001"
echo "To view logs: docker logs -f rest-analyser-backend"
echo "To stop: docker stop rest-analyser-backend"
echo "To remove: docker rm rest-analyser-backend"
