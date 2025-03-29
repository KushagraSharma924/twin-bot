# Docker Guide for Server

This document provides instructions for building, running, and troubleshooting the server Docker container.

## Building the Docker Image

To build the Docker image, run:

```bash
cd server
docker build -t ai-digital-twin-server .
```

## Running the Docker Container

To run the container:

```bash
docker run -p 5002:5002 --env-file .env ai-digital-twin-server
```

Make sure you have a `.env` file with the required environment variables.

## Testing TensorFlow.js Installation

To test if TensorFlow.js is working correctly inside the container:

```bash
docker run ai-digital-twin-server node test-tensorflow.js
```

## Troubleshooting TensorFlow.js Issues

If you encounter the error `cannot open shared object file: No such file or directory` for TensorFlow.js, it could be due to:

1. **Missing Dependencies**: Ensure the container has all required system libraries. The current Dockerfile installs:
   - libcairo2
   - libglib2.0-0
   - libc6
   - libstdc++6

2. **Path Issues**: The `LD_LIBRARY_PATH` environment variable should point to the TensorFlow.js native bindings directory. Check that this is set correctly in the Dockerfile.

3. **Compilation Issues**: TensorFlow.js native bindings might need to be rebuilt from source. The Dockerfile includes this step during the build phase.

4. **To debug TensorFlow.js inside the container**:

   ```bash
   docker run -it --entrypoint /bin/bash ai-digital-twin-server
   cd /usr/src/app
   ls -la node_modules/@tensorflow/tfjs-node/lib/napi-v8/
   node test-tensorflow.js
   ```

## Reducing Docker Image Size

To clean up unnecessary Docker resources and reduce disk usage, run:

```bash
./docker-cleanup.sh
```

This script removes stopped containers, dangling images, and build cache.

## Common Commands

- Build with no cache (if dependencies changed): 
  ```bash
  docker build --no-cache -t ai-digital-twin-server .
  ```

- Check image size: 
  ```bash
  docker images ai-digital-twin-server
  ```

- Remove the image: 
  ```bash
  docker rmi ai-digital-twin-server
  ``` 