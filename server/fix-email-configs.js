// Fix missing email addresses in profiles and set up basic email configurations
import dotenv from 'dotenv';
import { supabase } from './config/index.js';

dotenv.config();

async function getAllUsers() {
  try {
    console.log('Fetching all user profiles...');
    
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return [];
    }
    
    console.log(`Found ${profiles.length} user profiles`);
    return profiles;
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return [];
  }
}

async function updateUserEmail(userId, email) {
  try {
    console.log(`Updating email for user ${userId} to ${email}`);
    
    const { error } = await supabase
      .from('profiles')
      .update({ email })
      .eq('id', userId);
    
    if (error) {
      console.error('Error updating profile email:', error);
      return false;
    }
    
    console.log(`Successfully updated email for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error updating profile email:', error);
    return false;
  }
}

async function setupEmailConfig(userId, email, provider = 'gmail') {
  try {
    console.log(`Setting up email configuration for user ${userId}`);
    
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
      .eq('user_id', userId)
      .single();
    
    if (!configCheckError && existingConfig) {
      console.log(`Email configuration already exists for user ${userId}. Updating...`);
      
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
      console.log(`Creating new email configuration for user ${userId}`);
      
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
    
    console.log(`Successfully set up email configuration for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error setting up email configuration:', error);
    return false;
  }
}

async function automaticFix() {
  try {
    const profiles = await getAllUsers();
    
    if (profiles.length === 0) {
      console.log('No profiles found.');
      return;
    }
    
    console.log('\nRunning automatic fixes...');
    
    for (const profile of profiles) {
      // If email exists, set up configuration
      if (profile.email) {
        console.log(`\nSetting up configuration for ${profile.email}`);
        
        // Determine provider from email domain
        let provider = 'gmail';
        if (profile.email.includes('@gmail')) {
          provider = 'gmail';
        } else if (profile.email.includes('@outlook') || profile.email.includes('@hotmail') || profile.email.includes('@live')) {
          provider = 'outlook';
        } else if (profile.email.includes('@yahoo')) {
          provider = 'yahoo';
        }
        
        await setupEmailConfig(profile.id, profile.email, provider);
      } else {
        console.log(`\nSkipping user ${profile.id} - no email address`);
      }
    }
  } catch (error) {
    console.error('Error in automatic fix:', error);
  }
}

// Run automatic fix directly
console.log('Email Configuration Fix Utility\n');
console.log('Running in automatic mode...');

automaticFix()
  .then(() => {
    console.log('\nFix utility completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  }); 