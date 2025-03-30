#!/bin/bash

# Start the server with mock authentication enabled for testing

# Set environment variables
export USE_MOCK_AUTH=true
export NODE_ENV=development

# Print information
echo "Starting server with mock authentication enabled"
echo "This is for UI testing only - no real emails will be sent or received"

# Start the server
echo "Starting Express server..."
cd server && node server.js 