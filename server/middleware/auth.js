import { supabase } from '../config/index.js';

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
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.error('Admin middleware error:', error.message);
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    
    // Check if user is an admin
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