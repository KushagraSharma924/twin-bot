// Test environment variables loading

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Try to load environment variables from different locations
console.log('Current working directory:', process.cwd());

// Load from .env in current directory
dotenv.config();
console.log('After dotenv.config()');

// Try loading from server/.env specifically
try {
  const serverEnvPath = path.join(process.cwd(), 'server', '.env');
  console.log('Checking if server/.env exists:', fs.existsSync(serverEnvPath));
  
  if (fs.existsSync(serverEnvPath)) {
    dotenv.config({ path: serverEnvPath });
    console.log('Loaded server/.env file');
  }
} catch (error) {
  console.error('Error loading server/.env:', error);
}

// Check if variables are available
console.log('\nEnvironment Variables:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'Set (length: ' + process.env.SUPABASE_KEY.length + ')' : 'Not set');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('OLLAMA_MODEL:', process.env.OLLAMA_MODEL);

// If some variables are missing, try to read the file directly
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.log('\nAttempting to read .env file directly:');
  
  try {
    const envPaths = [
      path.join(process.cwd(), '.env'),
      path.join(process.cwd(), 'server', '.env')
    ];
    
    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        console.log(`Reading ${envPath}`);
        const envContent = fs.readFileSync(envPath, 'utf8');
        const supabaseUrlMatch = envContent.match(/SUPABASE_URL=(.+)/);
        const supabaseKeyMatch = envContent.match(/SUPABASE_KEY=(.+)/);
        
        if (supabaseUrlMatch) {
          console.log('SUPABASE_URL found in file');
        }
        
        if (supabaseKeyMatch) {
          console.log('SUPABASE_KEY found in file');
        }
      } else {
        console.log(`${envPath} does not exist`);
      }
    }
  } catch (error) {
    console.error('Error reading .env file directly:', error);
  }
} 