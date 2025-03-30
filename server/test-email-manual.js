// Manual email configuration and testing script
import dotenv from 'dotenv';
import { supabase } from './config/index.js';
import * as emailService from './services/emailService.js';
import readline from 'readline';

dotenv.config();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
function question(query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

// Prepare email credentials with password authentication
async function setUpPasswordAuthentication(userId, email, password, provider = 'gmail') {
  try {
    console.log(`Setting up email with password authentication for user ${userId}`);
    
    // Determine host based on provider
    const host = 
      provider === 'gmail' ? 'imap.gmail.com' : 
      provider === 'outlook' ? 'outlook.office365.com' : 
      provider === 'yahoo' ? 'imap.mail.yahoo.com' : 
      'imap.gmail.com'; // Default to Gmail
    
    // Check if configuration already exists
    const { data: existingConfig, error: configCheckError } = await supabase
      .from('email_configurations')
      .select('*')
      .eq('user_id', userId);
    
    if (!configCheckError && existingConfig && existingConfig.length > 0) {
      console.log(`Email configuration already exists. Updating...`);
      
      const { error: updateError } = await supabase
        .from('email_configurations')
        .update({
          host,
          port: 993,
          secure: true,
          provider,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      
      if (updateError) {
        console.error('Error updating email configuration:', updateError);
        return false;
      }
    } else {
      console.log(`Creating new email configuration`);
      
      const { error: insertError } = await supabase
        .from('email_configurations')
        .insert({
          user_id: userId,
          host,
          port: 993,
          secure: true,
          provider,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error('Error creating email configuration:', insertError);
        return false;
      }
    }
    
    // Configure with password
    const credentials = {
      host,
      port: 993, 
      secure: true,
      user: email,
      password: password,
      provider
    };
    
    return credentials;
  } catch (error) {
    console.error('Error setting up password authentication:', error);
    return null;
  }
}

// Test email fetching
async function testEmailFetch(credentials) {
  try {
    console.log('Testing email fetch with credentials:', {
      host: credentials.host,
      user: credentials.user,
      provider: credentials.provider,
      hasPassword: !!credentials.password
    });
    
    // Fetch emails
    const emails = await emailService.fetchEmails(credentials, { limit: 5 });
    
    console.log(`Successfully fetched ${emails.length} emails`);
    
    // Display subject lines
    for (let i = 0; i < emails.length; i++) {
      console.log(`${i+1}. ${emails[i].subject}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error fetching emails:', error);
    return false;
  }
}

// List mailboxes
async function testListMailboxes(credentials) {
  try {
    console.log('Testing mailbox listing with credentials');
    
    // List mailboxes
    const mailboxes = await emailService.listMailboxes(credentials);
    
    console.log(`Successfully listed ${mailboxes.length} mailboxes`);
    
    // Display mailboxes
    for (let i = 0; i < mailboxes.length; i++) {
      console.log(`${i+1}. ${mailboxes[i].path} (${mailboxes[i].name})`);
    }
    
    return true;
  } catch (error) {
    console.error('Error listing mailboxes:', error);
    return false;
  }
}

// Main function
async function main() {
  try {
    console.log('Email Manual Testing Utility\n');
    
    // Get all users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return;
    }
    
    // Display users
    console.log('Available users:');
    profiles.forEach((profile, i) => {
      console.log(`${i+1}. ${profile.name} (${profile.email})`);
    });
    
    // Select user
    const userIndex = parseInt(await question('\nSelect user (number): ')) - 1;
    if (userIndex < 0 || userIndex >= profiles.length) {
      console.log('Invalid selection. Exiting.');
      return;
    }
    
    const selectedUser = profiles[userIndex];
    console.log(`\nSelected user: ${selectedUser.name} (${selectedUser.email})`);
    
    // Get password
    const password = await question('Enter email password: ');
    if (!password) {
      console.log('Password is required. Exiting.');
      return;
    }
    
    // Get provider
    const provider = await question('Email provider (gmail/outlook/yahoo) [gmail]: ') || 'gmail';
    
    // Set up authentication
    const credentials = await setUpPasswordAuthentication(
      selectedUser.id, 
      selectedUser.email, 
      password, 
      provider
    );
    
    if (!credentials) {
      console.log('Failed to set up authentication. Exiting.');
      return;
    }
    
    console.log('\nCredentials prepared successfully.');
    
    // Test mailbox listing
    console.log('\nTesting mailbox listing...');
    await testListMailboxes(credentials);
    
    // Test email fetching
    console.log('\nTesting email fetching...');
    await testEmailFetch(credentials);
    
    console.log('\nTest completed');
  } catch (error) {
    console.error('Error in main function:', error);
  } finally {
    rl.close();
  }
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  rl.close();
  process.exit(1);
}).finally(() => {
  process.exit(0);
}); 