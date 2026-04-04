#!/bin/bash

set -e

echo "Building frontend..."

cd frontend

# Install dependencies
npm install

# Build for production
npm run build

echo "Frontend build complete!"
echo "Build output is in frontend/dist"
