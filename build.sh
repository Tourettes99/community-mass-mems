#!/bin/bash
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "Installing dependencies..."
npm config set legacy-peer-deps=true
npm ci --prefer-offline
echo "Building..."
CI=false npm run build
