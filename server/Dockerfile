# Build stage
FROM node:20-bullseye-slim AS builder

# Create app directory
WORKDIR /usr/src/app

# Install all the build dependencies needed for TensorFlow.js
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
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install node-gyp globally and clear npm cache
RUN npm install -g node-gyp && npm cache clean --force

# Install all dependencies with production flag and explicitly rebuild TensorFlow.js
RUN npm ci --only=production && \
    cd node_modules/@tensorflow/tfjs-node && \
    npm rebuild @tensorflow/tfjs-node --build-from-source

# Copy app source
COPY . .

# Prune dev dependencies and tests
RUN npm prune --production && \
    rm -rf tests/ test-*.js *.test.js *.spec.js docs/ 

# Production stage
FROM node:20-bullseye-slim

# Create app directory
WORKDIR /usr/src/app

# Install runtime dependencies needed for TensorFlow.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python-is-python3 \
    libcairo2 \
    libglib2.0-0 \
    libc6 \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

# Copy built node modules and app files from the builder stage
COPY --from=builder /usr/src/app .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5002
# Make sure TensorFlow can find its dependencies
ENV LD_LIBRARY_PATH=/usr/src/app/node_modules/@tensorflow/tfjs-node/lib/napi-v8/:$LD_LIBRARY_PATH

# Expose the port the app runs on
EXPOSE 5002

# Command to run the app
CMD ["node", "server.js"] 