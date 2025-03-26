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
  
  // Check if we're using OAuth2 or password authentication
  if (credentials.oauth2) {
    // Validate OAuth2 credentials
    if (!credentials.oauth2.accessToken) {
      throw new Error('OAuth2 access token is required');
    }
    
    if (!credentials.user) {
      throw new Error('User email is required for OAuth2 authentication');
    }
    
    return new ImapFlow({
      host: credentials.host,
      port: credentials.port || 993,
      secure: credentials.secure !== false,
      auth: {
        user: credentials.user,
        // Use OAuth2 authentication
        accessToken: credentials.oauth2.accessToken,
        // Optional refresh token handling
        expires: credentials.oauth2.expiresAt,
        refreshToken: credentials.oauth2.refreshToken,
        clientId: credentials.oauth2.clientId,
        clientSecret: credentials.oauth2.clientSecret
      },
      logger: false
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
      host: credentials.host,
      port: credentials.port || 993,
      secure: credentials.secure !== false,
      auth: {
        user: credentials.user,
        pass: credentials.password
      },
      logger: false
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
 * @returns {Promise<Array>} Array of email objects
 */
export async function fetchEmails(credentials, options = {}) {
  const limit = options.limit || 20;
  const mailbox = options.mailbox || 'INBOX';
  const unseenOnly = options.unseen || false;
  
  console.log('fetchEmails called with options:', JSON.stringify({
    limit,
    mailbox,
    unseenOnly,
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
      reverse: true, // Get newest emails first
      limit
    };
    
    // Add criteria for unseen only if requested
    if (unseenOnly) {
      searchOptions.searchCriteria = [['UNSEEN']];
      console.log('Searching for UNSEEN emails only');
    } else {
      console.log('Searching for ALL emails (including read)');
    }
    
    console.log('Fetch search options:', JSON.stringify(searchOptions));
    
    // Fetch emails 
    let count = 0;
    
    console.log('Fetching emails...');
    for await (const message of client.fetch(searchOptions, { envelope: true, source: true, flags: true })) {
      count++;
      console.log(`Processing email ${count} with UID: ${message.uid}`);
      
      try {
        // Get email content
        const parsed = await simpleParser(message.source);
        
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
          flags: message.flags,
          mailbox: mailboxPath // Add mailbox information
        };
        
        emails.push(email);
      } catch (parseError) {
        console.error(`Error parsing email ${message.uid}:`, parseError);
        // Continue with next email instead of failing the entire request
        continue;
      }
    }
    
    console.log(`Fetch complete. Found ${emails.length} emails`);
    
    return emails;
  } catch (error) {
    console.error('Error fetching emails:', error);
    throw error;
  } finally {
    try {
      // Close the mailbox and release resources
      await client.mailboxClose();
    } catch (error) {
      console.error('Error closing mailbox:', error);
    }
    
    try {
      // Close the connection
      await client.logout();
    } catch (error) {
      console.error('Error closing connection:', error);
    }
  }
}

/**
 * Get list of mailboxes (folders) from the email account
 * @param {Object} credentials - User's email credentials
 * @returns {Promise<Array>} Array of mailbox objects
 */
export async function listMailboxes(credentials) {
  const client = createImapClient(credentials);
  
  try {
    await client.connect();
    
    const mailboxes = [];
    
    for await (const mailbox of client.listMailboxes()) {
      mailboxes.push({
        name: mailbox.name,
        path: mailbox.path,
        delimeter: mailbox.delimeter,
        specialUse: mailbox.specialUse
      });
      
      if (mailbox.children) {
        for (const child of mailbox.children) {
          mailboxes.push({
            name: child.name,
            path: child.path,
            delimeter: child.delimeter,
            specialUse: child.specialUse,
            parent: mailbox.path
          });
        }
      }
    }
    
    return mailboxes;
  } finally {
    await client.logout();
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