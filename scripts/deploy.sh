#!/bin/bash

set -e

echo "Starting deployment process..."

# Build frontend
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Build and deploy CDK
echo "Deploying infrastructure..."
cd cdk
npm install
npm run build
npm run deploy

echo "Deployment complete!"
