import express from 'express';
import { supabase } from '../config/index.js';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

/**
 * User login with extended session
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Use a very long session expiration based on environment variable
    const expirationDays = process.env.JWT_EXPIRATION_DAYS || 90; // Default to 90 days if not specified
    const expiresIn = expirationDays * 24 * 60 * 60; // Convert days to seconds
    
    console.log(`Creating session with expiration time of ${expirationDays} days`);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        expiresIn: expiresIn
      }
    });
    
    if (error) {
      console.error('Login error:', error.message);
      return res.status(401).json({ error: error.message });
    }
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') { // Not found error
      console.warn('Profile fetch error:', profileError.message);
    }
    
    // Create profile if it doesn't exist
    if (profileError && profileError.code === 'PGRST116') {
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
    
    res.json(data);
  } catch (error) {
    console.error('Login exception:', error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * User registration
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    
    // Register user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username
        }
      }
    });
    
    if (error) {
      console.error('Registration error:', error.message);
      return res.status(400).json({ error: error.message });
    }
    
    // Create profile
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: data.user.email,
          username: username || getUsernameFromEmail(data.user.email)
        });
      
      if (profileError) {
        console.error('Error creating profile:', profileError.message);
      }
    }
    
    res.json({
      user: data.user,
      session: data.session,
      message: "Registration successful. Please check your email for verification link."
    });
  } catch (error) {
    console.error('Registration exception:', error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Resend verification email
 * POST /api/auth/resend-verification
 */
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email
    });
    
    if (error) {
      console.error('Resend verification error:', error.message);
      return res.status(400).json({ error: error.message });
    }
    
    res.json({ message: "Verification email sent successfully" });
  } catch (error) {
    console.error('Resend verification exception:', error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Check verification status
 * GET /api/auth/verification-status
 */
router.get('/verification-status', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    
    // Get user by email
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('User fetch error:', error.message);
      return res.status(500).json({ error: error.message });
    }
    
    // Find the user with matching email
    const user = data.users.find(u => u.email === email);
    
    if (!user) {
      return res.status(404).json({ verified: false, message: "User not found" });
    }
    
    // Check email confirmation
    const verified = !!user.email_confirmed_at;
    
    res.json({
      verified,
      message: verified ? "Email verified" : "Email not verified"
    });
  } catch (error) {
    console.error('Verification status exception:', error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Reset password (request)
 * POST /api/auth/reset-password
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    
    if (error) {
      console.error('Reset password error:', error.message);
      return res.status(400).json({ error: error.message });
    }
    
    res.json({ message: "Reset password email sent successfully" });
  } catch (error) {
    console.error('Reset password exception:', error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Update password
 * POST /api/auth/update-password
 */
router.post('/update-password', async (req, res) => {
  try {
    const { password } = req.body;
    
    // Update password
    const { error } = await supabase.auth.updateUser({
      password
    });
    
    if (error) {
      console.error('Update password error:', error.message);
      return res.status(400).json({ error: error.message });
    }
    
    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error('Update password exception:', error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Get user profile
 * GET /api/auth/profile
 */
router.get('/profile', async (req, res) => {
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
});

/**
 * Create or update user profile
 * POST /api/auth/profile
 */
router.post('/profile', async (req, res) => {
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
});

/**
 * Delete a user (admin only)
 * DELETE /api/auth/admin/users/:userId
 */
router.delete('/admin/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Create a Supabase client with admin privileges
    const adminSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Delete the user
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
    
    res.json({ 
      success: true, 
      message: `User ${userId} deleted successfully`
    });
  } catch (error) {
    console.error('Delete user exception:', error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Helper function to extract username from email
 */
const getUsernameFromEmail = (email) => {
  return email.split('@')[0];
};

export default router; 