#!/bin/bash

# Directory where Ollama is installed
OLLAMA_DIR="../ollama"
NGINX_CONF="$OLLAMA_DIR/ollama-nginx.conf"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Ollama and Nginx for Render deployment...${NC}"

# Check if Ollama directory exists
if [ ! -d "$OLLAMA_DIR" ]; then
  echo -e "${YELLOW}Creating Ollama directory...${NC}"
  mkdir -p "$OLLAMA_DIR"
fi

# Check if Ollama binary exists
if [ ! -f "$OLLAMA_DIR/ollama" ]; then
  echo -e "${YELLOW}Downloading Ollama...${NC}"
  curl -L https://github.com/ollama/ollama/releases/download/v0.1.37/ollama-linux-amd64 -o "$OLLAMA_DIR/ollama"
  chmod +x "$OLLAMA_DIR/ollama"
fi

# Create Nginx configuration file
echo -e "${YELLOW}Creating Nginx configuration...${NC}"
cat > "$NGINX_CONF" << EOF
# Ollama Proxy Configuration

worker_processes 1;
error_log /tmp/nginx-error.log;
pid /tmp/nginx.pid;

events {
    worker_connections 1024;
}

http {
    access_log /tmp/nginx-access.log;
    
    server {
        listen 8081;
        server_name localhost;

        # Allow large uploads
        client_max_body_size 25M;
        
        # CORS headers for all responses
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;

        # Handle preflight requests
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }

        # Reverse proxy configuration for Ollama
        location /ollama/ {
            # Remove the /ollama/ prefix when forwarding requests
            rewrite ^/ollama/(.*) /\$1 break;
            
            # Forward requests to Ollama
            proxy_pass http://localhost:11434/;
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            
            # WebSocket support for streaming responses
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "upgrade";
            
            # Timeouts
            proxy_connect_timeout 300s;
            proxy_send_timeout 300s;
            proxy_read_timeout 300s;
        }
    }
}
EOF

# Check if Ollama is already running
if pgrep -x "ollama" > /dev/null; then
  echo -e "${GREEN}Ollama is already running${NC}"
else
  echo -e "${YELLOW}Starting Ollama...${NC}"
  cd "$OLLAMA_DIR" && ./ollama serve > /tmp/ollama.log 2>&1 &
  
  # Wait for Ollama to start
  echo -e "${YELLOW}Waiting for Ollama to initialize...${NC}"
  sleep 5
  
  # Check if Ollama started successfully
  if curl -s http://localhost:11434/api/version > /dev/null; then
    echo -e "${GREEN}Ollama started successfully${NC}"
  else
    echo -e "${RED}Failed to start Ollama${NC}"
    cat /tmp/ollama.log
  fi
fi

# Check if Nginx is already running on port 8081
if netstat -tuln | grep ":8081 " > /dev/null; then
  echo -e "${GREEN}Nginx is already running on port 8081${NC}"
else
  echo -e "${YELLOW}Starting Nginx...${NC}"
  nginx -c "$NGINX_CONF" -p "$OLLAMA_DIR/"
  
  # Check if Nginx started successfully
  if netstat -tuln | grep ":8081 " > /dev/null; then
    echo -e "${GREEN}Nginx started successfully on port 8081${NC}"
  else
    echo -e "${RED}Failed to start Nginx${NC}"
  fi
fi

# Check if Ollama is accessible through Nginx
echo -e "${YELLOW}Testing Ollama through Nginx...${NC}"
if curl -s http://localhost:8081/ollama/api/version > /dev/null; then
  echo -e "${GREEN}Ollama is accessible through Nginx proxy${NC}"
else
  echo -e "${RED}Ollama is not accessible through Nginx proxy${NC}"
fi

echo -e "${GREEN}Setup complete!${NC}"
echo -e "Ollama API URL: ${YELLOW}http://localhost:8081/ollama${NC}" 