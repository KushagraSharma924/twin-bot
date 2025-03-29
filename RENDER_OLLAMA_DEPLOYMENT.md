# Deploying Chatbot with Ollama and Nginx on Render

This guide explains how to deploy the chatbot application to Render with Ollama and Nginx running in the same container.

## Architecture

The deployment architecture is designed to run all services within a single container:

```
+---------------------------------------------+
|                   Container                 |
|                                             |
|  +------------+      +------------------+   |
|  |            |      |                  |   |
|  |   Ollama   |<---->|  Nginx (8081)    |   |
|  |  (11434)   |      |                  |   |
|  +------------+      +------------------+   |
|         ^                   ^               |
|         |                   |               |
|         v                   v               |
|  +------------------------------------------+
|  |         Node.js Application (10000)      |
|  +------------------------------------------+
|                                             |
+---------------------------------------------+
```

- **Ollama**: Runs the LLM inference service on port 11434
- **Nginx**: Acts as a reverse proxy on port 8081, forwarding requests to Ollama
- **Node.js**: The main application running on port 10000

## Deployment Options

### Option 1: Deploy using Docker (Recommended)

1. Run the deployment script to prepare the files:

```bash
./deploy-render.sh
```

2. Upload your repository to GitHub

3. In Render:
   - Create a new Web Service
   - Connect your GitHub repository
   - Select "Deploy from Dockerfile"
   - Use the Dockerfile at the root of your repository
   - Deploy the service

### Option 2: Deploy using Render.yaml

1. Push your code to GitHub with the `render.yaml` file at the root

2. In Render:
   - Create a new Blueprint
   - Connect your GitHub repository
   - Render will automatically detect and use the `render.yaml` configuration
   - Deploy the blueprint

## Environment Variables

These environment variables are configured in both the Dockerfile and render.yaml:

| Variable | Description | Default Value |
|----------|-------------|---------------|
| RENDER | Flag to indicate Render deployment | true |
| OLLAMA_HOST | URL to the Ollama service via Nginx | http://localhost:8081/ollama |
| OLLAMA_MODEL | The Ollama model to use | llama3.2 |
| OLLAMA_CONNECT_TIMEOUT | Connection timeout in milliseconds | 10000 |
| NODE_ENV | Node.js environment | production |
| PORT | Application port | 10000 |

## Troubleshooting

If you encounter issues with the deployment:

1. **Ollama not starting**: Check the logs for errors related to Ollama initialization. You may need to increase the resource allocation in your Render plan.

2. **Nginx configuration issues**: The logs will show if there are any errors in the Nginx configuration. Check if the proxy settings are correct.

3. **Connection refused errors**: This typically means Ollama is not running or Nginx is not properly configured to proxy requests to it.

4. **Memory issues**: Ollama requires significant memory to run, especially with larger models. Consider upgrading your Render plan if you see out-of-memory errors.

## Monitoring

You can monitor the services through the Render dashboard. The application includes a health check endpoint at `/health` that provides information about the status of all services.

## Customization

To use a different Ollama model:

1. Edit the `OLLAMA_MODEL` environment variable in the Dockerfile or render.yaml
2. Redeploy the application

## Security Considerations

This setup runs Ollama within the same container as your application. In a production environment, you might want to:

1. Implement proper authentication for the Ollama API
2. Add rate limiting in Nginx to prevent abuse
3. Consider adding TLS/SSL for secure connections

Remember that this deployment runs on a single container, which means Ollama shares resources with your application. For production workloads with higher traffic, consider separating these services. 