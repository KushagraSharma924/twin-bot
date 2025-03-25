import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase client initialization
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to extract username from email
const getUsernameFromEmail = (email) => {
  return email.split('@')[0];
};

// Authentication middleware that properly respects email verification
export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Better error handling with specific error logging
    try {
      const { data, error } = await supabase.auth.getUser(token);
      
      if (error) {
        console.error('Auth middleware error:', error.message);
        return res.status(401).json({ error: error.message });
      }
      
      // Check if email is verified
      if (data.user && !data.user.email_confirmed_at) {
        return res.status(403).json({ 
          error: "Email not verified", 
          message: "Please verify your email before accessing this resource"
        });
      }
      
      // Set the authenticated user on the request object
      req.user = data.user;
      
      // Create a new session if token is about to expire (within 1 day)
      const session = await supabase.auth.getSession();
      if (session?.data?.session) {
        const expiresAt = new Date(session.data.session.expires_at);
        const now = new Date();
        const oneDayFromNow = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 1 day in milliseconds
        
        if (expiresAt < oneDayFromNow) {
          console.log('Refreshing session token to extend expiration');
          // Refresh the session token
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (!refreshError && refreshData.session) {
            // Set a new token with very long expiration (90 days)
            const { data: updateData, error: updateError } = await supabase.auth.updateUser({
              data: { extendedSession: true }
            });
            
            if (!updateError) {
              console.log('Extended session token successfully');
              // You could add the new token to the response headers if needed
              res.setHeader('X-New-Auth-Token', refreshData.session.access_token);
            }
          }
        }
      }
      
      next();
    } catch (parseError) {
      console.error('JWT parsing error:', parseError.message);
      return res.status(401).json({ error: `Invalid JWT: ${parseError.message}` });
    }
  } catch (error) {
    console.error('Auth middleware exception:', error.message);
    res.status(500).json({ error: "Authentication error" });
  }
};

// Admin middleware for highly privileged operations
export const adminMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const token = authHeader.split(' ')[1];
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.error('Admin middleware error:', error.message);
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    
    // Check if user is an admin
    // You should add a proper admin check based on your application's needs
    // For example, checking a role field in user metadata or an admin flag in your profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
      
    if (profileError || !profile.is_admin) {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    req.user = data.user;
    next();
  } catch (error) {
    console.error('Admin middleware exception:', error.message);
    res.status(500).json({ error: "Authentication error" });
  }
};

// Delete users (admin only) - Reset auth data
export const deleteUsers = async (req, res) => {
  try {
    // Create a Supabase client with admin privileges
    // This requires the service role key, which has admin privileges
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

// User login - modified to create long-lived token
export const login = async (req, res) => {
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
    
    res.json(userData);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// User registration
export const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // If name is not provided, use the username part of the email
    const username = name || getUsernameFromEmail(email);
    
    // Create the user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: username }, // Store name in the user metadata
        emailRedirectTo: `${process.env.SITE_URL || 'http://localhost:3000'}/auth/callback`
      }
    });

    if (error) throw error;
    
    console.log("User registration successful");
    
    // NOTE: Profile creation is now handled by a database trigger
    // When a user is created in auth.users, it automatically creates
    // a corresponding record in the profiles table
    
    res.json({
      user: {
        ...data.user,
        name: data.user.user_metadata?.name || username
      },
      message: "Registration successful! Please check your email to confirm your account."
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(400).json({ error: error.message });
  }
};

// Resend verification email
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${process.env.SITE_URL || 'http://localhost:3000'}/auth/callback`
      }
    });
    
    if (error) throw error;
    
    res.json({
      message: "Verification email has been resent. Please check your inbox.",
      data
    });
  } catch (error) {
    console.error("Error resending verification email:", error);
    res.status(400).json({ error: error.message });
  }
};

// Check verification status
export const checkVerificationStatus = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    
    // We can't directly check verification status without being logged in,
    // so we'll attempt a "refresh" which will fail with a specific error if not verified
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      return res.json({ 
        verified: false,
        message: "Unable to determine verification status. User may not be logged in."
      });
    }
    
    const isVerified = data.user && data.user.email === email && data.user.email_confirmed_at;
    
    res.json({
      verified: Boolean(isVerified),
      user: isVerified ? {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || getUsernameFromEmail(email),
        verified_at: data.user.email_confirmed_at
      } : null,
      message: isVerified 
        ? "Email is verified."
        : "Email is not verified. Please check your inbox and verify your email."
    });
  } catch (error) {
    console.error("Error checking verification status:", error);
    res.status(400).json({ error: error.message });
  }
};

// Reset password endpoint
export const resetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.SITE_URL || 'http://localhost:3000'}/reset-password`
    });
    
    if (error) throw error;
    
    res.json({
      message: "Password reset email has been sent. Please check your inbox.",
      note: "When you click the reset link, you'll be redirected to a URL containing '#access_token=YOUR_TOKEN'. Extract this token (without the '#access_token=' prefix) and pass it to /api/auth/update-password along with your new password.",
      data
    });
  } catch (error) {
    console.error("Error sending password reset email:", error);
    res.status(400).json({ error: error.message });
  }
};

// Update password after reset
export const updatePassword = async (req, res) => {
  try {
    const { password, accessToken } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: "New password is required" });
    }
    
    if (!accessToken) {
      return res.status(400).json({ error: "Access token is required. This should be obtained from the reset password URL." });
    }

    // First, set the session using the access token
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: accessToken // For password reset, access_token serves as both
    });

    if (sessionError) {
      console.error("Session error:", sessionError);
      throw sessionError;
    }

    // Now update the password using the established session
    const { data, error } = await supabase.auth.updateUser({
      password: password
    });
    
    if (error) throw error;
    
    res.json({
      message: "Password has been updated successfully.",
      user: {
        ...data.user,
        name: data.user.user_metadata?.name || getUsernameFromEmail(data.user.email)
      }
    });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(400).json({ error: error.message });
  }
};

// Profile check and creation endpoint
export const getProfile = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError) {
      console.error('Auth error:', userError.message);
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const user = userData.user;
    const username = user.user_metadata?.name || getUsernameFromEmail(user.email);
    
    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      // Profile doesn't exist, create it
      const { error: createError } = await supabase
        .from('profiles')
        .insert([{
          id: user.id,
          email: user.email,
          name: username,
          created_at: new Date(),
          updated_at: new Date()
        }]);
      
      if (createError) {
        console.error('Error creating profile:', createError);
        return res.status(500).json({ error: "Failed to create profile" });
      }
      
      return res.json({
        message: "Profile created successfully",
        profile: {
          id: user.id,
          email: user.email,
          name: username
        }
      });
    }
    
    res.json({ profile });
  } catch (error) {
    console.error('Profile check error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Direct profile creation endpoint
export const createProfile = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError) {
      console.error('Auth error:', userError.message);
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const user = userData.user;
    const username = user.user_metadata?.name || getUsernameFromEmail(user.email);
    
    // Create profile directly
    const { data: profile, error: createError } = await supabase
      .from('profiles')
      .insert([{
        id: user.id,
        email: user.email,
        name: username,
        created_at: new Date(),
        updated_at: new Date()
      }])
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating profile:', createError);
      return res.status(500).json({ error: "Failed to create profile", details: createError.message });
    }
    
    res.json({
      message: "Profile created successfully",
      profile: profile
    });
  } catch (error) {
    console.error('Profile creation error:', error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
}; 