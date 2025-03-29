import express from 'express';
import { supabase } from '../config/index.js';
import * as authController from '../controllers/auth.js';

const router = express.Router();

/**
 * Get user profile by ID
 * GET /api/user/profile
 */
router.get('/profile', authController.getProfile);

/**
 * Get user profile with extended information
 * GET /api/user/me
 */
router.get('/me', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user profile from profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.error('Profile fetch error:', profileError.message);
      
      // If profile not found, create a default one
      if (profileError.code === 'PGRST116') { // Not found error
        const { data: userData } = await supabase.auth.getUser(userId);
        
        if (userData && userData.user) {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              email: userData.user.email,
              username: userData.user.email.split('@')[0],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (createError) {
            return res.status(500).json({ error: "Failed to create user profile" });
          }
          
          return res.json(newProfile);
        }
      }
      
      return res.status(404).json({ error: "Profile not found" });
    }
    
    // Get user auth data for additional fields
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      // If we can't get user data, just return the profile
      return res.json(profileData);
    }
    
    // Combine profile and user data
    const combinedData = {
      ...profileData,
      email_verified: userData.user.email_confirmed_at ? true : false,
      last_sign_in: userData.user.last_sign_in_at,
      created_at: profileData.created_at || userData.user.created_at
    };
    
    res.json(combinedData);
  } catch (error) {
    console.error('User profile fetch exception:', error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Update user profile
 * PUT /api/user/profile
 */
router.put('/profile', authController.updateProfile);

export default router; 