const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    email_confirmed_at: string | null;
    name: string | null;
  };
  session: {
    access_token: string;
    refresh_token: string;
  };
}

export interface SignupResponse {
  user: {
    id: string;
    email: string;
    email_confirmed_at: string | null;
    name: string | null;
  };
  message: string;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to login');
  }

  return response.json();
}

export async function signup(email: string, password: string, name: string): Promise<SignupResponse> {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, name }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to sign up');
  }

  return response.json();
}

export async function checkVerificationStatus(email: string): Promise<{ verified: boolean; message: string, user?: { id: string, email: string, name: string | null } }> {
  const response = await fetch(`${API_URL}/api/auth/verification-status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to check verification status');
  }

  return response.json();
}

export async function resendVerification(email: string): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/api/auth/resend-verification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to resend verification email');
  }

  return response.json();
}

export function logout(): void {
  localStorage.removeItem('session');
  localStorage.removeItem('user');
}

export function getUser(): { id: string; email: string; name?: string } | null {
  const userJson = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  return userJson ? JSON.parse(userJson) : null;
}

export function getSession(): { access_token: string; refresh_token: string } | null {
  const sessionJson = typeof window !== 'undefined' ? localStorage.getItem('session') : null;
  if (!sessionJson) return null;
  
  try {
    const parsedSession = JSON.parse(sessionJson);
    // Validate session object structure
    if (!parsedSession || !parsedSession.access_token) {
      console.warn("Invalid session format in localStorage");
      return null;
    }
    return parsedSession;
  } catch (error) {
    console.error("Error parsing session from localStorage:", error);
    // Clear invalid session
    localStorage.removeItem('session');
    return null;
  }
}

export function storeGoogleToken(token: string): void {
  if (typeof window !== 'undefined') {
    // Simple string storage for backward compatibility
    localStorage.setItem('google_token', token);
  }
}

export function getGoogleToken(): string | null {
  if (typeof window !== 'undefined') {
    const tokenData = localStorage.getItem('google_token');
    if (!tokenData) {
      console.warn('No Google token found in localStorage');
      return null;
    }
    
    try {
      // Check if the token is stored as a JSON object (new format)
      const parsedToken = JSON.parse(tokenData);
      
      // If it's the new format with expires_at
      if (parsedToken && typeof parsedToken === 'object') {
        if (parsedToken.token) {
          // Check if token is expired
          if (parsedToken.expires_at && Date.now() > parsedToken.expires_at) {
            console.warn("Google token has expired, timestamp:", parsedToken.expires_at);
            localStorage.removeItem('google_token');
            localStorage.setItem('google_auth_needed', 'true');
            return null;
          }
          
          console.log(`Using token from new format, token type: ${parsedToken.type}`);
          // Return just the token string
          return parsedToken.token;
        } else {
          console.warn("Token object found but missing 'token' property");
        }
      }
      
      // If JSON parsing succeeded but it's just a string, return it
      if (typeof parsedToken === 'string') {
        console.log('Using token stored as direct string');
        return parsedToken;
      }
      
      // Something went wrong with the format
      console.warn("Invalid token format in localStorage:", typeof parsedToken);
      return null;
    } catch (e) {
      // If JSON parsing failed, it's probably the old format (just the token string)
      console.log('Using token in old format (direct string)');
      return tokenData;
    }
  }
  return null;
}

export function clearGoogleToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('google_token');
    // Also clear any auth needed flags
    localStorage.removeItem('google_auth_needed');
  }
}

export async function getGoogleAuthUrl(): Promise<string> {
  try {
    const session = getSession();
    if (!session) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_URL}/api/calendar/auth-url`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get Google auth URL');
    }

    const data = await response.json();
    return data.url;
  } catch (error: any) {
    console.error('Error getting Google auth URL:', error);
    throw error;
  }
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: { email: string; displayName?: string }[];
  htmlLink?: string;
  colorId?: string;
  conferenceData?: any;
  hangoutLink?: string;
  isPublic?: boolean;
  isHoliday?: boolean;
  isIndian?: boolean;
}

export async function fetchCalendarEvents(
  startDate: Date,
  endDate: Date
): Promise<{ events: CalendarEvent[]; authError?: boolean }> {
  try {
    console.log("Fetching calendar events...");
    const session = getSession();
    const googleToken = getGoogleToken();
    const user = getUser();
    
    if (!session || !session.access_token) {
      console.warn("No session or access token, skipping event fetch");
      return { events: [] };
    }

    if (!googleToken) {
      console.warn("No Google token available, can't fetch events");
      return { events: [], authError: true };
    }

    // Debug logs to help diagnose issues
    console.log(`API_URL: ${API_URL}`);
    console.log(`Has Google Token: ${Boolean(googleToken)}`);
    
    try {
      const response = await fetch(
        `${API_URL}/api/calendar/events?start=${startDate.toISOString()}&end=${endDate.toISOString()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'X-Google-Token': googleToken
          }
        }
      );

      // Handle common error cases
      if (response.status === 401) {
        // If we get a 401, check if it's due to Google token being invalid
        const data = await response.json();
        if (data.error === 'Invalid Google credentials') {
          console.warn("Google token is invalid, clearing it");
          // Clear the stored token since it's invalid
          clearGoogleToken();
          // Set a flag for re-authentication
          localStorage.setItem('google_auth_needed', 'true');
          return { events: [], authError: true };
        }
        throw new Error('Authentication expired');
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch calendar events');
      }

      const data = await response.json();
      return { events: data.events || [] };
    } catch (fetchError) {
      console.error("Network error fetching calendar events:", fetchError);
      
      // Check if it's a network error (server not running)
      if (fetchError instanceof TypeError && fetchError.message.includes('Failed to fetch')) {
        console.warn("Server might be offline or unreachable");
        return { 
          events: [{
            id: 'server-error',
            summary: 'Server Connection Error',
            description: 'Unable to connect to the calendar server. Please try again later.',
            start: { dateTime: new Date().toISOString() },
            end: { dateTime: new Date(new Date().getTime() + 30 * 60000).toISOString() },
            colorId: '11' // Red
          }]
        };
      }
      
      throw fetchError;
    }
  } catch (error: any) {
    console.error('Error fetching calendar events:', error);
    return { 
      events: [{
        id: 'error-' + Date.now(),
        summary: 'Calendar Error',
        description: `Error: ${error.message || 'Unknown error'}`,
        start: { dateTime: new Date().toISOString() },
        end: { dateTime: new Date(new Date().getTime() + 30 * 60000).toISOString() },
        colorId: '11' // Red
      }]
    };
  }
}

export async function refreshAccessToken(): Promise<boolean> {
  try {
    const session = getSession();
    if (!session || !session.refresh_token) {
      console.error("No refresh token available");
      return false;
    }

    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });

    if (!response.ok) {
      console.error("Failed to refresh token");
      return false;
    }

    const data = await response.json();
    if (!data.session || !data.session.access_token) {
      console.error("Invalid response when refreshing token");
      return false;
    }

    // Update stored session with new tokens
    localStorage.setItem('session', JSON.stringify(data.session));
    return true;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return false;
  }
}

export async function createCalendarEvent(
  event: Partial<CalendarEvent>
): Promise<CalendarEvent> {
  try {
    // Get authentication tokens
    let session = getSession();
    const googleToken = getGoogleToken();
    const user = getUser();
    
    console.log('Creating calendar event with:', {
      hasSession: !!session,
      hasAccessToken: !!(session?.access_token),
      hasGoogleToken: !!googleToken,
      googleTokenLength: googleToken ? googleToken.length : 0,
      hasUser: !!user
    });
    
    // Check for authentication issues
    if (!session || !session.access_token) {
      console.warn("Session or access token missing, attempting to refresh");
      
      // Try to refresh the token
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Get the updated session
        session = getSession();
        console.log('Session refreshed successfully');
      } else {
        console.error("Missing session or access token and refresh failed");
        throw new Error('Authentication session required. Please log in again.');
      }
    }
    
    if (!googleToken) {
      console.error("Missing Google token");
      // Trigger reauthentication flow
      localStorage.setItem('google_auth_needed', 'true');
      throw new Error('Google Calendar authentication required. Please connect to Google Calendar first.');
    }
    
    if (!user) {
      console.error("Missing user information");
      throw new Error('User authentication required. Please log in again.');
    }
    
    // Ensure event has required fields and format them correctly
    if (!event.summary) {
      throw new Error('Event summary is required.');
    }
    
    if (!event.start || !event.end) {
      throw new Error('Event start and end times are required.');
    }
    
    // Ensure the event object has the correct format
    const formattedEvent = {
      ...event,
      start: {
        dateTime: event.start.dateTime,
        timeZone: event.start.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: event.end.dateTime,
        timeZone: event.end.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };
    
    // Make the API request
    try {
      console.log('Sending calendar event creation request with formatted event:', formattedEvent);
      const response = await fetch(`${API_URL}/api/calendar/create-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'X-Google-Token': googleToken
        },
        body: JSON.stringify({ 
          eventDetails: formattedEvent,
          accessToken: googleToken
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server returned error:', errorData);
        
        // Enhanced error messages for different scenarios
        if (errorData.details) {
          throw new Error(`${errorData.error}: ${errorData.details}`);
        } else {
          throw new Error(errorData.error || 'Failed to create calendar event');
        }
      }
      
      const data = await response.json();
      console.log('Event created successfully');
      return data.event;
    } catch (fetchError) {
      console.error("Network error creating calendar event:", fetchError);
      throw fetchError;
    }
  } catch (error: any) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
}

export async function deleteCalendarEvent(
  eventId: string
): Promise<boolean> {
  try {
    // Get authentication tokens
    let session = getSession();
    const googleToken = getGoogleToken();
    
    console.log('Deleting calendar event:', {
      eventId,
      hasSession: !!session,
      hasGoogleToken: !!googleToken
    });
    
    // Check for authentication issues
    if (!session || !session.access_token) {
      console.warn("Session or access token missing, attempting to refresh");
      
      // Try to refresh the token
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Get the updated session
        session = getSession();
        console.log('Session refreshed successfully');
      } else {
        console.error("Missing session or access token and refresh failed");
        throw new Error('Authentication session required. Please log in again.');
      }
    }
    
    if (!googleToken) {
      console.error("Missing Google token");
      // Trigger reauthentication flow
      localStorage.setItem('google_auth_needed', 'true');
      throw new Error('Google Calendar authentication required. Please connect to Google Calendar first.');
    }
    
    if (!eventId) {
      throw new Error('Event ID is required for deletion.');
    }
    
    // Make the API request
    const response = await fetch(`${API_URL}/api/calendar/delete-event/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'X-Google-Token': googleToken
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Server returned error:', errorData);
      throw new Error(errorData.error || 'Failed to delete calendar event');
    }
    
    console.log('Event deleted successfully');
    return true;
  } catch (error: any) {
    console.error('Error deleting calendar event:', error);
    throw error;
  }
}

export async function updateCalendarEvent(
  eventId: string,
  event: Partial<CalendarEvent>
): Promise<CalendarEvent> {
  try {
    // Get authentication tokens
    let session = getSession();
    const googleToken = getGoogleToken();
    const user = getUser();
    
    console.log('Updating calendar event:', {
      eventId,
      hasSession: !!session,
      hasGoogleToken: !!googleToken,
      hasUser: !!user
    });
    
    // Check for authentication issues
    if (!session || !session.access_token) {
      console.warn("Session or access token missing, attempting to refresh");
      
      // Try to refresh the token
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Get the updated session
        session = getSession();
        console.log('Session refreshed successfully');
      } else {
        console.error("Missing session or access token and refresh failed");
        throw new Error('Authentication session required. Please log in again.');
      }
    }
    
    if (!googleToken) {
      console.error("Missing Google token");
      // Trigger reauthentication flow
      localStorage.setItem('google_auth_needed', 'true');
      throw new Error('Google Calendar authentication required. Please connect to Google Calendar first.');
    }
    
    if (!eventId) {
      throw new Error('Event ID is required for updating.');
    }
    
    // Ensure the event object has the correct format
    const formattedEvent = {
      ...event,
      start: {
        dateTime: event.start?.dateTime,
        timeZone: event.start?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: event.end?.dateTime,
        timeZone: event.end?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };
    
    // Make the API request
    const response = await fetch(`${API_URL}/api/calendar/update-event/${eventId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
        'X-Google-Token': googleToken
      },
      body: JSON.stringify({ 
        eventDetails: formattedEvent,
        accessToken: googleToken
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Server returned error:', errorData);
      
      if (errorData.details) {
        throw new Error(`${errorData.error}: ${errorData.details}`);
      } else {
        throw new Error(errorData.error || 'Failed to update calendar event');
      }
    }
    
    const data = await response.json();
    console.log('Event updated successfully');
    return data.event;
  } catch (error: any) {
    console.error('Error updating calendar event:', error);
    throw error;
  }
}

// Email interfaces
export interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
}

export interface Email {
  id: string;
  messageId: string;
  subject: string;
  from: string;
  to: string;
  date: string; 
  receivedDate: string;
  text: string;
  html: string;
  attachments: EmailAttachment[];
  flags: string[];
}

export interface Mailbox {
  path: string;
  name: string;
  delimiter: string;
  specialUse?: string;
  exists: number;
  unseen?: number;
}

// Email service functions
export async function fetchEmails(options: { 
  limit?: number; 
  mailbox?: string; 
  unseen?: boolean;
} = {}): Promise<{ emails: Email[]; error?: boolean }> {
  try {
    const session = getSession();
    
    if (!session || !session.access_token) {
      console.warn("No session or access token, can't fetch emails");
      return { emails: [], error: true };
    }

    // Make the API request
    const response = await fetch(`${API_URL}/api/email/fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ 
        options: {
          limit: options.limit || 20,
          mailbox: options.mailbox || 'INBOX',
          unseen: options.unseen || false
        },
        saveMetadata: true
      })
    });

    // Handle auth errors
    if (response.status === 401) {
      // Try to refresh the token
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry with new token
        return fetchEmails(options);
      } else {
        console.error("Authentication failed and refresh failed");
        return { emails: [], error: true };
      }
    }

    if (!response.ok) {
      const error = await response.json();
      console.error("Email fetch error:", error);
      return { emails: [], error: true };
    }

    const data = await response.json();
    return { emails: data.emails || [] };
  } catch (error: any) {
    console.error('Error fetching emails:', error);
    return { emails: [], error: true };
  }
}

export async function listMailboxes(): Promise<{ mailboxes: Mailbox[]; error?: boolean }> {
  try {
    const session = getSession();
    
    if (!session || !session.access_token) {
      console.warn("No session or access token, can't fetch mailboxes");
      return { mailboxes: [], error: true };
    }

    // Make the API request
    const response = await fetch(`${API_URL}/api/email/mailboxes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({})
    });

    // Handle auth errors
    if (response.status === 401) {
      // Try to refresh the token
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry with new token
        return listMailboxes();
      } else {
        console.error("Authentication failed and refresh failed");
        return { mailboxes: [], error: true };
      }
    }

    if (!response.ok) {
      const error = await response.json();
      console.error("Mailbox list error:", error);
      return { mailboxes: [], error: true };
    }

    const data = await response.json();
    return { mailboxes: data.mailboxes || [] };
  } catch (error: any) {
    console.error('Error listing mailboxes:', error);
    return { mailboxes: [], error: true };
  }
}

export async function markEmailAsRead(mailbox: string, uid: string): Promise<boolean> {
  try {
    const session = getSession();
    
    if (!session || !session.access_token) {
      console.warn("No session or access token, can't mark email as read");
      return false;
    }

    // Make the API request
    const response = await fetch(`${API_URL}/api/email/mark-read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ mailbox, uid })
    });

    // Handle auth errors
    if (response.status === 401) {
      // Try to refresh the token
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry with new token
        return markEmailAsRead(mailbox, uid);
      } else {
        console.error("Authentication failed and refresh failed");
        return false;
      }
    }

    if (!response.ok) {
      const error = await response.json();
      console.error("Mark as read error:", error);
      return false;
    }

    return true;
  } catch (error: any) {
    console.error('Error marking email as read:', error);
    return false;
  }
}

export async function moveEmail(sourceMailbox: string, targetMailbox: string, uid: string): Promise<boolean> {
  try {
    const session = getSession();
    
    if (!session || !session.access_token) {
      console.warn("No session or access token, can't move email");
      return false;
    }

    // Make the API request
    const response = await fetch(`${API_URL}/api/email/move`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ sourceMailbox, targetMailbox, uid })
    });

    // Handle auth errors
    if (response.status === 401) {
      // Try to refresh the token
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry with new token
        return moveEmail(sourceMailbox, targetMailbox, uid);
      } else {
        console.error("Authentication failed and refresh failed");
        return false;
      }
    }

    if (!response.ok) {
      const error = await response.json();
      console.error("Email move error:", error);
      return false;
    }

    return true;
  } catch (error: any) {
    console.error('Error moving email:', error);
    return false;
  }
}

export async function getEmailOAuthUrl(): Promise<string> {
  try {
    const session = getSession();
    if (!session) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_URL}/api/email/auth-url`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get email auth URL');
    }

    const data = await response.json();
    return data.url;
  } catch (error: any) {
    console.error('Error getting email auth URL:', error);
    throw error;
  }
}

export async function getMailboxStats(mailbox: string = 'INBOX'): Promise<{ total: number; unseen: number; error?: boolean }> {
  try {
    const session = getSession();
    
    if (!session || !session.access_token) {
      console.warn("No session or access token, can't fetch mailbox stats");
      return { total: 0, unseen: 0, error: true };
    }

    // Make the API request
    const response = await fetch(`${API_URL}/api/email/stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ mailbox })
    });

    // Handle auth errors
    if (response.status === 401) {
      // Try to refresh the token
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry with new token
        return getMailboxStats(mailbox);
      } else {
        console.error("Authentication failed and refresh failed");
        return { total: 0, unseen: 0, error: true };
      }
    }

    if (!response.ok) {
      const error = await response.json();
      console.error("Mailbox stats error:", error);
      return { total: 0, unseen: 0, error: true };
    }

    const data = await response.json();
    return { 
      total: data.total || 0, 
      unseen: data.unseen || 0 
    };
  } catch (error: any) {
    console.error('Error getting mailbox stats:', error);
    return { total: 0, unseen: 0, error: true };
  }
}

/**
 * Save a conversation message to the database
 * @param message - The message content
 * @param source - The source of the message ('user' or 'assistant')
 * @param userId - The user ID
 * @param metadata - Optional metadata (conversationId, etc.)
 * @returns Promise with the result
 */
export async function saveConversationMessage(
  message: string,
  source: 'user' | 'assistant',
  metadata: Record<string, any> = {}
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    console.log(`Saving ${source} message to conversation history:`, {
      messagePreview: message.substring(0, 30) + (message.length > 30 ? '...' : ''),
      metadata: Object.keys(metadata)
    });

    // Ensure metadata is properly formatted
    const formattedMetadata = formatMetadata(metadata);
    
    // Get session for user ID and token
    const session = await getSession();
    if (!session || !session.access_token) {
      console.error('No authenticated user found when saving conversation message');
      return { success: false, error: 'Authentication required' };
    }
    
    // Log request details (without sensitive information)
    console.log('Making request to /api/conversations/add with session');
    
    const response = await fetch(`${API_URL}/api/conversations/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        message,
        source,
        metadata: formattedMetadata
      })
    });
    
    // Log response status
    console.log(`Conversation save API returned status: ${response.status}`);
    
    // Handle 401 Unauthorized - attempt to refresh token and retry
    if (response.status === 401) {
      console.warn('Unauthorized when saving conversation message, attempting token refresh');
      try {
        await refreshAccessToken();
        const refreshedSession = await getSession();
        
        if (!refreshedSession?.access_token) {
          console.error('Failed to refresh token');
          return { success: false, error: 'Session expired, please login again' };
        }
        
        // Retry the request with new token
        console.log('Retrying conversation save with refreshed token');
        const retryResponse = await fetch(`${API_URL}/api/conversations/add`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${refreshedSession.access_token}`
          },
          body: JSON.stringify({
            message,
            source,
            metadata: formattedMetadata
          })
        });
        
        if (!retryResponse.ok) {
          console.error(`Retry failed with status: ${retryResponse.status}`);
          
          // Try to parse error response
          try {
            const contentType = retryResponse.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const errorData = await retryResponse.json();
              console.error('Error response from retry:', errorData);
              return { 
                success: false, 
                error: errorData.error || `Server error: ${retryResponse.status}` 
              };
            } else {
              // Handle non-JSON response
              const textResponse = await retryResponse.text();
              console.error('Non-JSON error response from retry:', 
                textResponse.substring(0, 100) + (textResponse.length > 100 ? '...' : ''));
              return { 
                success: false, 
                error: `Server returned non-JSON response: ${retryResponse.status}` 
              };
            }
          } catch (parseError) {
            console.error('Failed to parse retry error response:', parseError);
            return { 
              success: false, 
              error: `Failed to parse server response: ${retryResponse.status}` 
            };
          }
        }
        
        // Parse success response from retry
        try {
          const result = await retryResponse.json();
          console.log('Retry successful, message saved with ID:', result.id);
          return { success: true, id: result.id };
        } catch (parseError) {
          console.error('Failed to parse retry success response:', parseError);
          return { success: false, error: 'Server returned invalid response format' };
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return { success: false, error: 'Authentication error, please login again' };
      }
    }
    
    // Handle other error responses
    if (!response.ok) {
      console.error(`Error saving conversation message, status: ${response.status}`);
      
      // Try to parse error response
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          console.error('Error response:', errorData);
          return { 
            success: false, 
            error: errorData.error || `Server error: ${response.status}` 
          };
        } else {
          // Handle non-JSON response
          const textResponse = await response.text();
          console.error('Non-JSON error response:', 
            textResponse.substring(0, 100) + (textResponse.length > 100 ? '...' : ''));
          return { 
            success: false, 
            error: `Server returned non-JSON response: ${response.status}` 
          };
        }
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError);
        return { 
          success: false, 
          error: `Failed to parse server response: ${response.status}` 
        };
      }
    }
    
    // Parse successful response
    try {
      const result = await response.json();
      console.log('Message saved successfully with ID:', result.id);
      return { success: true, id: result.id };
    } catch (parseError) {
      console.error('Failed to parse success response:', parseError);
      return { success: false, error: 'Server returned invalid response format' };
    }
  } catch (error: unknown) {
    console.error('Exception in saveConversationMessage:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error saving conversation message' 
    };
  }
}

// Helper function to format metadata for conversation storage
function formatMetadata(metadata: Record<string, any>): Record<string, any> {
  // If null or undefined, return empty object
  if (metadata == null) return {};
  
  // If already an object, create a copy to avoid mutating original
  const formattedMetadata = { ...metadata };
  
  // Ensure timestamp exists
  if (!formattedMetadata.timestamp) {
    formattedMetadata.timestamp = new Date().toISOString();
  }
  
  return formattedMetadata;
}

/**
 * Fetch conversation history for the current user
 * @param limit Optional maximum number of messages to retrieve
 * @param offset Optional offset for pagination
 * @param conversationId Optional ID to filter by specific conversation
 * @returns Conversation history or error details
 */
export async function getConversationHistory(
  limit?: number,
  offset?: number,
  conversationId?: string
): Promise<{ 
  success: boolean; 
  history?: any[]; 
  count?: number;
  error?: string 
}> {
  try {
    console.log('Fetching conversation history', {
      limit,
      offset,
      conversationId: conversationId || 'none'
    });

    // Get session for user ID and token
    const session = await getSession();
    if (!session || !session.access_token) {
      console.error('No authenticated user found when fetching conversation history');
      return { success: false, error: 'Authentication required' };
    }

    const user = getUser();
    if (!user || !user.id) {
      console.error('No user ID available');
      return { success: false, error: 'User ID not found' };
    }
    
    // Build query parameters
    const params = new URLSearchParams();
    params.append('userId', user.id);
    
    if (limit) {
      params.append('limit', limit.toString());
    }
    
    if (offset) {
      params.append('offset', offset.toString());
    }
    
    if (conversationId) {
      params.append('conversationId', conversationId);
    }
    
    // Make API request
    const response = await fetch(`${API_URL}/api/conversations/history?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });
    
    // Handle 401 Unauthorized - attempt to refresh token and retry
    if (response.status === 401) {
      console.warn('Unauthorized when fetching conversation history, attempting token refresh');
      try {
        await refreshAccessToken();
        const refreshedSession = await getSession();
        
        if (!refreshedSession?.access_token) {
          console.error('Failed to refresh token');
          return { success: false, error: 'Session expired, please login again' };
        }
        
        // Retry the request with new token
        const retryResponse = await fetch(`${API_URL}/api/conversations/history?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${refreshedSession.access_token}`
          }
        });
        
        if (!retryResponse.ok) {
          console.error(`Retry failed with status: ${retryResponse.status}`);
          return { success: false, error: `Server error: ${retryResponse.status}` };
        }
        
        const result = await retryResponse.json();
        return { 
          success: true, 
          history: result.history || [],
          count: result.count || 0
        };
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return { success: false, error: 'Authentication error, please login again' };
      }
    }
    
    // Handle error responses
    if (!response.ok) {
      console.error(`Error fetching conversation history, status: ${response.status}`);
      return { success: false, error: `Server error: ${response.status}` };
    }
    
    // Parse successful response
    const result = await response.json();
    console.log(`Successfully retrieved ${result.count || 0} conversation messages`);
    
    return { 
      success: true, 
      history: result.history || [],
      count: result.count || 0
    };
  } catch (error: unknown) {
    console.error('Exception in getConversationHistory:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error fetching conversation history' 
    };
  }
}

/**
 * Check if the database schema is correctly set up
 * This function specifically checks if the conversation_id column exists
 * @returns Promise that resolves to an object with status and error message if any
 */
export async function checkDatabaseSchema(): Promise<{ 
  isValid: boolean;
  missing?: string[];
  error?: string;
}> {
  try {
    const session = await getSession();
    if (!session || !session.access_token) {
      console.warn('No session available for schema check');
      return { isValid: true }; // We can't check without a session, so assume it's fine
    }

    // Make a request to a helper endpoint
    const response = await fetch(`${API_URL}/api/system/schema-check`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) {
      // If endpoint doesn't exist, it's an older version of the API without this feature
      if (response.status === 404) {
        console.log('Schema check endpoint not available');
        return { isValid: true };
      }
      
      const errorData = await response.json();
      return { 
        isValid: false, 
        error: errorData.error || `Server error: ${response.status}`
      };
    }

    const result = await response.json();
    return {
      isValid: result.valid,
      missing: result.missing || [],
      error: result.error
    };
  } catch (error) {
    console.error('Error checking database schema:', error);
    return { 
      isValid: true, // We default to true on errors to avoid blocking the app
      error: error instanceof Error ? error.message : 'Unknown error checking schema'
    };
  }
}

// Research Types
export interface ResearchDocument {
  id: string;
  title: string;
  excerpt: string;
  content?: string;
  source: string;
  url?: string;
  category: string;
  type: 'paper' | 'article' | 'news' | 'synthesis' | 'graph' | 'alert';
  dateAdded: string;
  datePublished?: string;
  saved: boolean;
  starred: boolean;
  tags: string[];
  metadata?: any;
  lastUpdated?: string;
  insights?: string[];
  connections?: { id: string; title: string; strength: number }[];
}

export interface ResearchProcessResult {
  researchId: string;
  estimatedTime: number;
  message: string;
}

export interface ResearchProcessStatus {
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'not_found';
  process?: any;
  documents?: ResearchDocument[];
}

// Research API Functions

/**
 * Fetch research documents with optional filtering
 * @param params - Filter and pagination parameters
 * @returns Array of research documents with pagination info
 */
export async function fetchResearchDocuments(params: {
  type?: string;
  category?: string;
  query?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}) {
  const session = await getSession();
  if (!session || !session.access_token) {
    throw new Error('Unauthorized: No active session');
  }

  const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/api/research`);
  
  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.append(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || `Failed to fetch research documents: ${response.status}`;
    } catch (e) {
      errorMessage = `Failed to fetch research documents: ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  return await response.json();
}

/**
 * Fetch a specific research document by ID
 * @param id - Document ID
 * @returns Research document
 */
export async function fetchResearchDocument(id: string) {
  const session = await getSession();
  if (!session || !session.access_token) {
    throw new Error('Unauthorized: No active session');
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/research/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || `Failed to fetch research document: ${response.status}`;
    } catch (e) {
      errorMessage = `Failed to fetch research document: ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  return await response.json();
}

/**
 * Start a real-time research process
 * @param data - Research parameters
 * @returns Research process result
 */
export async function startRealtimeResearch(data: {
  query: string;
  sources: string[];
  maxResults?: number;
  category?: string;
}): Promise<ResearchProcessResult> {
  const session = await getSession();
  if (!session || !session.access_token) {
    throw new Error('Unauthorized: No active session');
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/research/realtime`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || `Failed to start real-time research: ${response.status}`;
    } catch (e) {
      errorMessage = `Failed to start real-time research: ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  return await response.json();
}

/**
 * Start a knowledge synthesis process
 * @param data - Synthesis parameters
 * @returns Research process result
 */
export async function startKnowledgeSynthesis(data: {
  topic: string;
  documents?: string[];
  depth?: 'low' | 'medium' | 'high';
  category?: string;
}): Promise<ResearchProcessResult> {
  const session = await getSession();
  if (!session || !session.access_token) {
    throw new Error('Unauthorized: No active session');
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/research/synthesis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || `Failed to start knowledge synthesis: ${response.status}`;
    } catch (e) {
      errorMessage = `Failed to start knowledge synthesis: ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  return await response.json();
}

/**
 * Check the status of a research process
 * @param processId - Process ID
 * @returns Research process status
 */
export async function checkResearchProcessStatus(processId: string): Promise<ResearchProcessStatus> {
  const session = await getSession();
  if (!session || !session.access_token) {
    throw new Error('Unauthorized: No active session');
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/research/status/${processId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || `Failed to check research process status: ${response.status}`;
    } catch (e) {
      errorMessage = `Failed to check research process status: ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  return await response.json();
}

/**
 * Update a research document (bookmark, star, tags, etc.)
 * @param id - Document ID
 * @param updates - Fields to update
 * @returns Updated document
 */
export async function updateResearchDocument(id: string, updates: Partial<ResearchDocument>) {
  const session = await getSession();
  if (!session || !session.access_token) {
    throw new Error('Unauthorized: No active session');
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/research/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify(updates)
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || `Failed to update research document: ${response.status}`;
    } catch (e) {
      errorMessage = `Failed to update research document: ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  return await response.json();
}

/**
 * Delete a research document
 * @param id - Document ID
 */
export async function deleteResearchDocument(id: string) {
  const session = await getSession();
  if (!session || !session.access_token) {
    throw new Error('Unauthorized: No active session');
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/research/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || `Failed to delete research document: ${response.status}`;
    } catch (e) {
      errorMessage = `Failed to delete research document: ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  return true;
} 