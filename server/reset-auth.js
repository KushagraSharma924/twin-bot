import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Function to check environment variables
function checkEnvVars() {
  const requiredVars = [
    { name: 'SUPABASE_URL', value: process.env.SUPABASE_URL },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', value: process.env.SUPABASE_SERVICE_ROLE_KEY }
  ];
  
  const missingVars = requiredVars.filter(v => !v.value);
  
  if (missingVars.length > 0) {
    console.error('❌ Error: Missing required environment variables:');
    missingVars.forEach(v => {
      console.error(`   - ${v.name}`);
    });
    console.error('\nPlease add these to your .env file in the server directory.');
    console.error('You can find these values in your Supabase dashboard under Project Settings > API.');
    return false;
  }
  
  return true;
}

// Main function
async function resetAuth() {
  console.log('🔄 Authentication Reset Utility');
  console.log('==============================');
  
  // Check for required environment variables
  if (!checkEnvVars()) {
    process.exit(1);
  }
  
  try {
    // Create admin Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    console.log('📋 Fetching users...');
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Error fetching users:', error.message);
      if (error.message.includes('service_role key')) {
        console.error('   The SUPABASE_SERVICE_ROLE_KEY might be invalid.');
      }
      process.exit(1);
    }
    
    const users = data.users;
    
    if (users.length === 0) {
      console.log('✅ No users found. Database is already clean.');
      process.exit(0);
    }
    
    console.log(`🔍 Found ${users.length} user(s) to delete:`);
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email || 'No email'} (ID: ${user.id})`);
    });
    
    console.log('\n🗑️  Deleting users...');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const user of users) {
      try {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        
        if (deleteError) {
          console.error(`   ❌ Failed to delete ${user.email || user.id}: ${deleteError.message}`);
          failCount++;
        } else {
          console.log(`   ✅ Deleted ${user.email || user.id}`);
          successCount++;
        }
      } catch (err) {
        console.error(`   ❌ Error deleting ${user.email || user.id}: ${err.message}`);
        failCount++;
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`   ✅ Successfully deleted: ${successCount} user(s)`);
    
    if (failCount > 0) {
      console.log(`   ❌ Failed to delete: ${failCount} user(s)`);
    }
    
    console.log('\n✨ Authentication data reset complete!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the reset function
resetAuth(); 