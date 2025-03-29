# Multi-stage build for chatbot with Ollama and Nginx
FROM node:20-bullseye-slim AS builder

# Create app directory
WORKDIR /usr/src/app

# Install build dependencies for TensorFlow.js and Nginx
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    build-essential \
    python-is-python3 \
    wget \
    curl \
    ca-certificates \
    git \
    pkg-config \
    libcairo2-dev \
    libglib2.0-dev \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# Copy package files from server directory
COPY server/package*.json ./

# Install node-gyp globally and clear npm cache
RUN npm install -g node-gyp && npm cache clean --force

# Install all dependencies with production flag and explicitly rebuild TensorFlow.js
RUN npm ci --only=production && \
    cd node_modules/@tensorflow/tfjs-node && \
    npm rebuild @tensorflow/tfjs-node --build-from-source

# Copy server source code
COPY server/ ./

# Prune dev dependencies and tests
RUN npm prune --production && \
    rm -rf tests/ test-*.js *.test.js *.spec.js docs/

# Download and set up Ollama
ENV OLLAMA_VERSION=0.1.37
ENV OLLAMA_MODEL=llama3.2

RUN mkdir -p /usr/local/ollama && \
    curl -L https://github.com/ollama/ollama/releases/download/v${OLLAMA_VERSION}/ollama-linux-amd64 -o /usr/local/ollama/ollama && \
    chmod +x /usr/local/ollama/ollama

# Production stage
FROM node:20-bullseye-slim

# Create app directory
WORKDIR /usr/src/app

# Install runtime dependencies needed for TensorFlow.js and Nginx
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python-is-python3 \
    libcairo2 \
    libglib2.0-0 \
    libc6 \
    libstdc++6 \
    nginx \
    curl \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Copy built node modules and app files from the builder stage
COPY --from=builder /usr/src/app .
COPY --from=builder /usr/local/ollama /usr/local/ollama

# Create Nginx configuration for Ollama proxy
RUN mkdir -p /etc/nginx/conf.d
COPY server/start-ollama-nginx.sh /usr/src/app/
RUN chmod +x /usr/src/app/start-ollama-nginx.sh

# Create Nginx configuration file
RUN echo 'server { \
    listen 8081; \
    server_name localhost; \
\
    # Allow large uploads \
    client_max_body_size 25M; \
\
    # CORS headers for all responses \
    add_header "Access-Control-Allow-Origin" "*" always; \
    add_header "Access-Control-Allow-Methods" "GET, POST, OPTIONS" always; \
    add_header "Access-Control-Allow-Headers" "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" always; \
    add_header "Access-Control-Expose-Headers" "Content-Length,Content-Range" always; \
\
    # Handle preflight requests \
    if ($request_method = "OPTIONS") { \
        add_header "Access-Control-Allow-Origin" "*"; \
        add_header "Access-Control-Allow-Methods" "GET, POST, OPTIONS"; \
        add_header "Access-Control-Allow-Headers" "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization"; \
        add_header "Access-Control-Max-Age" 1728000; \
        add_header "Content-Type" "text/plain; charset=utf-8"; \
        add_header "Content-Length" 0; \
        return 204; \
    } \
\
    # Reverse proxy configuration for Ollama \
    location /ollama/ { \
        # Remove the /ollama/ prefix when forwarding requests \
        rewrite ^/ollama/(.*) /$1 break; \
\
        # Forward requests to Ollama \
        proxy_pass http://localhost:11434/; \
        proxy_http_version 1.1; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
\
        # WebSocket support for streaming responses \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
\
        # Timeouts \
        proxy_connect_timeout 300s; \
        proxy_send_timeout 300s; \
        proxy_read_timeout 300s; \
    } \
}' > /etc/nginx/conf.d/ollama.conf

# Create startup script
RUN echo '#!/bin/bash \n\
set -e \n\
\n\
# Start Ollama in the background \n\
echo "Starting Ollama..." \n\
/usr/local/ollama/ollama serve & \n\
OLLAMA_PID=$! \n\
\n\
# Give Ollama time to start \n\
sleep 3 \n\
\n\
# Start Nginx in the background \n\
echo "Starting Nginx..." \n\
nginx \n\
NGINX_PID=$! \n\
\n\
# Set environment variables \n\
export RENDER=true \n\
export OLLAMA_HOST=http://localhost:8081/ollama \n\
export OLLAMA_MODEL=llama3.2 \n\
export NODE_ENV=production \n\
export OLLAMA_CONNECT_TIMEOUT=10000 \n\
export PORT=10000 \n\
export LD_LIBRARY_PATH=/usr/src/app/node_modules/@tensorflow/tfjs-node/lib/napi-v8/:$LD_LIBRARY_PATH \n\
\n\
# Verify Ollama is running \n\
echo "Checking Ollama connection..." \n\
if curl -s http://localhost:11434/api/version > /dev/null; then \n\
  echo "✅ Ollama is running" \n\
else \n\
  echo "⚠️ Warning: Ollama is not responding" \n\
fi \n\
\n\
# Verify Nginx + Ollama proxy is working \n\
echo "Checking Nginx proxy to Ollama..." \n\
if curl -s http://localhost:8081/ollama/api/version > /dev/null; then \n\
  echo "✅ Nginx proxy to Ollama is working" \n\
else \n\
  echo "⚠️ Warning: Nginx proxy to Ollama is not working" \n\
fi \n\
\n\
# Start the Node.js application \n\
echo "Starting Node.js application..." \n\
exec node server.js' > /usr/src/app/docker-entrypoint.sh

RUN chmod +x /usr/src/app/docker-entrypoint.sh

# Set environment variables
ENV NODE_ENV=production
ENV PORT=10000
ENV RENDER=true
ENV OLLAMA_HOST=http://localhost:8081/ollama
ENV OLLAMA_MODEL=llama3.2
ENV OLLAMA_CONNECT_TIMEOUT=10000
# Make sure TensorFlow can find its dependencies
ENV LD_LIBRARY_PATH=/usr/src/app/node_modules/@tensorflow/tfjs-node/lib/napi-v8/:$LD_LIBRARY_PATH

# Expose ports for Node.js, Nginx, and Ollama
EXPOSE 10000
EXPOSE 8081
EXPOSE 11434

# Command to run the app with Ollama and Nginx
CMD ["/usr/src/app/docker-entrypoint.sh"] 