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
  return sessionJson ? JSON.parse(sessionJson) : null;
}

export function storeGoogleToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('google_token', token);
  }
}

export function getGoogleToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('google_token');
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
    
    if (!session || !user) {
      console.warn("No session or user, skipping event fetch");
      return { events: [] };
    }

    // Debug logs to help diagnose issues
    console.log(`API_URL: ${API_URL}`);
    console.log(`Has Google Token: ${Boolean(googleToken)}`);
    
    const response = await fetch(
      `${API_URL}/api/calendar/events?start=${startDate.toISOString()}&end=${endDate.toISOString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'X-Google-Token': googleToken || ''
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
  } catch (error: any) {
    console.error('Error fetching calendar events:', error);
    return { events: [] }; // Return empty array instead of throwing to prevent UI crashes
  }
}

export async function createCalendarEvent(
  event: Partial<CalendarEvent>
): Promise<CalendarEvent> {
  try {
    const session = getSession();
    const googleToken = getGoogleToken();
    const user = getUser();
    
    if (!session || !googleToken || !user) {
      throw new Error('Authentication required');
    }
    
    // Log the request details for debugging
    console.log('Creating calendar event:', event);
    
    const response = await fetch(`${API_URL}/api/calendar/create-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'X-Google-Token': googleToken
      },
      body: JSON.stringify({ event })
    });
    
    // Handle invalid credentials
    if (response.status === 401) {
      const data = await response.json();
      if (data.error === 'Invalid Google credentials') {
        console.warn("Google token is invalid, clearing it");
        // Clear the stored token since it's invalid
        clearGoogleToken();
        // Set a flag for re-authentication
        localStorage.setItem('google_auth_needed', 'true');
        throw new Error('Google Calendar authentication has expired. Please reconnect.');
      }
      throw new Error('Authentication expired');
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create calendar event');
    }
    
    const data = await response.json();
    return data.event;
  } catch (error: any) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
} 