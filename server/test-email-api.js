// Testing script for email API and user profile email issues
import dotenv from 'dotenv';
import { supabase } from './config/index.js';

dotenv.config();

async function checkUserProfiles() {
  try {
    console.log('Checking user profiles in the database...');
    
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return;
    }
    
    console.log(`Found ${profiles.length} user profiles`);
    
    // Check each profile for email
    for (const profile of profiles) {
      console.log(`\nProfile ID: ${profile.id}`);
      console.log(`Email: ${profile.email || 'MISSING!'}`);
      
      // Directly print profile data to ensure email is actually there
      console.log('Raw profile data:', JSON.stringify(profile, null, 2));
      
      // Check if this user has email configuration
      const { data: emailConfig, error: configError } = await supabase
        .from('email_configurations')
        .select('*')
        .eq('user_id', profile.id)
        .single();
      
      if (configError) {
        console.log(`No email configuration found for user ${profile.id}`);
      } else {
        console.log(`Email configuration found with ${Object.keys(emailConfig).length} fields:`, JSON.stringify(emailConfig, null, 2));
        
        // Print specific fields directly for debugging
        console.log('  > host:', emailConfig.host);
        console.log('  > port:', emailConfig.port);
        console.log('  > provider:', emailConfig.provider);
        console.log('  > user_id:', emailConfig.user_id);
      }
      
      // Check if user has OAuth tokens
      const { data: oauthTokens, error: tokenError } = await supabase
        .from('email_oauth_tokens')
        .select('*')
        .eq('user_id', profile.id);
      
      if (tokenError || !oauthTokens || oauthTokens.length === 0) {
        console.log(`No OAuth tokens found for user ${profile.id}`);
      } else {
        console.log(`Found ${oauthTokens.length} OAuth token entries for user ${profile.id}`);
        
        // Print first token info
        if (oauthTokens.length > 0) {
          console.log('First token details:', JSON.stringify(oauthTokens[0], null, 2));
        }
      }
    }
  } catch (error) {
    console.error('Error checking profiles:', error);
  }
}

// Test a manual query to check email configurations table
async function checkEmailConfigurations() {
  try {
    console.log('\nDirectly checking email_configurations table...');
    
    const { data, error } = await supabase
      .from('email_configurations')
      .select('*');
    
    if (error) {
      console.error('Error fetching email configurations:', error);
      return;
    }
    
    console.log(`Found ${data.length} email configuration entries`);
    
    // Check each configuration
    for (const config of data) {
      console.log(`\nConfiguration ID: ${config.id}`);
      console.log(`User ID: ${config.user_id}`);
      console.log(`Host: ${config.host || 'MISSING'}`);
      console.log(`Port: ${config.port || 'MISSING'}`);
      console.log(`Provider: ${config.provider || 'MISSING'}`);
      console.log('Full config:', JSON.stringify(config, null, 2));
    }
  } catch (error) {
    console.error('Error checking email configurations:', error);
  }
}

// Run tests
async function runTests() {
  console.log('Starting email API tests...\n');
  
  // Check user profiles
  await checkUserProfiles();
  
  // Directly check email configurations
  await checkEmailConfigurations();
  
  console.log('\nTests completed');
}

runTests()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
