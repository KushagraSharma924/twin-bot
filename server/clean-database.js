import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check if the necessary environment variables are set
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing required environment variables');
  console.error('Please make sure your .env file contains:');
  console.error('  SUPABASE_URL=your-supabase-project-url');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  console.error('\nYou can find these in your Supabase dashboard under Project Settings > API');
  process.exit(1);
}

// Create Supabase client with admin privileges
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Clean the entire database by first removing profiles and then users
 */
async function cleanDatabase() {
  console.log('🧹 Starting database cleanup process...');
  console.log(`Using Supabase URL: ${supabaseUrl}`);
  
  try {
    // Step 1: Get all users
    console.log('📋 Fetching users...');
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error fetching users:', listError.message);
      return;
    }
    
    if (!users || users.users.length === 0) {
      console.log('✅ No users found. Database is already clean.');
      return;
    }
    
    console.log(`🔍 Found ${users.users.length} users to process`);
    
    // Step 2: First, try to delete profiles
    console.log('\n🗑️  Step 1: Deleting profiles...');
    
    for (const user of users.users) {
      console.log(`👤 Processing user: ${user.email || user.id}`);
      
      // Try to delete from profiles table
      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', user.id);
        
        if (profileError) {
          console.error(`  ❌ Error deleting profile for ${user.email || user.id}: ${profileError.message}`);
        } else {
          console.log(`  ✅ Deleted profile for ${user.email || user.id}`);
        }
      } catch (err) {
        console.error(`  ❌ Error deleting profile: ${err.message}`);
      }
      
      // Try other tables that might have foreign keys
      try {
        const { error: conversationsError } = await supabase
          .from('conversations')
          .delete()
          .eq('user_id', user.id);
        
        if (!conversationsError) {
          console.log(`  ✅ Deleted conversations for ${user.email || user.id}`);
        }
      } catch (err) {
        // Ignore errors for tables that might not exist
      }
      
      try {
        const { error: tasksError } = await supabase
          .from('tasks')
          .delete()
          .eq('user_id', user.id);
        
        if (!tasksError) {
          console.log(`  ✅ Deleted tasks for ${user.email || user.id}`);
        }
      } catch (err) {
        // Ignore errors for tables that might not exist
      }
      
      // Add user_preferences table
      try {
        const { error: preferencesError } = await supabase
          .from('user_preferences')
          .delete()
          .eq('user_id', user.id);
        
        if (!preferencesError) {
          console.log(`  ✅ Deleted user preferences for ${user.email || user.id}`);
        }
      } catch (err) {
        // Ignore errors for tables that might not exist
      }
      
      // Add learning_data table
      try {
        const { error: learningError } = await supabase
          .from('learning_data')
          .delete()
          .eq('user_id', user.id);
        
        if (!learningError) {
          console.log(`  ✅ Deleted learning data for ${user.email || user.id}`);
        }
      } catch (err) {
        // Ignore errors for tables that might not exist
      }
      
      // Add calendar_events table
      try {
        const { error: calendarError } = await supabase
          .from('calendar_events')
          .delete()
          .eq('user_id', user.id);
        
        if (!calendarError) {
          console.log(`  ✅ Deleted calendar events for ${user.email || user.id}`);
        }
      } catch (err) {
        // Ignore errors for tables that might not exist
      }
      
      // Add browser_insights table
      try {
        const { error: browserError } = await supabase
          .from('browser_insights')
          .delete()
          .eq('user_id', user.id);
        
        if (!browserError) {
          console.log(`  ✅ Deleted browser insights for ${user.email || user.id}`);
        }
      } catch (err) {
        // Ignore errors for tables that might not exist
      }
    }
    
    // Step 3: Now delete the users
    console.log('\n🗑️  Step 2: Deleting users...');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const user of users.users) {
      try {
        const { error } = await supabase.auth.admin.deleteUser(user.id);
        
        if (error) {
          console.error(`  ❌ Failed to delete user ${user.email || user.id}: ${error.message}`);
          failCount++;
        } else {
          console.log(`  ✅ Deleted user: ${user.email || user.id}`);
          successCount++;
        }
      } catch (err) {
        console.error(`  ❌ Error deleting user ${user.email || user.id}: ${err.message}`);
        failCount++;
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`  ✅ Successfully deleted: ${successCount} users`);
    
    if (failCount > 0) {
      console.log(`  ❌ Failed to delete: ${failCount} users`);
      console.log('\n⚠️ Some users could not be deleted. This might be due to:');
      console.log('  1. Foreign key constraints from other tables');
      console.log('  2. Insufficient permissions');
      console.log('  3. Users might be referenced in other Supabase services');
      console.log('\nConsider using the Supabase dashboard to manually delete these users.');
    }
    
    console.log('\n✨ Database cleanup complete!');
    
  } catch (error) {
    console.error('❌ Fatal error during database cleanup:', error);
  }
}

// Run the database cleanup
cleanDatabase(); 