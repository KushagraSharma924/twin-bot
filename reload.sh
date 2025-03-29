#!/bin/bash

echo "Stopping existing server processes..."
pkill -f "node server.js" || echo "No server processes found"

echo "Starting server..."
cd /Users/kushagra/Desktop/chatbot/server
npm run dev
