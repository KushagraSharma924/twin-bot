/**
 * Mock authentication middleware for testing
 * This bypasses actual Supabase authentication and allows testing the UI without real auth
 */

export const mockAuthMiddleware = (req, res, next) => {
  console.log('Using mock authentication middleware');
  
  // Set a mock user object on the request
  req.user = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: {
      provider: 'email'
    },
    user_metadata: {
      name: 'Test User'
    }
  };
  
  // Continue to the next middleware or route handler
  next();
};

// Helper to determine if we should use mock auth based on environment
export const shouldUseMockAuth = () => {
  return process.env.NODE_ENV === 'development' && 
         (process.env.USE_MOCK_AUTH === 'true' || process.env.USE_MOCK_AUTH === '1');
}; 