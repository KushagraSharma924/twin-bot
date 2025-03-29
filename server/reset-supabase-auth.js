/**
 * Supabase Authentication Reset Utility
 * 
 * This script helps reset and test the Supabase authentication state.
 * Use it when you encounter "No API key found in request" errors.
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

// Check for required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('❌ Missing required environment variables:');
  if (!process.env.SUPABASE_URL) console.error('  - SUPABASE_URL');
  if (!process.env.SUPABASE_KEY) console.error('  - SUPABASE_KEY');
  process.exit(1);
}

console.log('Supabase Auth Reset Utility');
console.log('--------------------------');
console.log('Supabase URL:', process.env.SUPABASE_URL);
console.log('Supabase Key available:', !!process.env.SUPABASE_KEY);

// Create a Supabase client with explicit headers
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'apikey': process.env.SUPABASE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
    },
  }
);

async function testConnection() {
  try {
    console.log('\nTesting Supabase connection...');
    const startTime = Date.now();
    
    const { data, error } = await supabase
      .from('conversations')
      .select('count')
      .limit(1);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (error) {
      console.error(`❌ Connection test failed (${duration}s):`, error);
      return false;
    }
    
    console.log(`✅ Connection successful (${duration}s)`);
    console.log('   Result:', data);
    return true;
  } catch (error) {
    console.error('❌ Unexpected error during connection test:', error);
    return false;
  }
}

async function main() {
  const connectionSuccess = await testConnection();
  
  if (!connectionSuccess) {
    console.log('\n❌ Supabase connection test failed');
    console.log('Suggestions:');
    console.log('1. Check your SUPABASE_URL and SUPABASE_KEY in .env');
    console.log('2. Ensure you are using the correct service role key');
    console.log('3. Check if your Supabase project is running and accessible');
  } else {
    console.log('\n✅ Supabase connection is working properly');
    
    // Try to get auth session state
    console.log('\nChecking auth session state...');
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Auth session check failed:', error);
    } else {
      console.log('✅ Auth session check successful');
      console.log('   Session present:', !!data?.session);
    }
  }
  
  console.log('\nTest completed');
}

main().catch(console.error); 