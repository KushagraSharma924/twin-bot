import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  try {
    console.log('Setting up the database...');

    // Create the necessary tables if they don't exist
    const { error: tableError } = await supabase.rpc('create_necessary_tables');
    
    if (tableError) {
      console.error('Error creating tables:', tableError);
      // Continue anyway, as tables might already exist
    } else {
      console.log('Tables created successfully');
    }

    // Create the trigger for automatic profile creation
    const { error: triggerError } = await supabase.from('profiles').select('id').limit(1);
    
    if (triggerError) {
      console.log('Profiles table may not exist yet. Setting it up...');
      
      // This will only work if you have enough privileges
      const { error: createError } = await supabase.rpc('setup_profile_trigger');
      
      if (createError) {
        console.error('Error setting up profile trigger:', createError);
        console.log('You may need to manually set up the profiles table in Supabase');
      } else {
        console.log('Profile trigger set up successfully');
      }
    } else {
      console.log('Profiles table exists');
    }

    console.log('Database setup complete!');
  } catch (error) {
    console.error('Setup error:', error.message);
  }
}

// Run the setup
setupDatabase();

/*
 * IMPORTANT: In your Supabase dashboard, add these SQL functions:
 * 
 * 1. Enable Profile Creation for New Users:
 * 
 * CREATE OR REPLACE FUNCTION public.create_profile_for_user()
 * RETURNS TRIGGER AS $$
 * BEGIN
 *   INSERT INTO public.profiles (id, name, email, created_at, updated_at)
 *   VALUES (
 *     NEW.id,
 *     NEW.raw_user_meta_data->>'name',
 *     NEW.email,
 *     NOW(),
 *     NOW()
 *   );
 *   RETURN NEW;
 * END;
 * $$ LANGUAGE plpgsql SECURITY DEFINER;
 * 
 * 2. Create Trigger to Run Function on User Creation:
 * 
 * CREATE OR REPLACE TRIGGER on_auth_user_created
 *   AFTER INSERT ON auth.users
 *   FOR EACH ROW EXECUTE FUNCTION public.create_profile_for_user();
 * 
 * 3. Create an RPC Function for direct profile creation:
 *
 * CREATE OR REPLACE FUNCTION public.create_profile(
 *   user_id UUID,
 *   user_name TEXT,
 *   user_email TEXT
 * ) RETURNS void AS $$
 * BEGIN
 *   INSERT INTO public.profiles (id, name, email, created_at, updated_at)
 *   VALUES (
 *     user_id,
 *     user_name,
 *     user_email,
 *     NOW(),
 *     NOW()
 *   );
 * END;
 * $$ LANGUAGE plpgsql SECURITY DEFINER;
 */ 