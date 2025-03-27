import { supabase } from '../config/index.js';
import { createClient } from '@supabase/supabase-js';

/**
 * Helper function to extract username from email
 */
const getUsernameFromEmail = (email) => {
  return email.split('@')[0];
};

/**
 * User login with extended session
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Use a very long session expiration based on environment variable
    const expirationDays = process.env.JWT_EXPIRATION_DAYS || 30; // Default to 30 days if not specified
    const expiresIn = expirationDays * 24 * 60 * 60; // Convert days to seconds
    
    console.log(`Creating session with expiration time of ${expirationDays} days`);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        expiresIn: expiresIn
      }
    });

    if (error) throw error;
    
    // Check if email is verified
    if (data.user && !data.user.email_confirmed_at) {
      return res.status(403).json({ 
        error: "Email not verified", 
        message: "Please check your email and verify your account before logging in.",
        user: { 
          id: data.user.id, 
          email: data.user.email,
          name: data.user.user_metadata?.name || getUsernameFromEmail(email)
        }
      });
    }
    
    // Add the name from user metadata or use email username as fallback
    const userData = {
      ...data,
      user: {
        ...data.user,
        name: data.user.user_metadata?.name || getUsernameFromEmail(email)
      }
    };
    
    // Create profile if it doesn't exist
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    if (profileError && profileError.code === 'PGRST116') { // Not found error
      const { error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: data.user.email,
          username: getUsernameFromEmail(data.user.email)
        });
      
      if (createProfileError) {
        console.error('Error creating profile:', createProfileError.message);
      }
    }
    
    res.json(userData);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * User registration
 */
export const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // If name is not provided, use the username part of the email
    const username = name || getUsernameFromEmail(email);
    
    // Register user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: username
        }
      }
    });
    
    if (error) throw error;
    
    // Create profile
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: data.user.email,
          username: username
        });
      
      if (profileError) {
        console.error('Error creating profile:', profileError.message);
      }
    }
    
    res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        name: username
      },
      message: "Registration successful. Please check your email for verification link."
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Delete users (admin only)
 */
export const deleteUsers = async (req, res) => {
  try {
    // Create a Supabase client with admin privileges
    const adminSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Fetch specific user ID from request or delete all if not specified
    const { userId } = req.body;
    
    if (userId) {
      // Delete a specific user
      const { error } = await adminSupabase.auth.admin.deleteUser(userId);
      
      if (error) {
        console.error(`Error deleting user ${userId}:`, error);
        return res.status(400).json({ error: error.message });
      }
      
      // Delete related data (like profile)
      await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      
      return res.json({ 
        success: true, 
        message: `User ${userId} deleted successfully`
      });
    } else {
      // Delete all users
      const { data: users, error: listError } = await adminSupabase.auth.admin.listUsers();
      
      if (listError) {
        console.error('Error fetching users:', listError);
        return res.status(400).json({ error: listError.message });
      }
      
      const deletedUsers = [];
      
      for (const user of users.users) {
        const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(user.id);
        
        if (deleteError) {
          console.error(`Error deleting user ${user.id}:`, deleteError);
        } else {
          deletedUsers.push(user.id);
          console.log(`Deleted user: ${user.id}`);
          
          // Delete related data
          await supabase
            .from('profiles')
            .delete()
            .eq('id', user.id);
        }
      }
      
      return res.json({
        success: true,
        message: `${deletedUsers.length} users deleted successfully`,
        deletedUsers
      });
    }
  } catch (error) {
    console.error('Error in deleteUsers:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Get user profile
 */
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user profile
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Profile fetch error:', error.message);
      return res.status(404).json({ error: "Profile not found" });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Profile fetch exception:', error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const profileData = req.body;
    
    // Remove sensitive fields
    delete profileData.id;
    
    // Add audit fields
    profileData.updated_at = new Date().toISOString();
    
    // Update profile
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        ...profileData
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select()
      .single();
    
    if (error) {
      console.error('Profile update error:', error.message);
      return res.status(400).json({ error: error.message });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Profile update exception:', error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Refresh an authentication token
 */
export const refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return res.status(400).json({ error: "Refresh token is required" });
    }
    
    if (!supabase) {
      console.error('Supabase client is not initialized');
      return res.status(500).json({ error: "Authentication service unavailable" });
    }
    
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refresh_token
    });
    
    if (error) {
      console.error('Token refresh error:', error.message);
      return res.status(401).json({ error: error.message });
    }
    
    if (!data.session || !data.session.access_token) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }
    
    // Return the new session data
    res.json({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      }
    });
  } catch (error) {
    console.error('Token refresh exception:', error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export default {
  login,
  register,
  deleteUsers,
  getProfile,
  updateProfile,
  getUsernameFromEmail,
  refreshToken
};