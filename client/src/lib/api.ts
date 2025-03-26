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