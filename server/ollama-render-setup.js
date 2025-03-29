/**
 * Ollama Setup Script for Render
 * 
 * This script downloads and sets up Ollama on Render.
 * It's designed to be run during the Render build process.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ollama configuration
const OLLAMA_VERSION = '0.1.37';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const OLLAMA_DIR = path.join(__dirname, '..', 'ollama');

// Main setup function
async function setupOllama() {
  try {
    console.log('📌 Setting up Ollama on Render...');
    
    // Check if we're running on Render
    if (!process.env.RENDER) {
      console.warn('⚠️ This script is intended to run on Render. Exiting.');
      return;
    }
    
    // Create Ollama directory
    if (!fs.existsSync(OLLAMA_DIR)) {
      console.log(`Creating directory: ${OLLAMA_DIR}`);
      fs.mkdirSync(OLLAMA_DIR, { recursive: true });
    }
    
    // Download Ollama
    console.log(`Downloading Ollama v${OLLAMA_VERSION}...`);
    execSync(`curl -L https://github.com/ollama/ollama/releases/download/v${OLLAMA_VERSION}/ollama-linux-amd64 -o ${OLLAMA_DIR}/ollama`);
    execSync(`chmod +x ${OLLAMA_DIR}/ollama`);
    
    // Start Ollama server in the background
    console.log('Starting Ollama server...');
    execSync(`cd ${OLLAMA_DIR} && ./ollama serve &`);
    console.log('Waiting for Ollama to initialize...');
    
    // Give Ollama time to start
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Pull the specified model
    console.log(`Pulling model: ${OLLAMA_MODEL}...`);
    execSync(`${OLLAMA_DIR}/ollama pull ${OLLAMA_MODEL}`);
    
    console.log(`✅ Ollama setup complete with model: ${OLLAMA_MODEL}`);
    
    // Start Nginx with the custom configuration
    console.log('Starting Nginx with custom configuration...');
    
    // Create an Nginx configuration for Ollama
    const nginxConfig = `
# Ollama Proxy Configuration

server {
    listen 8081;
    server_name localhost;

    # Allow large uploads
    client_max_body_size 25M;
    
    # Logging settings
    access_log /var/log/nginx/ollama.access.log;
    error_log /var/log/nginx/ollama.error.log;

    # Reverse proxy configuration for Ollama
    location /ollama/ {
        # Remove the /ollama/ prefix when forwarding requests
        rewrite ^/ollama/(.*) /$1 break;
        
        # Forward requests to Ollama
        proxy_pass http://localhost:11434/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support for streaming responses
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
`;
    
    // Write Nginx configuration
    const nginxConfigPath = path.join(OLLAMA_DIR, 'ollama-nginx.conf');
    fs.writeFileSync(nginxConfigPath, nginxConfig);
    
    // Start Nginx
    execSync(`nginx -c ${nginxConfigPath} -g "daemon off;" &`);
    
    console.log('✅ Nginx started with Ollama proxy configuration');
    
  } catch (error) {
    console.error('❌ Error setting up Ollama:', error.message);
    if (error.stdout) console.error('stdout:', error.stdout.toString());
    if (error.stderr) console.error('stderr:', error.stderr.toString());
  }
}

// Run the setup
setupOllama().catch(err => {
  console.error('Failed to set up Ollama:', err);
  process.exit(1);
}); 