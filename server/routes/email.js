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
      .eq('user_id', userId);
      
    if (error) {
      console.error('Error fetching email configuration:', error);
      throw new Error('Email configuration not found');
    }

    // Check if we have any results
    if (!data || data.length === 0) {
      console.error('No email configuration found for user', userId);
      throw new Error('Email configuration not found');
    }
    
    // Use the first result
    const config = data[0];
    console.log('Found email configuration:', JSON.stringify(config, null, 2));
    
    emailConfig = {
      ...emailConfig,
      host: config.host,
      port: config.port || 993,
      secure: config.secure !== false,
      provider: config.provider
    };
  }
  
  // If user email is not provided, get it from profile
  if (!emailConfig.user) {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId);
      
    if (!profileError && profileData && profileData.length > 0 && profileData[0].email) {
      emailConfig.user = profileData[0].email;
      console.log('Retrieved user email from profile:', emailConfig.user);
    } else {
      console.error('Error getting user email from profile:', profileError || 'No email found');
      throw new Error('User email address is required');
    }
  }
  
  // Check if user has OAuth tokens
  if (!emailConfig.password && !emailConfig.oauth2) {
    const { data: tokenData, error: tokenError } = await supabase
      .from('email_oauth_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', emailConfig.provider);
      
    if (!tokenError && tokenData && tokenData.length > 0) {
      const token = tokenData[0];
      
      // Check if token is expired and needs refreshing
      const expiresAt = new Date(token.expires_at);
      const now = new Date();
      
      if (expiresAt <= now && token.refresh_token) {
        // Token expired, refresh it
        try {
          console.log('Refreshing expired OAuth token...');
          const refreshedTokens = await emailService.refreshOAuth2Token({
            provider: token.provider,
            refreshToken: token.refresh_token
          });
          
          // Update tokens in database
          await supabase
            .from('email_oauth_tokens')
            .update({
              access_token: refreshedTokens.accessToken,
              refresh_token: refreshedTokens.refreshToken || token.refresh_token,
              expires_at: new Date(refreshedTokens.expiresAt).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', token.id);
            
          console.log('OAuth token refreshed successfully');
          
          // Use refreshed tokens - format exactly as ImapFlow expects
          emailConfig.oauth2 = {
            user: emailConfig.user,
            accessToken: refreshedTokens.accessToken,
            refreshToken: refreshedTokens.refreshToken || token.refresh_token,
            expires: refreshedTokens.expiresAt, // Note: 'expires' not 'expiresAt' for ImapFlow
            // Add OAuth provider-specific client details
            clientId: process.env[`${token.provider.toUpperCase()}_CLIENT_ID`],
            clientSecret: process.env[`${token.provider.toUpperCase()}_CLIENT_SECRET`]
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
          accessToken: token.access_token,
          refreshToken: token.refresh_token,
          expires: new Date(token.expires_at).getTime(), // Note: 'expires' not 'expiresAt' for ImapFlow
          // Add OAuth provider-specific client details
          clientId: process.env[`${token.provider.toUpperCase()}_CLIENT_ID`],
          clientSecret: process.env[`${token.provider.toUpperCase()}_CLIENT_SECRET`]
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
    
    // Check if we're using mock authentication - in that case, return mock emails
    if (process.env.USE_MOCK_AUTH === 'true' || process.env.USE_MOCK_AUTH === '1') {
      console.log('Mock auth enabled: Returning sample emails');
      
      // Create some mock emails for testing
      const mockEmails = [
        {
          id: '1',
          messageId: '<mock1@example.com>',
          subject: 'Welcome to Your Email Client',
          from: 'Support Team <support@example.com>',
          to: 'test@example.com',
          date: new Date(Date.now() - 3600000).toISOString(),
          receivedDate: new Date(Date.now() - 3600000).toISOString(),
          text: 'Welcome to your new email client! This is a sample email for testing purposes.',
          html: '<h1>Welcome to Your Email Client</h1><p>This is a sample email for testing purposes.</p>',
          attachments: [],
          flags: unseen ? ['\\Unseen'] : [],
          mailbox
        },
        {
          id: '2',
          messageId: '<mock2@example.com>',
          subject: 'Meeting Reminder',
          from: 'Calendar System <calendar@example.com>',
          to: 'test@example.com',
          date: new Date(Date.now() - 86400000).toISOString(),
          receivedDate: new Date(Date.now() - 86400000).toISOString(),
          text: 'Reminder: Team meeting tomorrow at 10:00 AM',
          html: '<h2>Meeting Reminder</h2><p>Team meeting tomorrow at 10:00 AM</p>',
          attachments: [
            {
              filename: 'agenda.pdf',
              contentType: 'application/pdf',
              size: 125000
            }
          ],
          flags: unseen ? ['\\Unseen'] : [],
          mailbox
        },
        {
          id: '3',
          messageId: '<mock3@example.com>',
          subject: 'Invoice #12345',
          from: 'Billing <billing@example.com>',
          to: 'test@example.com',
          date: new Date(Date.now() - 259200000).toISOString(),
          receivedDate: new Date(Date.now() - 259200000).toISOString(),
          text: 'Your invoice #12345 is attached. Please pay by the end of the month.',
          html: '<h2>Invoice #12345</h2><p>Your invoice is attached. Please pay by the end of the month.</p>',
          attachments: [
            {
              filename: 'invoice-12345.pdf',
              contentType: 'application/pdf',
              size: 250000
            }
          ],
          flags: [],
          mailbox
        }
      ];
      
      return res.json({ emails: mockEmails });
    }
    
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
    
    // Check if we're using mock authentication - in that case, return mock mailboxes
    if (process.env.USE_MOCK_AUTH === 'true' || process.env.USE_MOCK_AUTH === '1') {
      console.log('Mock auth enabled: Returning sample mailboxes');
      
      // Create some mock mailboxes for testing
      const mockMailboxes = [
        {
          name: 'Inbox',
          path: 'INBOX',
          delimiter: '/',
          specialUse: '\\Inbox'
        },
        {
          name: 'Sent',
          path: 'SENT',
          delimiter: '/',
          specialUse: '\\Sent'
        },
        {
          name: 'Drafts',
          path: 'DRAFTS',
          delimiter: '/',
          specialUse: '\\Drafts'
        },
        {
          name: 'Trash',
          path: 'TRASH',
          delimiter: '/',
          specialUse: '\\Trash'
        },
        {
          name: 'Spam',
          path: 'SPAM',
          delimiter: '/',
          specialUse: '\\Junk'
        },
        {
          name: 'Archive',
          path: 'ARCHIVE',
          delimiter: '/',
          specialUse: '\\Archive'
        }
      ];
      
      return res.json({ mailboxes: mockMailboxes });
    }
    
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

/**
 * Send an email or reply to an existing email
 * POST /api/email/send
 */
router.post('/send', async (req, res) => {
  try {
    const { credentials: baseCredentials = {}, to, subject, text, html, inReplyTo, references } = req.body;
    const userId = req.user.id;
    
    console.log(`Email send request for user ${userId} to: ${to}`);
    
    // Check for required fields
    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ error: 'Email recipient, subject, and content are required' });
    }
    
    // Check if we're using mock authentication - in that case, return success without sending
    if (process.env.USE_MOCK_AUTH === 'true' || process.env.USE_MOCK_AUTH === '1') {
      console.log('Mock auth enabled: Simulating successful email send');
      return res.json({ 
        success: true, 
        messageId: 'mock-message-id-' + Date.now(),
        mock: true
      });
    }
    
    // Prepare full credentials including OAuth if available
    const fullCredentials = await prepareEmailCredentials(userId, baseCredentials);
    console.log('Credentials prepared successfully');
    
    // Prepare email data
    const emailData = {
      to,
      subject,
      text,
      html,
      inReplyTo,
      references
    };
    
    // Send email using the service
    const result = await emailService.sendEmail(fullCredentials, emailData);
    console.log('Email sent successfully:', result.messageId);
    
    res.json({ 
      success: true, 
      messageId: result.messageId 
    });
  } catch (error) {
    console.error('Error sending email:', error);
    
    // Check if this is a structured error from our catch block
    if (error.status && error.message) {
      return res.status(error.status).json({ error: error.message });
    }
    
    // Handle other general errors
    const errorMessage = error.message || 'An unexpected error occurred while sending email';
    const statusCode = error.statusCode || 500;
    
    res.status(statusCode).json({ error: errorMessage });
  }
});

/**
 * Fetch sent emails from user's sent mailbox
 * POST /api/email/sent
 */
router.post('/sent', async (req, res) => {
  try {
    const { credentials: baseCredentials = {}, limit = 50 } = req.body;
    const userId = req.user.id;
    
    console.log(`Sent email fetch request for user ${userId}, limit: ${limit}`);
    
    // Check if we're using mock authentication - in that case, return mock sent emails
    if (process.env.USE_MOCK_AUTH === 'true' || process.env.USE_MOCK_AUTH === '1') {
      console.log('Mock auth enabled: Returning sample sent emails');
      
      // Create some mock sent emails for testing with recent dates
      const mockSentEmails = [
        {
          id: 's1',
          messageId: '<mocksent1@example.com>',
          subject: 'Project Update',
          from: 'test@example.com',
          to: 'colleague@example.com',
          date: new Date(Date.now() - 3600000).toISOString(),
          text: 'Here is the latest update on our project. We are making good progress.',
          html: '<h2>Project Update</h2><p>Here is the latest update on our project. We are making good progress.</p>',
          attachments: [],
          flags: [],
          mailbox: 'SENT'
        },
        {
          id: 's2',
          messageId: '<mocksent2@example.com>',
          subject: 'Meeting Notes',
          from: 'test@example.com',
          to: 'team@example.com',
          date: new Date(Date.now() - 86400000).toISOString(),
          text: 'Attached are the notes from our meeting yesterday.',
          html: '<p>Attached are the notes from our meeting yesterday.</p>',
          attachments: [
            {
              filename: 'meeting-notes.pdf',
              contentType: 'application/pdf',
              size: 150000
            }
          ],
          flags: [],
          mailbox: 'SENT'
        },
        {
          id: 's3',
          messageId: '<mocksent3@example.com>',
          subject: 'Follow-up on our conversation',
          from: 'test@example.com',
          to: 'client@example.com',
          date: new Date(Date.now() - 259200000).toISOString(),
          text: 'I wanted to follow up on our conversation from last week.',
          html: '<p>I wanted to follow up on our conversation from last week.</p>',
          attachments: [],
          flags: [],
          mailbox: 'SENT'
        }
      ];
      
      return res.json({ emails: mockSentEmails });
    }
    
    // Prepare full credentials including OAuth if available
    const fullCredentials = await prepareEmailCredentials(userId, baseCredentials);
    console.log('Credentials prepared successfully for sent emails fetch');
    
    // First, let's try to find the sent mailbox path based on common patterns
    let sentMailboxes = [];
    
    // Get all mailboxes to find sent mail folders
    const mailboxList = await emailService.listMailboxes(fullCredentials);
    
    // Common patterns for sent mail folders across email providers
    const sentMailboxPatterns = [
      /^sent$/i,                 // Generic "Sent"
      /^sent\s*mail$/i,          // "Sent Mail"
      /^sent\s*items$/i,         // "Sent Items" (Outlook)
      /^\[gmail\]\/sent\s*mail$/i, // Gmail specific
      /^outbox$/i,               // Some providers use "Outbox"
      /^envoy/i,                 // French "Envoyé"
      /^enviado/i,               // Spanish "Enviado"
      /^gesendet/i               // German "Gesendet"
    ];
    
    // Find mailboxes that match sent mail patterns
    sentMailboxes = mailboxList.filter(mailbox => 
      sentMailboxPatterns.some(pattern => pattern.test(mailbox.path)) || 
      (mailbox.specialUse && mailbox.specialUse === '\\Sent')
    );
    
    console.log(`Found ${sentMailboxes.length} potential sent mailboxes:`, 
      sentMailboxes.map(m => m.path).join(', '));
    
    // If no sent mailbox found, try to use Gmail's default
    if (sentMailboxes.length === 0 && 
        (fullCredentials.host.includes('gmail') || fullCredentials.provider === 'gmail')) {
      console.log('No sent mailbox found, trying Gmail default: [Gmail]/Sent Mail');
      sentMailboxes = [{ path: '[Gmail]/Sent Mail' }];
    }
    
    // If still no sent mailbox, try some common defaults
    if (sentMailboxes.length === 0) {
      console.log('No sent mailbox found, trying common defaults');
      sentMailboxes = [
        { path: 'SENT' },
        { path: 'Sent' },
        { path: 'Sent Items' }
      ];
    }
    
    // Attempt to fetch emails from each potential sent mailbox until we succeed
    let emails = [];
    let fetchSuccess = false;
    
    for (const sentMailbox of sentMailboxes) {
      try {
        console.log(`Attempting to fetch sent emails from: ${sentMailbox.path}`);
        
        // Fetch emails using the service
        // Always use reverse: true to get newest emails first and enforce limit
        const mailboxEmails = await emailService.fetchEmails(fullCredentials, { 
          mailbox: sentMailbox.path, 
          limit,
          reverse: true, // Ensure newest emails come first
        });
        
        console.log(`Fetched ${mailboxEmails.length} sent emails from ${sentMailbox.path}`);
        
        if (mailboxEmails.length > 0) {
          emails = mailboxEmails;
          fetchSuccess = true;
          break; // Exit the loop as we found emails in this mailbox
        }
      } catch (mailboxError) {
        console.error(`Error fetching from mailbox ${sentMailbox.path}:`, mailboxError);
        // Continue to the next mailbox instead of failing completely
      }
    }
    
    if (!fetchSuccess && emails.length === 0) {
      // If all attempts failed, try one more approach - look for emails where the 'from' matches the user
      console.log('No sent emails found in sent mailboxes, trying INBOX as fallback');
      
      try {
        const inboxEmails = await emailService.fetchEmails(fullCredentials, { 
          mailbox: 'INBOX', 
          limit: 100, // Fetch more from inbox to find potential sent emails
          reverse: true, // Ensure newest emails come first
        });
        
        console.log(`Fetched ${inboxEmails.length} emails from INBOX for sent email filtering`);
        
        // Filter emails where the 'from' address contains the user's email
        const userEmail = fullCredentials.user.toLowerCase();
        const filteredSentEmails = inboxEmails.filter(email => 
          email.from && email.from.toLowerCase().includes(userEmail)
        );
        
        if (filteredSentEmails.length > 0) {
          console.log(`Found ${filteredSentEmails.length} potential sent emails in INBOX by filtering`);
          emails = filteredSentEmails.slice(0, limit); // Respect the original limit
        }
      } catch (inboxError) {
        console.error('Error fetching from INBOX as fallback:', inboxError);
      }
    }
    
    // Sort emails by date in descending order to ensure newest first
    emails.sort((a, b) => {
      const dateA = new Date(a.date || a.receivedDate || 0);
      const dateB = new Date(b.date || b.receivedDate || 0);
      return dateB.getTime() - dateA.getTime(); // Descending order (newest first)
    });
    
    // Respect the requested limit
    if (emails.length > limit) {
      console.log(`Limiting sent emails from ${emails.length} to ${limit} (requested limit)`);
      emails = emails.slice(0, limit);
    }
    
    // Ensure all emails have flags as an array and are marked as sent
    emails = emails.map(email => ({
      ...email,
      flags: Array.isArray(email.flags) ? email.flags : [],
      category: 'sent' // Add a category marker for the client
    }));
    
    console.log(`Returning ${emails.length} sent emails to client`);
    res.json({ emails });
  } catch (error) {
    console.error('Error fetching sent emails:', error);
    
    // Check if this is a structured error from our catch block
    if (error.status && error.message) {
      return res.status(error.status).json({ error: error.message });
    }
    
    // Handle other general errors
    const errorMessage = error.message || 'An unexpected error occurred while fetching sent emails';
    const statusCode = error.statusCode || 500;
    
    res.status(statusCode).json({ error: errorMessage });
  }
});

export default router; 