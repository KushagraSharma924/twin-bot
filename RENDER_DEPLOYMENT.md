# Render Deployment Guide

This guide provides instructions for deploying the server on [Render](https://render.com/).

## Setting Up on Render

### 1. Create a New Web Service

1. Sign in to your Render account
2. From the dashboard, click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Select the repository containing this application

### 2. Configure the Web Service

Fill in the following configuration details:

- **Name**: Choose a name for your service (e.g., `ai-digital-twin-server`)
- **Environment**: Select "Docker"
- **Branch**: Choose the branch to deploy (usually `main` or `master`)
- **Root Directory**: Leave blank (the Dockerfile is in the root)

### 3. Advanced Settings

Click on "Advanced" and add the following environment variables from your `.env` file:

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_KEY`
- `AZURE_OPENAI_KEY` (if used)
- `AZURE_OPENAI_ENDPOINT` (if used)
- `GOOGLE_CLIENT_ID` (if used)
- `GOOGLE_CLIENT_SECRET` (if used)
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- Other configuration variables as needed

### 4. Configure Instance Type

Choose an instance type that has enough resources to run TensorFlow.js. The minimum recommended is:

- At least 2GB RAM
- 1 CPU or higher

### 5. Create Web Service

Click "Create Web Service" to start the deployment.

## Troubleshooting

### TensorFlow.js Issues

If you encounter TensorFlow.js issues, you can check the logs in the Render dashboard. Common issues:

1. **Memory Limits**: TensorFlow.js requires sufficient memory. If your app crashes, consider upgrading to a plan with more RAM.

2. **Dependencies**: The Dockerfile installs necessary dependencies, but if there are issues, you may need to modify the Dockerfile to include additional system libraries.

3. **Startup Timeout**: Render has a startup timeout. TensorFlow.js initialization can sometimes exceed this limit. If needed, contact Render support to increase the startup timeout for your service.

### Logs

To view logs and diagnose issues:

1. Go to your service in the Render dashboard
2. Click on "Logs" in the navigation bar
3. Select "Live" to see real-time logs or "Recent" to view historical logs

## Scaling

If you need to scale your application:

1. Go to your service in the Render dashboard
2. Click on "Settings"
3. Under "Instance Type," select a higher tier with more resources
4. Save changes

## Custom Domains

To set up a custom domain:

1. Go to your service in the Render dashboard
2. Click on "Settings"
3. Under "Custom Domain," click "Add Domain"
4. Follow the instructions to add and verify your domain 