#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Preparing Render deployment with Ollama and Nginx...${NC}"

# Build the Docker image
echo -e "${YELLOW}Building Docker image for Render deployment...${NC}"
docker build -t chatbot-ollama-nginx -f Dockerfile .

if [ $? -ne 0 ]; then
  echo -e "${RED}Docker build failed${NC}"
  exit 1
fi

echo -e "${GREEN}Docker image built successfully${NC}"

# Create a temporary directory for render-specific files
RENDER_DIR="render-deploy"
mkdir -p $RENDER_DIR

# Create a render.yaml file specific for Docker deployment
cat > $RENDER_DIR/render.yaml << EOF
services:
  - type: web
    name: chatbot
    env: docker
    region: ohio
    plan: standard
    branch: main
    dockerfilePath: ./Dockerfile
    dockerCommand: /usr/src/app/docker-entrypoint.sh
    envVars:
      - key: RENDER
        value: "true"
      - key: OLLAMA_HOST
        value: http://localhost:8081/ollama
      - key: OLLAMA_MODEL
        value: llama3.2
      - key: OLLAMA_CONNECT_TIMEOUT
        value: "10000"
      - key: NODE_ENV
        value: production
      - key: PORT
        value: "10000"
    healthCheckPath: /health
    # Explicitly set the IP binding to avoid issues
    autoDeploy: false
EOF

echo -e "${GREEN}Render deployment files created in ${RENDER_DIR} directory${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Upload this repository to GitHub"
echo -e "2. Connect your GitHub repository to Render"
echo -e "3. Select 'Deploy from Dockerfile'"
echo -e "4. Use the provided render.yaml file for configuration"
echo -e "5. Monitor the build and deployment in Render dashboard"
echo -e ""
echo -e "${GREEN}Done!${NC}" 