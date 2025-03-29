/**
 * Nginx Configuration Setup for Render
 * 
 * This script creates an Nginx configuration to proxy requests to Ollama.
 * It's designed to be run during the Render build process.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Nginx configuration directory on Render
const NGINX_DIR = '/etc/nginx';
const CONF_DIR = path.join(NGINX_DIR, 'conf.d');
const NGINX_CONF_PATH = path.join(CONF_DIR, 'ollama-proxy.conf');

// Create the Nginx configuration for Ollama proxy
const nginxConf = `
# Ollama Proxy Configuration

server {
    listen 80;
    server_name chatbot-x8x4.onrender.com;  # Replace with your Render domain

    # Allow large uploads
    client_max_body_size 25M;
    
    # Logging settings
    access_log /var/log/nginx/ollama.access.log;
    error_log /var/log/nginx/ollama.error.log;

    # CORS headers for all responses
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
    add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;

    # Handle preflight requests
    if ($request_method = 'OPTIONS') {
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

    # Main application
    location / {
        proxy_pass http://localhost:10000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
`;

// Main setup function
async function setupNginx() {
  try {
    console.log('📌 Setting up Nginx configuration for Ollama proxy on Render...');
    
    // Check if we're running on Render
    if (!process.env.RENDER) {
      console.warn('⚠️ This script is intended to run on Render. Exiting.');
      return;
    }
    
    // Create the conf.d directory if it doesn't exist
    if (!fs.existsSync(CONF_DIR)) {
      console.log(`Creating directory: ${CONF_DIR}`);
      fs.mkdirSync(CONF_DIR, { recursive: true });
    }
    
    // Write the Nginx configuration
    console.log(`Writing Nginx configuration to: ${NGINX_CONF_PATH}`);
    fs.writeFileSync(NGINX_CONF_PATH, nginxConf);
    
    // Verify the configuration
    console.log('Verifying Nginx configuration...');
    execSync('nginx -t');
    console.log('✅ Nginx configuration is valid');
    
    // Reload Nginx to apply the configuration
    console.log('Reloading Nginx to apply configuration...');
    execSync('nginx -s reload');
    console.log('✅ Nginx reloaded successfully');
    
    console.log('Nginx setup complete. Ollama proxy is configured.');
  } catch (error) {
    console.error('❌ Error setting up Nginx:', error.message);
    if (error.stdout) console.error('stdout:', error.stdout.toString());
    if (error.stderr) console.error('stderr:', error.stderr.toString());
  }
}

// Run the setup
setupNginx().catch(err => {
  console.error('Failed to set up Nginx:', err);
  process.exit(1);
}); 