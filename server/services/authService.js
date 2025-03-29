/**
 * Authentication Service
 * 
 * Provides utilities for better authentication management with Supabase
 */

import { supabase } from '../config/index.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Verifies if Supabase is properly initialized for service-level operations
 * @returns {Promise<boolean>} True if Supabase is properly initialized
 */
export async function verifySupabaseServiceAuth() {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return false;
  }
  
  try {
    // Perform a simple query that should always work with service role key
    const { data, error } = await supabase
      .from('conversations')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Supabase service auth verification failed:', error.message);
      return false;
    }
    
    console.log('Supabase service auth verification successful');
    return true;
  } catch (error) {
    console.error('Unexpected error during Supabase service auth verification:', error);
    return false;
  }
}

/**
 * Get user profile data from Supabase
 * @param {string} userId - The user ID to retrieve
 * @returns {Promise<Object>} The user profile data
 */
export async function getUserProfile(userId) {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return null;
  }
  
  try {
    // Try to get user with service key first
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user profile:', error.message);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Unexpected error during user profile fetch:', error);
    return null;
  }
}

/**
 * Create a new session for a user
 * @param {string} email - The user's email
 * @param {string} password - The user's password
 * @returns {Promise<Object>} The session data
 */
export async function createUserSession(email, password) {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return { success: false, error: 'Supabase client not initialized' };
  }
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('Error creating user session:', error.message);
      return { success: false, error: error.message };
    }
    
    return { 
      success: true, 
      session: data.session,
      user: data.user
    };
  } catch (error) {
    console.error('Unexpected error during session creation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Refresh a user's session
 * @param {string} refreshToken - The refresh token
 * @returns {Promise<Object>} The new session data
 */
export async function refreshUserSession(refreshToken) {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return { success: false, error: 'Supabase client not initialized' };
  }
  
  try {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });
    
    if (error) {
      console.error('Error refreshing user session:', error.message);
      return { success: false, error: error.message };
    }
    
    return { 
      success: true, 
      session: data.session,
      user: data.user
    };
  } catch (error) {
    console.error('Unexpected error during session refresh:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Logout a user
 * @returns {Promise<boolean>} True if logout successful
 */
export async function logoutUser() {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return false;
  }
  
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Error logging out user:', error.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Unexpected error during logout:', error);
    return false;
  }
}

export default {
  verifySupabaseServiceAuth,
  getUserProfile,
  createUserSession,
  refreshUserSession,
  logoutUser
}; 