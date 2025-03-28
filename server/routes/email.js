import express from 'express';
import { supabase } from '../config/index.js';
import * as emailService from '../services/emailService.js';

const router = express.Router();

/**
 * Helper function to prepare email credentials
 * Combines basic credentials with OAuth2 tokens if available
 */
async function prepareEmailCredentials(userId, baseCredentials = {}) {
  // Get the user's email configuration if not provided
  let emailConfig = baseCredentials;
  
  if (!emailConfig.host) {
    const { data, error } = await supabase
      .from('email_configurations')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (error) {
      throw new Error('Email configuration not found');
    }
    
    emailConfig = {
      ...emailConfig,
      host: data.host,
      port: data.port || 993,
      secure: data.secure !== false,
      provider: data.provider
    };
  }
  
  // If user email is not provided, get it from profile
  if (!emailConfig.user) {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();
      
    if (!profileError && profileData && profileData.email) {
      emailConfig.user = profileData.email;
    } else {
      console.error('Error getting user email from profile:', profileError);
      throw new Error('User email address is required');
    }
  }
  
  // Check if user has OAuth tokens
  if (!emailConfig.password && !emailConfig.oauth2) {
    const { data: tokenData, error: tokenError } = await supabase
      .from('email_oauth_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', emailConfig.provider)
      .single();
      
    if (!tokenError && tokenData) {
      // Check if token is expired and needs refreshing
      const expiresAt = new Date(tokenData.expires_at);
      const now = new Date();
      
      if (expiresAt <= now && tokenData.refresh_token) {
        // Token expired, refresh it
        try {
          console.log('Refreshing expired OAuth token...');
          const refreshedTokens = await emailService.refreshOAuth2Token({
            provider: tokenData.provider,
            refreshToken: tokenData.refresh_token
          });
          
          // Update tokens in database
          await supabase
            .from('email_oauth_tokens')
            .update({
              access_token: refreshedTokens.accessToken,
              refresh_token: refreshedTokens.refreshToken || tokenData.refresh_token,
              expires_at: new Date(refreshedTokens.expiresAt).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', tokenData.id);
            
          console.log('OAuth token refreshed successfully');
          
          // Use refreshed tokens - format exactly as ImapFlow expects
          emailConfig.oauth2 = {
            user: emailConfig.user,
            accessToken: refreshedTokens.accessToken,
            refreshToken: refreshedTokens.refreshToken || tokenData.refresh_token,
            expires: refreshedTokens.expiresAt, // Note: 'expires' not 'expiresAt' for ImapFlow
            // Add OAuth provider-specific client details
            clientId: process.env[`${tokenData.provider.toUpperCase()}_CLIENT_ID`],
            clientSecret: process.env[`${tokenData.provider.toUpperCase()}_CLIENT_SECRET`]
          };
          
          // Debug what we're sending
          console.log('oauth2Info:', {
            hasAccessToken: !!emailConfig.oauth2.accessToken,
            hasRefreshToken: !!emailConfig.oauth2.refreshToken,
            accessTokenLength: emailConfig.oauth2.accessToken?.length,
            refreshTokenLength: emailConfig.oauth2.refreshToken?.length,
            hasClientId: !!emailConfig.oauth2.clientId,
            hasClientSecret: !!emailConfig.oauth2.clientSecret,
            expiresAt: new Date(emailConfig.oauth2.expires).toISOString()
          });
        } catch (refreshError) {
          console.error('Error refreshing OAuth token:', refreshError);
          throw new Error('Failed to refresh OAuth token. Please reconnect your email account.');
        }
      } else if (expiresAt > now) {
        // Token still valid, use it - format exactly as ImapFlow expects
        emailConfig.oauth2 = {
          user: emailConfig.user,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expires: new Date(tokenData.expires_at).getTime(), // Note: 'expires' not 'expiresAt' for ImapFlow
          // Add OAuth provider-specific client details
          clientId: process.env[`${tokenData.provider.toUpperCase()}_CLIENT_ID`],
          clientSecret: process.env[`${tokenData.provider.toUpperCase()}_CLIENT_SECRET`]
        };
        
        // Debug what we're sending
        console.log('oauth2Info:', {
          hasAccessToken: !!emailConfig.oauth2.accessToken,
          hasRefreshToken: !!emailConfig.oauth2.refreshToken,
          accessTokenLength: emailConfig.oauth2.accessToken?.length,
          refreshTokenLength: emailConfig.oauth2.refreshToken?.length,
          hasClientId: !!emailConfig.oauth2.clientId,
          hasClientSecret: !!emailConfig.oauth2.clientSecret,
          expiresAt: new Date(emailConfig.oauth2.expires).toISOString()
        });
      } else {
        // Token expired and no refresh token
        throw new Error('OAuth token expired and no refresh token available. Please reconnect your email account.');
      }
    }
  }
  
  // Final validation
  if (!emailConfig.user) {
    throw new Error('User email address is required');
  }
  
  if (!emailConfig.oauth2 && !emailConfig.password) {
    throw new Error('No authentication method provided. Please provide either a password or use OAuth');
  }
  
  return emailConfig;
}

/**
 * Fetch emails from user's mailbox
 * POST /api/email/fetch
 */
router.post('/fetch', async (req, res) => {
  try {
    const { credentials: baseCredentials = {}, mailbox = 'INBOX', limit = 20, unseen = false } = req.body;
    const userId = req.user.id;
    
    console.log(`Email fetch request for user ${userId}, mailbox: ${mailbox}, limit: ${limit}, unseen only: ${unseen}`);
    
    // Check for required fields
    if (!baseCredentials) {
      return res.status(400).json({ error: 'Email credentials are required' });
    }
    
    // Prepare full credentials including OAuth if available
    const fullCredentials = await prepareEmailCredentials(userId, baseCredentials);
    console.log('Credentials prepared successfully');
    
    // Fetch emails using the service
    let emails = await emailService.fetchEmails(fullCredentials, { mailbox, limit, unseen });
    console.log(`Fetched ${emails.length} emails from server`);
    
    // For debugging: log email structure
    if (emails.length > 0) {
      console.log('Example email structure:', {
        id: emails[0].id,
        subject: emails[0].subject,
        hasFlags: !!emails[0].flags,
        flagsIsArray: Array.isArray(emails[0].flags),
        flagsLength: Array.isArray(emails[0].flags) ? emails[0].flags.length : 'n/a',
        flagsContent: emails[0].flags
      });
    } else {
      console.log('No emails fetched from mailbox');
    }
    
    // Ensure that all emails have flags as an array
    emails = emails.map(email => ({
      ...email,
      flags: Array.isArray(email.flags) ? email.flags : []
    }));
    
    console.log(`Returning ${emails.length} emails to client`);
    res.json({ emails });
  } catch (error) {
    console.error('Error fetching emails:', error);
    
    // Check if this is a structured error from our catch block
    if (error.status && error.message) {
      return res.status(error.status).json({ error: error.message });
    }
    
    // Handle other general errors
    const errorMessage = error.message || 'An unexpected error occurred while fetching emails';
    const statusCode = error.statusCode || 500;
    
    res.status(statusCode).json({ error: errorMessage });
  }
});

/**
 * Get mailboxes (folders) for the user's email account
 * POST /api/email/mailboxes
 */
router.post('/mailboxes', async (req, res) => {
  try {
    const { credentials: baseCredentials = {} } = req.body;
    const userId = req.user.id;
    
    // Prepare full credentials including OAuth if available
    const fullCredentials = await prepareEmailCredentials(userId, baseCredentials);
    
    // Get mailboxes using the service
    const mailboxes = await emailService.listMailboxes(fullCredentials);
    
    res.json({ mailboxes });
  } catch (error) {
    console.error('Error listing mailboxes:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Mark email as read
 * POST /api/email/mark-read
 */
router.post('/mark-read', async (req, res) => {
  try {
    const { credentials: baseCredentials = {}, mailbox, uid } = req.body;
    const userId = req.user.id;
    
    // Prepare full credentials including OAuth if available
    const fullCredentials = await prepareEmailCredentials(userId, baseCredentials);
    
    // Mark email as read using the service
    await emailService.markAsRead(fullCredentials, mailbox, uid);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking email as read:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Move email to another mailbox
 * POST /api/email/move
 */
router.post('/move', async (req, res) => {
  try {
    const { credentials: baseCredentials = {}, sourceMailbox, targetMailbox, uid } = req.body;
    const userId = req.user.id;
    
    // Prepare full credentials including OAuth if available
    const fullCredentials = await prepareEmailCredentials(userId, baseCredentials);
    
    // Move email using the service
    await emailService.moveEmail(fullCredentials, sourceMailbox, targetMailbox, uid);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error moving email:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get mailbox statistics
 * POST /api/email/stats
 */
router.post('/stats', async (req, res) => {
  try {
    const { credentials: baseCredentials = {}, mailbox } = req.body;
    const userId = req.user.id;
    
    // Prepare full credentials including OAuth if available
    const fullCredentials = await prepareEmailCredentials(userId, baseCredentials);
    
    // Get mailbox statistics using the service
    const stats = await emailService.getMailboxStats(fullCredentials, mailbox);
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting mailbox stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Start OAuth2 flow for email authentication
 * GET /api/email/oauth2/authorize
 */
router.get('/oauth2/authorize', async (req, res) => {
  try {
    const { provider } = req.query;
    const userId = req.user.id;
    
    // Get the redirect URI
    const redirectUri = process.env.EMAIL_OAUTH_REDIRECT_URI;
    
    // Get the OAuth2 authentication URL
    const authData = emailService.getOAuth2AuthUrl(provider, redirectUri);
    
    // Save state to database for verification later
    const { error } = await supabase
      .from('oauth_states')
      .insert({
        user_id: userId,
        state: authData.state,
        provider
      });
    
    if (error) {
      console.error('Error saving OAuth state:', error);
      return res.status(500).json({ error: 'Failed to initialize OAuth flow' });
    }
    
    res.json({ url: authData.url });
  } catch (error) {
    console.error('Error starting OAuth flow:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * OAuth2 callback for email authentication
 * GET /api/email/oauth2/callback
 */
router.get('/oauth2/callback', async (req, res) => {
  try {
    const { code, state, provider } = req.query;
    
    // Verify state
    const { data: stateData, error: stateError } = await supabase
      .from('oauth_states')
      .select('user_id')
      .eq('state', state)
      .eq('provider', provider)
      .single();
    
    if (stateError || !stateData) {
      console.error('Invalid OAuth state:', stateError);
      return res.status(400).json({ error: 'Invalid OAuth state' });
    }
    
    const userId = stateData.user_id;
    
    // Get the redirect URI
    const redirectUri = process.env.EMAIL_OAUTH_REDIRECT_URI;
    
    // Exchange code for tokens
    const tokens = await emailService.getOAuth2Tokens(provider, code, redirectUri);
    
    // Save tokens to database
    const { error: tokenError } = await supabase
      .from('email_oauth_tokens')
      .upsert({
        user_id: userId,
        provider,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_at: new Date(tokens.expiresAt).toISOString()
      }, {
        onConflict: 'user_id,provider',
        ignoreDuplicates: false
      });
    
    if (tokenError) {
      console.error('Error saving OAuth tokens:', tokenError);
      return res.status(500).json({ error: 'Failed to save OAuth tokens' });
    }
    
    // Clean up state
    await supabase
      .from('oauth_states')
      .delete()
      .eq('state', state);
    
    // Redirect to a success page
    res.redirect('/oauth-success.html');
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Manual setup for email configuration
 * POST /api/email/manual-setup
 */
router.post('/manual-setup', async (req, res) => {
  try {
    const { email, provider } = req.body;
    const userId = req.user.id;
    
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }
    
    // Save email configuration to database
    const { error } = await supabase
      .from('email_configurations')
      .upsert({
        user_id: userId,
        host: provider === 'gmail' ? 'imap.gmail.com' : 
              provider === 'outlook' ? 'outlook.office365.com' : 
              provider === 'yahoo' ? 'imap.mail.yahoo.com' : 
              'imap.gmail.com', // Default to Gmail
        port: 993,
        secure: true,
        provider: provider || 'gmail'
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: false
      });
    
    if (error) {
      console.error('Error saving email configuration:', error);
      return res.status(500).json({ error: 'Failed to save email configuration' });
    }
    
    // Update profile with email address
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ email })
      .eq('id', userId);
    
    if (profileError) {
      console.error('Error updating profile:', profileError);
    }
    
    res.json({ success: true, message: 'Email configured successfully' });
  } catch (error) {
    console.error('Error in manual setup:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user's email configuration
 * GET /api/email/config
 */
router.get('/config', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get the user's email configuration
    const { data, error } = await supabase
      .from('email_configurations')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      return res.json({ configured: false });
    }
    
    // Get the user's OAuth tokens if they exist
    const { data: tokenData, error: tokenError } = await supabase
      .from('email_oauth_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', data.provider)
      .single();
    
    // Check if tokens exist and are not expired
    let hasValidTokens = false;
    if (!tokenError && tokenData) {
      const expiresAt = new Date(tokenData.expires_at);
      const now = new Date();
      hasValidTokens = expiresAt > now;
    }
    
    res.json({
      configured: true,
      config: data,
      hasValidTokens,
      useOAuth: !!tokenData
    });
  } catch (error) {
    console.error('Error getting email configuration:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Test OAuth connection
 * GET /api/email/test-oauth
 */
router.get('/test-oauth', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Prepare credentials with OAuth if available
    const credentials = await prepareEmailCredentials(userId);
    
    if (!credentials.oauth2) {
      return res.status(400).json({ error: 'No OAuth configuration found for this user' });
    }
    
    // Just test connection without fetching any emails
    const client = emailService.createImapClient(credentials);
    await client.connect();
    
    // If we get here, connection was successful
    await client.logout();
    
    res.json({ 
      success: true, 
      message: 'OAuth authentication successful',
      provider: credentials.provider,
      user: credentials.user
    });
  } catch (error) {
    console.error('OAuth test failed:', error);
    res.status(500).json({ 
      error: error.message,
      success: false
    });
  }
});

export default router; 