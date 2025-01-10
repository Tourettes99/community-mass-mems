#!/bin/bash

# Build the React app
npm run build

# Ensure _headers file is copied to build directory
cp public/_headers build/

echo "Build completed and _headers copied to build directory"
