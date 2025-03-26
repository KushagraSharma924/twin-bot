import express from 'express';
import { supabase } from '../config/index.js';
import { createClient } from '@supabase/supabase-js';
import * as authController from '../controllers/auth.js';

const router = express.Router();

/**
 * User login with extended session
 * POST /api/auth/login
 */
router.post('/login', authController.login);

/**
 * User registration
 * POST /api/auth/register
 */
router.post('/register', authController.register);

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
router.get('/profile', authController.getProfile);

/**
 * Create or update user profile
 * POST /api/auth/profile
 */
router.post('/profile', authController.updateProfile);

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
router.post('/refresh', authController.refreshToken);

/**
 * Delete a user (admin only)
 * DELETE /api/auth/admin/users/:userId
 */
router.delete('/admin/users/:userId', authController.deleteUsers);

/**
 * Helper function to extract username from email
 */
const getUsernameFromEmail = (email) => {
  return email.split('@')[0];
};

export default router; 