import { supabase } from '../config/index.js';
import * as authService from '../services/authService.js';

/**
 * Authentication middleware for regular API routes
 */
export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Better error handling with specific error logging
    try {
      // First, verify that Supabase service connection is working
      const serviceAuthOk = await authService.verifySupabaseServiceAuth();
      if (!serviceAuthOk) {
        console.error('Service-level Supabase authentication is not working');
        return res.status(503).json({ 
          error: "Authentication service temporarily unavailable", 
          message: "There's an issue connecting to our authentication service. Please try again later."
        });
      }
      
      // Log attempt to connect to Supabase
      console.log('Attempting to authenticate with Supabase...');
      
      const { data, error } = await supabase.auth.getUser(token);
      
      if (error) {
        console.error('Auth middleware error:', error.message);
        
        // Check for specific JWT errors
        if (error.message.includes('missing sub claim')) {
          console.log('JWT missing sub claim error, attempting to use fallback service key auth');
          
          // Try to extract user ID from the token via JWT decoding
          try {
            // Simple JWT parsing (this is a basic example, consider a proper JWT library)
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            if (payload.user_id) {
              // Look up the user profile directly using service key
              const userProfile = await authService.getUserProfile(payload.user_id);
              if (userProfile) {
                console.log('Found user profile via service key fallback:', userProfile.id);
                // Create a minimal user object
                req.user = {
                  id: userProfile.id,
                  email: userProfile.email,
                  user_metadata: userProfile
                };
                return next();
              }
            }
          } catch (jwtParseError) {
            console.error('Failed to parse JWT payload:', jwtParseError);
          }
        }
        
        // If refresh token error, suggest client to reauthenticate
        if (error.message.includes('Invalid Refresh Token') ||
            error.message.includes('Already Used')) {
          return res.status(401).json({ 
            error: "Session expired", 
            code: "REFRESH_TOKEN_INVALID",
            message: "Your session has expired. Please sign in again."
          });
        }
        
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
      
      // Create a new session if token is about to expire (within 6 hours)
      try {
        const session = await supabase.auth.getSession();
        if (session?.data?.session) {
          const expiresAt = new Date(session.data.session.expires_at);
          const now = new Date();
          const sixHoursFromNow = new Date(now.getTime() + (6 * 60 * 60 * 1000)); // 6 hours in milliseconds
          
          if (expiresAt < sixHoursFromNow) {
            console.log('Creating session with expiration time of 180 days');
            // Instead of refreshing, create a completely new session with a long expiration
            const refreshToken = session.data.session.refresh_token;
            if (refreshToken) {
              const refreshResult = await authService.refreshUserSession(refreshToken);
              if (refreshResult.success) {
                // Set new token in response header
                res.setHeader('X-New-Auth-Token', refreshResult.session.access_token);
              }
            }
          }
        }
      } catch (sessionError) {
        // Don't fail the request if session refresh fails
        console.error('Session refresh failed:', sessionError.message);
      }
      
      next();
    } catch (parseError) {
      if (parseError.message && parseError.message.includes('fetch failed')) {
        console.error('Supabase connection error:', parseError.message);
        // Send a more user-friendly message
        return res.status(503).json({ 
          error: "Authentication service temporarily unavailable", 
          message: "There's an issue connecting to our authentication service. Please try again later."
        });
      }
      console.error('JWT parsing error:', parseError.message);
      return res.status(401).json({ error: `Invalid JWT: ${parseError.message}` });
    }
  } catch (error) {
    console.error('Auth middleware exception:', error.message, error.stack);
    res.status(500).json({ error: "Authentication error" });
  }
};

/**
 * Admin middleware for privileged operations
 */
export const adminMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      console.log('Attempting to authenticate admin with Supabase...');
      const { data, error } = await supabase.auth.getUser(token);
      
      if (error) {
        console.error('Admin middleware error:', error.message);
        return res.status(401).json({ error: "Invalid or expired token" });
      }
      
      // Check if user is an admin
      try {
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
      } catch (profileError) {
        console.error('Error fetching admin profile:', profileError.message);
        return res.status(500).json({ error: "Failed to verify admin status" });
      }
    } catch (authError) {
      if (authError.message && authError.message.includes('fetch failed')) {
        console.error('Supabase connection error in admin middleware:', authError.message);
        return res.status(503).json({ 
          error: "Authentication service temporarily unavailable", 
          message: "There's an issue connecting to our authentication service. Please try again later."
        });
      }
      console.error('Admin auth error:', authError.message);
      return res.status(401).json({ error: "Authentication failed" });
    }
  } catch (error) {
    console.error('Admin middleware exception:', error.message, error.stack);
    res.status(500).json({ error: "Authentication error" });
  }
};

/**
 * Email middleware - skips auth for OAuth callback routes
 */
export const emailMiddleware = (req, res, next) => {
  // Skip authentication for the OAuth callback route
  if (req.path.startsWith('/oauth2/callback')) {
    return next();
  }
  // Apply auth middleware to all other email routes
  return authMiddleware(req, res, next);
}; 