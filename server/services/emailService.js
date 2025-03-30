import { ImapFlow } from 'imapflow';
import dotenv from 'dotenv';
import { simpleParser } from 'mailparser';

dotenv.config();

/**
 * Create IMAP client for email fetching
 * @param {Object} credentials - User's email credentials
 * @returns {ImapFlow} IMAP client instance
 */
export function createImapClient(credentials) {
  console.log('Creating IMAP client with credentials:', {
    host: credentials.host,
    user: credentials.user,
    useOAuth: !!credentials.oauth2,
    // Don't log the actual tokens for security reasons
    authMethod: credentials.oauth2 ? 'oauth2' : 'password'
  });
  
  // Detect if this is Gmail
  const isGmail = credentials.host.includes('gmail') || credentials.provider === 'gmail';
  
  // Common configuration for both auth methods
  const config = {
    host: credentials.host,
    port: credentials.port || 993,
    secure: credentials.secure !== false,
    // Add timeout configurations to prevent socket hangups
    tls: {
      rejectUnauthorized: true,
      // Increase TLS socket timeout to 60 seconds (default is too low)
      socketTimeout: 60000
    },
    // Add IMAP-specific timeouts
    imap: {
      // Increase idle timeout to 10 minutes (in ms)
      idleTimeout: 600000,
      // Increase the maximum time to wait for commands to complete
      commandTimeout: 30000
    },
    logger: false
  };
  
  // Gmail-specific settings
  if (isGmail) {
    // Gmail requires these specific settings for better compatibility
    config.auth = {
      ...config.auth,
      user: credentials.user
    };
    
    // Special handling for Gmail
    console.log('Using Gmail-specific IMAP settings');
  }
  
  // Check if we're using OAuth2 or password authentication
  if (credentials.oauth2) {
    // Validate OAuth2 credentials
    if (!credentials.oauth2.accessToken) {
      throw new Error('OAuth2 access token is required');
    }
    
    if (!credentials.user) {
      throw new Error('User email is required for OAuth2 authentication');
    }
    
    // Format auth object properly for ImapFlow - it's format sensitive
    const auth = {
      user: credentials.user,
      accessToken: credentials.oauth2.accessToken
    };
    
    // Optional OAuth properties
    if (credentials.oauth2.refreshToken) {
      auth.refreshToken = credentials.oauth2.refreshToken;
    }
    
    if (credentials.oauth2.expires) {
      auth.expires = credentials.oauth2.expires;
    }
    
    if (credentials.oauth2.clientId) {
      auth.clientId = credentials.oauth2.clientId;
    }
    
    if (credentials.oauth2.clientSecret) {
      auth.clientSecret = credentials.oauth2.clientSecret;
    }
    
    console.log('Creating IMAP client with OAuth2 configuration:', {
      user: auth.user,
      hasAccessToken: !!auth.accessToken,
      hasRefreshToken: !!auth.refreshToken,
      hasExpires: !!auth.expires,
      expiresIn: auth.expires ? Math.round((auth.expires - Date.now()) / 1000) + ' seconds' : 'unknown',
      hasClientId: !!auth.clientId,
      hasClientSecret: !!auth.clientSecret
    });
    
    return new ImapFlow({
      ...config,
      auth
    });
  } else {
    // Validate password credentials
    if (!credentials.password) {
      throw new Error('Password is required for password authentication');
    }
    
    if (!credentials.user) {
      throw new Error('User email is required for password authentication');
    }
    
    // Fall back to password authentication for providers that don't support OAuth
    return new ImapFlow({
      ...config,
      auth: {
        user: credentials.user,
        pass: credentials.password
      }
    });
  }
}

/**
 * Fetch emails from user's mailbox
 * @param {Object} credentials - User's email credentials
 * @param {Object} options - Options for fetching emails
 * @param {number} options.limit - Maximum number of emails to fetch (default: 20)
 * @param {string} options.mailbox - Mailbox to fetch from (default: 'INBOX')
 * @param {boolean} options.unseen - Whether to fetch only unseen messages (default: false)
 * @param {boolean} options.reverse - Whether to fetch in reverse chronological order (default: true)
 * @returns {Promise<Array>} Array of email objects
 */
export async function fetchEmails(credentials, options = {}) {
  const limit = options.limit || 20;
  const mailbox = options.mailbox || 'INBOX';
  const unseenOnly = options.unseen || false;
  // Default to reverse: true (newest first) unless explicitly set to false
  const reverse = options.reverse !== false;
  
  console.log('fetchEmails called with options:', JSON.stringify({
    limit,
    mailbox,
    unseenOnly,
    reverse,
    credentials: {
      host: credentials.host,
      user: credentials.user,
      useOAuth: !!credentials.oauth2,
      hasPassword: typeof credentials.password === 'string', 
      passwordLength: credentials.password ? credentials.password.length : 0,
      oauth2Info: credentials.oauth2 ? {
        hasAccessToken: !!credentials.oauth2.accessToken,
        hasRefreshToken: !!credentials.oauth2.refreshToken,
        hasClientId: !!credentials.oauth2.clientId,
        hasClientSecret: !!credentials.oauth2.clientSecret,
        accessTokenLength: credentials.oauth2.accessToken ? credentials.oauth2.accessToken.length : 0
      } : null
    }
  }, null, 2));
  
  // Check if authentication credentials are missing
  if (!credentials.oauth2 && !credentials.password) {
    console.error('Authentication Error: Neither password nor OAuth2 credentials were provided');
    throw new Error('Authentication Error: No authentication method provided. Please provide either a password or OAuth2 credentials.');
  }
  
  if (credentials.oauth2 && !credentials.oauth2.accessToken) {
    console.error('OAuth2 Error: Access token is missing');
  }
  
  const client = createImapClient(credentials);
  
  try {
    // Set a timeout for the entire operation (3 minutes)
    const operationTimeout = setTimeout(() => {
      console.error('Email fetch operation timed out after 3 minutes');
      client.close().catch(err => console.error('Error closing client on timeout:', err));
      throw new Error('Email fetch operation timed out');
    }, 180000);
    
    // Connect to the server
    console.log('Connecting to IMAP server...');
    await client.connect();
    console.log('Connected to IMAP server successfully');

    // For Gmail, handle special mailbox paths
    const isGmail = credentials.host.includes('gmail') || credentials.provider === 'gmail';
    let mailboxPath = mailbox;

    if (isGmail) {
      // Map common mailbox names to Gmail-specific paths if not already in Gmail format
      if (!mailbox.startsWith('[Gmail]')) {
        const gmailMailboxMap = {
          'SENT': '[Gmail]/Sent Mail',
          'DRAFTS': '[Gmail]/Drafts',
          'ARCHIVE': '[Gmail]/All Mail',
          'TRASH': '[Gmail]/Trash',
          'SPAM': '[Gmail]/Spam',
          'STARRED': '[Gmail]/Starred',
          'IMPORTANT': '[Gmail]/Important'
        };
        mailboxPath = gmailMailboxMap[mailbox.toUpperCase()] || mailbox;
      }
      
      // For Gmail, we need specific search options
      console.log('Using Gmail-specific search approach');
    }
    
    // Select the mailbox to open
    console.log(`Opening mailbox: "${mailboxPath}"`);
    const mailboxInfo = await client.mailboxOpen(mailboxPath);
    console.log('Mailbox opened successfully');
    console.log(`Mailbox has ${mailboxInfo.exists} total messages, ${mailboxInfo.unseen || 0} unseen`);
    
    // Prepare the emails array
    const emails = [];
    
    // Check if we have any messages to fetch
    if (mailboxInfo.exists === 0) {
      console.log('Mailbox is empty, no emails to fetch');
      return emails;
    }
    
    // Build search query
    const searchOptions = {
      reverse, // Always use reverse (default: true) to get newest emails first unless specified otherwise
      limit
    };
    
    // Add criteria for unseen only if requested
    if (unseenOnly) {
      searchOptions.searchCriteria = [['UNSEEN']];
      console.log('Searching for UNSEEN emails only');
    } else {
      // For Gmail, we need to use ALL search criteria to get all emails
      // Otherwise, ImapFlow might use default criteria that excludes some messages
      searchOptions.searchCriteria = [['ALL']];
      console.log('Searching for ALL emails (including read)');
    }
    
    console.log('Fetch search options:', JSON.stringify(searchOptions));
    
    // Fetch emails 
    let count = 0;
    
    console.log('Fetching emails...');
    // Use a try/catch inside the fetch loop to handle errors with individual messages
    try {
      for await (const message of client.fetch(searchOptions, { envelope: true, source: true, flags: true })) {
        count++;
        console.log(`Processing email ${count} with UID: ${message.uid}`);
        
        try {
          // Get email content
          const parsed = await simpleParser(message.source);
          
          // Debug message flags
          console.log(`Email ${message.uid} flags:`, message.flags);
          
          // Check if message has the unseen flag
          let hasUnseen = false;
          if (Array.isArray(message.flags)) {
            hasUnseen = !message.flags.includes('\\Seen');
          }
          
          // Extract relevant information
          const email = {
            id: message.uid,
            messageId: parsed.messageId,
            subject: parsed.subject,
            from: parsed.from?.text,
            to: parsed.to?.text,
            date: parsed.date,
            receivedDate: parsed.receivedDate,
            text: parsed.text,
            html: parsed.html,
            attachments: parsed.attachments.map(attachment => ({
              filename: attachment.filename,
              contentType: attachment.contentType,
              size: attachment.size
            })),
            // Ensure flags is always an array and add \Unseen flag if the message is not seen
            flags: Array.isArray(message.flags) ? message.flags : [],
            // If message doesn't have \\Seen flag, add \\Unseen flag explicitly
            mailbox: mailboxPath // Add mailbox information
          };
          
          // If the message doesn't have a \Seen flag, explicitly add \Unseen
          if (hasUnseen && !email.flags.includes('\\Unseen')) {
            email.flags.push('\\Unseen');
          }
          
          emails.push(email);
        } catch (parseError) {
          console.error(`Error parsing email ${message.uid}:`, parseError);
          // Continue with next email instead of failing the entire request
          continue;
        }
      }
    } catch (fetchError) {
      console.error('Error during fetch loop:', fetchError);
      // If we have at least some emails, return them instead of failing
      if (emails.length > 0) {
        console.log(`Fetch partially completed. Returning ${emails.length} emails that were successfully fetched.`);
        return emails;
      }
      throw fetchError; // Re-throw if we couldn't get any emails
    }
    
    // If no emails were found but it's Gmail, try an alternative approach
    if (emails.length === 0 && isGmail) {
      console.log('No emails found with standard approach. Trying Gmail-specific approach...');
      
      // For Gmail, we'll use sequence numbers instead of search criteria
      // This often works better with Gmail's IMAP implementation
      const total = mailboxInfo.exists;
      
      if (total > 0) {
        // Calculate range: start from most recent messages
        const start = Math.max(total - limit + 1, 1);
        const end = total;
        
        console.log(`Fetching emails with sequence numbers from ${start} to ${end}`);
        
        try {
          // Use sequence numbers instead of search criteria
          for await (const message of client.fetch({seq: `${start}:${end}`}, { envelope: true, source: true, flags: true })) {
            count++;
            console.log(`Processing email ${count} with UID: ${message.uid}`);
            
            try {
              // Get email content using the same parsing logic as before
              const parsed = await simpleParser(message.source);
              
              // Debug message flags
              console.log(`Email ${message.uid} flags:`, message.flags);
              
              // Check if message has the unseen flag
              let hasUnseen = false;
              if (Array.isArray(message.flags)) {
                hasUnseen = !message.flags.includes('\\Seen');
              }
              
              // Extract relevant information (same as before)
              const email = {
                id: message.uid,
                messageId: parsed.messageId,
                subject: parsed.subject,
                from: parsed.from?.text,
                to: parsed.to?.text,
                date: parsed.date,
                receivedDate: parsed.receivedDate,
                text: parsed.text,
                html: parsed.html,
                attachments: parsed.attachments.map(attachment => ({
                  filename: attachment.filename,
                  contentType: attachment.contentType,
                  size: attachment.size
                })),
                // Ensure flags is always an array
                flags: Array.isArray(message.flags) ? message.flags : [],
                mailbox: mailboxPath
              };
              
              // If the message doesn't have a \Seen flag, explicitly add \Unseen
              if (hasUnseen && !email.flags.includes('\\Unseen')) {
                email.flags.push('\\Unseen');
              }
              
              emails.push(email);
            } catch (parseError) {
              console.error(`Error parsing email ${message.uid}:`, parseError);
              continue;
            }
          }
          
          console.log(`Gmail-specific approach fetch complete. Found ${emails.length} emails`);
        } catch (gmailFetchError) {
          console.error('Error during Gmail-specific fetch:', gmailFetchError);
          // If we already have some emails from the first attempt, don't throw
          if (emails.length === 0) {
            throw gmailFetchError;
          }
        }
      }
    }
    
    console.log(`Fetch complete. Found ${emails.length} emails`);
    
    // Clear the timeout as operation completed successfully
    clearTimeout(operationTimeout);
    
    return emails;
  } catch (error) {
    console.error('Error fetching emails:', error);
    
    // Improve error handling with specific messages for common errors
    if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
      throw new Error('Connection to email server timed out. Please try again later.');
    } else if (error.code === 'ECONNRESET') {
      throw new Error('Connection was reset by the email server. Please try again later.');
    } else if (error.authenticationFailed) {
      throw new Error('Authentication failed. Please check your credentials and try again.');
    } else {
      throw error;
    }
  } finally {
    try {
      // Safely close IMAP connection with proper error handling
      // Use a small timeout to ensure we don't wait forever on logout operations
      const safelyCloseConnection = async () => {
        // First try to close the mailbox if it's open
        try {
          await Promise.race([
            client.mailboxClose(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Mailbox close timeout')), 5000))
          ]);
        } catch (closeError) {
          console.warn('Non-critical error closing mailbox:', closeError.message);
          // Continue with logout even if mailbox close fails
        }
        
        // Then try to logout gracefully
        try {
          await Promise.race([
            client.logout(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Logout timeout')), 5000))
          ]);
        } catch (logoutError) {
          console.warn('Non-critical error during logout:', logoutError.message);
          // If logout fails, force close the connection
          try {
            client.close();
          } catch (forceCloseError) {
            console.warn('Failed to force close connection:', forceCloseError.message);
          }
        }
      };
      
      // Execute the safe closing procedure
      await safelyCloseConnection();
    } catch (finalError) {
      console.error('Error during connection cleanup:', finalError);
      // We don't throw here as we're in finally block
    }
  }
}

/**
 * Get list of mailboxes (folders) from the email account
 * @param {Object} credentials - User's email credentials
 * @returns {Promise<Array>} Array of mailbox objects
 */
export async function listMailboxes(credentials) {
  console.log('listMailboxes: Starting with credentials', {
    host: credentials.host,
    user: credentials.user,
    useOAuth: !!credentials.oauth2,
    hasPassword: !!credentials.password
  });
  
  const client = createImapClient(credentials);
  
  try {
    console.log('listMailboxes: Connecting to IMAP server...');
    await client.connect();
    console.log('listMailboxes: Connected successfully');
    
    const mailboxes = [];
    
    // Use client.list() instead of client.listMailboxes()
    const mailboxList = await client.list();
    
    // Process each mailbox in the list
    for (const mailbox of mailboxList) {
      mailboxes.push({
        name: mailbox.name,
        path: mailbox.path,
        delimeter: mailbox.delimiter,
        specialUse: mailbox.specialUse
      });
      
      // Process children if they exist
      if (mailbox.children) {
        for (const child of mailbox.children) {
          mailboxes.push({
            name: child.name,
            path: child.path,
            delimeter: child.delimiter,
            specialUse: child.specialUse,
            parent: mailbox.path
          });
        }
      }
    }
    
    console.log(`listMailboxes: Successfully retrieved ${mailboxes.length} mailboxes`);
    return mailboxes;
  } catch (error) {
    console.error('listMailboxes: Error details:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
      fullError: JSON.stringify(error)
    });
    throw error; // Re-throw the error to be handled by the caller
  } finally {
    try {
      await client.logout();
      console.log('listMailboxes: Successfully logged out');
    } catch (logoutError) {
      console.error('listMailboxes: Error during logout:', logoutError);
    }
  }
}

/**
 * Mark email as read
 * @param {Object} credentials - User's email credentials
 * @param {string} mailbox - Mailbox where the email is located
 * @param {number} uid - UID of the email to mark as read
 */
export async function markAsRead(credentials, mailbox, uid) {
  const client = createImapClient(credentials);
  
  try {
    await client.connect();
    const mailboxLock = await client.getMailboxLock(mailbox);
    
    try {
      // Add the \Seen flag
      await client.messageFlagsAdd({ uid }, ['\\Seen']);
    } finally {
      mailboxLock.release();
    }
  } finally {
    await client.logout();
  }
}

/**
 * Move email to another mailbox
 * @param {Object} credentials - User's email credentials
 * @param {string} sourceMailbox - Source mailbox where the email is located
 * @param {string} targetMailbox - Target mailbox to move the email to
 * @param {number} uid - UID of the email to move
 */
export async function moveEmail(credentials, sourceMailbox, targetMailbox, uid) {
  const client = createImapClient(credentials);
  
  try {
    await client.connect();
    const mailboxLock = await client.getMailboxLock(sourceMailbox);
    
    try {
      // Move message
      await client.messageMove({ uid }, targetMailbox);
    } finally {
      mailboxLock.release();
    }
  } finally {
    await client.logout();
  }
}

/**
 * Get email count statistics for a mailbox
 * @param {Object} credentials - User's email credentials
 * @param {string} mailbox - Mailbox to get statistics for
 * @returns {Promise<Object>} Statistics object with total and unseen counts
 */
export async function getMailboxStats(credentials, mailbox = 'INBOX') {
  const client = createImapClient(credentials);
  
  try {
    await client.connect();
    const mailboxInfo = await client.mailboxOpen(mailbox);
    
    return {
      total: mailboxInfo.exists,
      unseen: mailboxInfo.unseen
    };
  } finally {
    await client.logout();
  }
}

/**
 * Get OAuth2 URL for a specific email provider
 * @param {string} provider - Email provider name (gmail, outlook, yahoo)
 * @param {string} redirectUri - Redirect URI for OAuth flow
 * @returns {Object} OAuth2 authorization URL and config
 */
export function getOAuth2AuthUrl(provider, redirectUri) {
  const providers = {
    gmail: {
      authUrl: 'https://accounts.google.com/o/oauth2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      scope: 'https://mail.google.com/'
    },
    outlook: {
      authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      clientId: process.env.MICROSOFT_EMAIL_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_EMAIL_CLIENT_SECRET,
      scope: 'https://outlook.office.com/IMAP.AccessAsUser.All offline_access'
    },
    yahoo: {
      authUrl: 'https://api.login.yahoo.com/oauth2/request_auth',
      tokenUrl: 'https://api.login.yahoo.com/oauth2/get_token',
      clientId: process.env.YAHOO_CLIENT_ID,
      clientSecret: process.env.YAHOO_CLIENT_SECRET,
      scope: 'mail-w'
    }
  };

  if (!providers[provider]) {
    throw new Error(`Unsupported email provider: ${provider}`);
  }

  const config = providers[provider];
  
  // Generate a random state for security
  const state = Math.random().toString(36).substring(2, 15);
  
  // Build authorization URL
  const authUrl = new URL(config.authUrl);
  authUrl.searchParams.append('client_id', config.clientId);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('scope', config.scope);
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('access_type', 'offline');
  authUrl.searchParams.append('prompt', 'consent');
  
  return {
    url: authUrl.toString(),
    provider,
    state,
    config
  };
}

/**
 * Exchange authorization code for OAuth2 tokens
 * @param {string} provider - Email provider name
 * @param {string} code - Authorization code from OAuth2 redirect
 * @param {string} redirectUri - Redirect URI used in the initial authorization request
 * @returns {Promise<Object>} OAuth2 tokens
 */
export async function getOAuth2Tokens(provider, code, redirectUri) {
  const providers = {
    gmail: {
      tokenUrl: 'https://oauth2.googleapis.com/token',
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    },
    outlook: {
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      clientId: process.env.MICROSOFT_EMAIL_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_EMAIL_CLIENT_SECRET
    },
    yahoo: {
      tokenUrl: 'https://api.login.yahoo.com/oauth2/get_token',
      clientId: process.env.YAHOO_CLIENT_ID,
      clientSecret: process.env.YAHOO_CLIENT_SECRET
    }
  };
  
  if (!providers[provider]) {
    throw new Error(`Unsupported email provider: ${provider}`);
  }
  
  const config = providers[provider];
  
  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OAuth token request failed: ${errorData.error_description || errorData.error || response.statusText}`);
  }
  
  const tokens = await response.json();
  
  // Calculate expiration timestamp
  const expiresAt = Date.now() + (tokens.expires_in * 1000);
  
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt,
    provider
  };
}

/**
 * Refresh an expired OAuth2 access token
 * @param {Object} tokenInfo - Token information including refreshToken
 * @returns {Promise<Object>} Updated token information
 */
export async function refreshOAuth2Token(tokenInfo) {
  const providers = {
    gmail: {
      tokenUrl: 'https://oauth2.googleapis.com/token',
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    },
    outlook: {
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      clientId: process.env.MICROSOFT_EMAIL_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_EMAIL_CLIENT_SECRET
    },
    yahoo: {
      tokenUrl: 'https://api.login.yahoo.com/oauth2/get_token',
      clientId: process.env.YAHOO_CLIENT_ID,
      clientSecret: process.env.YAHOO_CLIENT_SECRET
    }
  };
  
  const config = providers[tokenInfo.provider];
  
  if (!config) {
    throw new Error(`Unsupported email provider: ${tokenInfo.provider}`);
  }
  
  if (!tokenInfo.refreshToken) {
    throw new Error('Refresh token is required');
  }
  
  console.log(`Refreshing OAuth token for provider: ${tokenInfo.provider}`);
  
  // Check if client credentials are available
  if (!config.clientId || !config.clientSecret) {
    throw new Error(`OAuth client credentials missing for provider: ${tokenInfo.provider}`);
  }
  
  try {
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        refresh_token: tokenInfo.refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'refresh_token'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch (e) {
        // Not JSON response
      }
      
      console.error('Token refresh failed:', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorJson || errorText
      });
      
      throw new Error(`Token refresh failed: ${
        errorJson?.error_description || 
        errorJson?.error || 
        response.statusText || 
        `HTTP ${response.status}`
      }`);
    }
    
    const tokens = await response.json();
    
    // Calculate new expiration timestamp
    const expiresAt = Date.now() + (tokens.expires_in * 1000);
    
    return {
      accessToken: tokens.access_token,
      // Some providers don't return a new refresh token, so keep the old one
      refreshToken: tokens.refresh_token || tokenInfo.refreshToken,
      expiresAt,
      provider: tokenInfo.provider
    };
  } catch (error) {
    console.error('Error refreshing OAuth token:', error);
    throw error;
  }
}

/**
 * Send an email or reply to an existing email
 * @param {Object} credentials - User's email credentials
 * @param {Object} emailData - Email data to send
 * @param {string} emailData.to - Recipient email address
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.text - Plain text content
 * @param {string} emailData.html - HTML content (optional)
 * @param {string} emailData.inReplyTo - Message ID to reply to (optional)
 * @param {string} emailData.references - References for threading (optional)
 * @returns {Promise<Object>} Result of the send operation
 */
export async function sendEmail(credentials, emailData) {
  // Input validation
  if (!emailData.to) {
    throw new Error('Recipient (to) is required');
  }
  
  if (!emailData.subject) {
    throw new Error('Email subject is required');
  }
  
  if (!emailData.text && !emailData.html) {
    throw new Error('Email content (text or html) is required');
  }
  
  // We need to use a different package for sending emails
  // Import nodemailer dynamically to avoid loading issues
  const nodemailer = await import('nodemailer');
  
  // Create SMTP configuration based on IMAP credentials
  const smtpConfig = {
    host: credentials.host.replace('imap.', 'smtp.'), // Convert IMAP host to SMTP host
    port: 587, // Standard SMTP port
    secure: false, // Use TLS
    auth: {}
  };
  
  // Handle special cases for common providers
  if (credentials.provider === 'gmail') {
    smtpConfig.host = 'smtp.gmail.com';
  } else if (credentials.provider === 'outlook') {
    smtpConfig.host = 'smtp.office365.com';
  } else if (credentials.provider === 'yahoo') {
    smtpConfig.host = 'smtp.mail.yahoo.com';
    smtpConfig.port = 465;
    smtpConfig.secure = true;
  }
  
  // Set authentication method based on credentials
  if (credentials.oauth2) {
    smtpConfig.auth = {
      type: 'OAuth2',
      user: credentials.user,
      accessToken: credentials.oauth2.accessToken
    };
  } else {
    smtpConfig.auth = {
      user: credentials.user,
      pass: credentials.password
    };
  }
  
  // Create transporter
  const transporter = nodemailer.default.createTransport(smtpConfig);
  
  // Prepare email data
  const mailOptions = {
    from: credentials.user,
    to: emailData.to,
    subject: emailData.subject,
    text: emailData.text || '',
    html: emailData.html || undefined
  };
  
  // Add threading headers for replies if provided
  if (emailData.inReplyTo) {
    mailOptions.inReplyTo = emailData.inReplyTo;
  }
  
  if (emailData.references) {
    mailOptions.references = emailData.references;
  }
  
  // Send the email
  console.log('Sending email with options:', {
    to: mailOptions.to,
    subject: mailOptions.subject,
    contentLength: (mailOptions.text || '').length,
    hasHtml: !!mailOptions.html,
    isReply: !!mailOptions.inReplyTo
  });
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return {
      success: true,
      messageId: info.messageId,
      response: info.response
    };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
} 