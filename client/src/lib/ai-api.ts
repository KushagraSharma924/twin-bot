const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';

/**
 * Send a message to the AI assistant
 * @param message - The user's message
 * @param userId - The user's ID
 * @returns The AI's response
 */
export async function sendMessage(message: string, userId: string): Promise<string> {
  try {
    const session = JSON.parse(localStorage.getItem('session') || '{}');
    const token = session.access_token;
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    // For debugging
    console.log(`Sending message to ${API_URL}/api/twin/chat with token length: ${token.length}`);
    
    const response = await fetch(`${API_URL}/api/twin/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ message, userId })
    });
    
    // Debugging response details
    console.log(`Response status: ${response.status} ${response.statusText}`);
    console.log(`Content type: ${response.headers.get('content-type')}`);
    
    // Handle 401 Unauthorized - try to refresh token
    if (response.status === 401) {
      console.log('Received 401 Unauthorized, attempting to refresh token');
      
      // Import refreshAccessToken function
      const { refreshAccessToken } = await import('@/lib/api');
      
      // Try to refresh the token
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        console.log('Token refreshed successfully, retrying request');
        // Get the new session with refreshed token
        const newSession = JSON.parse(localStorage.getItem('session') || '{}');
        const newToken = newSession.access_token;
        
        if (!newToken) {
          throw new Error('Failed to get new token after refresh');
        }
        
        // Retry the request with the new token
        const retryResponse = await fetch(`${API_URL}/api/twin/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${newToken}`
          },
          body: JSON.stringify({ message, userId })
        });
        
        if (!retryResponse.ok) {
          throw new Error(`Server error after token refresh: ${retryResponse.status} ${retryResponse.statusText}`);
        }
        
        const retryData = await retryResponse.json();
        return retryData.response;
      } else {
        console.error('Token refresh failed');
        throw new Error('Your session has expired. Please log in again.');
      }
    }
    
    if (!response.ok) {
      // Handle non-JSON responses (like HTML error pages)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        console.error('Server returned HTML instead of JSON (likely a 404 page)');
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message to AI');
      } catch (parseError) {
        // If we can't parse the response as JSON, use status text
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
    }
    
    // Handle the response
    try {
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      try {
        const data = JSON.parse(responseText);
        if (!data || !data.response) {
          throw new Error('Invalid response format from server');
        }
        return data.response;
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError);
        // If it wasn't valid JSON but still has content, return it
        if (responseText && responseText.trim().length > 0) {
          return responseText;
        }
        throw new Error('Invalid response from server: Could not parse JSON');
      }
    } catch (textError) {
      console.error('Error reading response text:', textError);
      throw new Error('Could not read response from server');
    }
  } catch (error: any) {
    console.error('Error sending message to AI:', error);
    throw error;
  }
}

/**
 * Extract tasks from text
 * @param content - The text to extract tasks from
 * @param userId - The user's ID
 * @returns Array of extracted tasks
 */
export async function extractTasks(content: string, userId: string): Promise<any[]> {
  try {
    const session = JSON.parse(localStorage.getItem('session') || '{}');
    const token = session.access_token;
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    console.log(`Extracting tasks from ${API_URL}/api/twin/extract-tasks`);
    
    const response = await fetch(`${API_URL}/api/twin/extract-tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ content, userId })
    });
    
    if (!response.ok) {
      // Handle non-JSON responses (like HTML error pages)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        console.error('Server returned HTML instead of JSON (likely a 404 page)');
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract tasks');
      } catch (parseError) {
        // If we can't parse the response as JSON, use status text
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
    }
    
    // Handle the response more safely
    try {
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      try {
        const data = JSON.parse(responseText);
        if (!data || !data.tasks) {
          throw new Error('Invalid response format from server');
        }
        return data.tasks;
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError);
        throw new Error('Invalid response from server: Could not parse JSON');
      }
    } catch (textError) {
      console.error('Error reading response text:', textError);
      throw new Error('Could not read response from server');
    }
  } catch (error: any) {
    console.error('Error extracting tasks:', error);
    throw error;
  }
}

/**
 * Create a calendar event from text
 * @param content - The text describing the event
 * @param userId - The user's ID
 * @param accessToken - Google OAuth access token
 * @returns The created event
 */
export async function createCalendarEvent(content: string, userId: string, accessToken: string): Promise<any> {
  try {
    const session = JSON.parse(localStorage.getItem('session') || '{}');
    const token = session.access_token;
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    if (!accessToken) {
      throw new Error('Google access token is required');
    }
    
    const response = await fetch(`${API_URL}/api/calendar/create-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        content, 
        userId,
        accessToken
      })
    });
    
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

/**
 * Create a calendar event via AI natural language processing
 * @param message - The message describing the event
 * @param userId - The user's ID
 * @returns The created event info
 */
export async function createAICalendarEvent(message: string, userId: string): Promise<any> {
  try {
    const session = JSON.parse(localStorage.getItem('session') || '{}');
    const token = session.access_token;
    const googleToken = localStorage.getItem('google_token');
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    if (!googleToken) {
      throw new Error('Google Calendar authentication required. Please connect to Google Calendar first.');
    }
    
    // For debugging
    console.log(`Creating calendar event via AI for message: "${message}"`);
    
    const response = await fetch(`${API_URL}/api/twin/create-calendar-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        message, 
        userId,
        accessToken: googleToken
      })
    });
    
    // Handle errors
    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        console.error('Server returned HTML instead of JSON (likely a 404 page)');
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create calendar event');
    }
    
    // Parse the response
    const responseText = await response.text();
    console.log('Response text:', responseText);
    
    try {
      const data = JSON.parse(responseText);
      return data;
    } catch (jsonError) {
      console.error('Error parsing JSON response:', jsonError);
      throw new Error('Invalid response from server: Could not parse JSON');
    }
  } catch (error: any) {
    console.error('Error creating AI calendar event:', error);
    throw error;
  }
}

/**
 * Create a calendar event via simplified approach with direct message processing
 * @param message - The message describing the event
 * @param userId - The user's ID
 * @returns The created event info
 */
export async function createSimpleCalendarEvent(message: string, userId: string): Promise<any> {
  try {
    const session = JSON.parse(localStorage.getItem('session') || '{}');
    const token = session.access_token;
    const googleToken = localStorage.getItem('google_token');
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    if (!googleToken) {
      throw new Error('Google Calendar authentication required. Please connect to Google Calendar first.');
    }
    
    // For debugging
    console.log(`Creating simple calendar event from message: "${message}"`);
    console.log(`Using Google token (first 10 chars): ${googleToken.substring(0, 10)}...`);
    
    const response = await fetch(`${API_URL}/api/twin/simple-calendar-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        message, 
        userId,
        accessToken: googleToken
      })
    });
    
    // Log the initial response details
    console.log(`Simple calendar event response status: ${response.status} ${response.statusText}`);
    console.log(`Content type: ${response.headers.get('content-type')}`);
    
    // Handle errors
    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        console.error('Server returned HTML instead of JSON (likely a 404 page)');
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      try {
        const errorData = await response.json();
        console.error('Error response data:', errorData);
        throw new Error(errorData.error || 'Failed to create calendar event');
      } catch (parseError) {
        console.error('Error parsing error response:', parseError);
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
    }
    
    // Parse the response
    const responseText = await response.text();
    console.log('Calendar event response text:', responseText);
    
    try {
      const data = JSON.parse(responseText);
      console.log('Parsed calendar event response:', data);
      
      // Check if we have a valid event
      if (data.event) {
        console.log('Created event with ID:', data.event.id);
        console.log('Event HTML link:', data.event.htmlLink);
      } else {
        console.warn('Response contains no event data');
      }
      
      return data;
    } catch (jsonError) {
      console.error('Error parsing JSON response:', jsonError);
      throw new Error('Invalid response from server: Could not parse JSON');
    }
  } catch (error: any) {
    console.error('Error creating simple calendar event:', error);
    throw error;
  }
}

/**
 * Create a calendar event with advanced NLP for better date/time parsing
 * @param message - The message describing the event
 * @param userId - The user's ID
 * @returns The created event info with event details and result message
 */
export async function createNLPCalendarEvent(message: string, userId: string): Promise<any> {
  try {
    const session = JSON.parse(localStorage.getItem('session') || '{}');
    const token = session.access_token;
    const googleToken = localStorage.getItem('google_token');
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    if (!googleToken) {
      throw new Error('Google Calendar authentication required. Please connect to Google Calendar first.');
    }
    
    // Pre-process message to help with date extraction
    // Convert date formats like "4th April" to more parseable formats
    let processedMessage = message;
    
    // Convert ordinal dates (1st, 2nd, 3rd, etc.) followed by month names
    const ordinalMonthPattern = /(\d+)(st|nd|rd|th)\s+(of\s+)?(January|February|March|April|May|June|July|August|September|October|November|December)/gi;
    processedMessage = processedMessage.replace(ordinalMonthPattern, (match, day, ordinal, preposition, month) => {
      return `${day} ${month}`;
    });
    
    // For debugging
    console.log(`Creating NLP calendar event from message: "${message}"`);
    if (processedMessage !== message) {
      console.log(`Preprocessed message: "${processedMessage}"`);
    }
    
    const response = await fetch(`${API_URL}/api/twin/simple-calendar-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        message: processedMessage, 
        userId,
        accessToken: googleToken
      })
    });
    
    // Log the initial response details
    console.log(`NLP calendar event response status: ${response.status} ${response.statusText}`);
    
    // Handle errors
    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        console.error('Server returned HTML instead of JSON (likely a 404 page)');
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      try {
        const errorData = await response.json();
        console.error('Error response data:', errorData);
        throw new Error(errorData.error || 'Failed to create calendar event');
      } catch (parseError) {
        console.error('Error parsing error response:', parseError);
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
    }
    
    // Parse the response
    const responseText = await response.text();
    console.log('Calendar event response text:', responseText);
    
    try {
      const data = JSON.parse(responseText);
      console.log('Parsed calendar event response:', data);
      
      // Check if we have a valid event
      if (data.event) {
        console.log('Created event with ID:', data.event.id);
        console.log('Event HTML link:', data.event.htmlLink);
        
        // Format the response with more user-friendly date/time presentation
        if (data.eventDetails) {
          try {
            const { eventName, eventDate, eventTime } = data.eventDetails;
            
            // Format the date in a user-friendly way
            const dateObj = new Date(`${eventDate}T${eventTime}:00`);
            if (!isNaN(dateObj.getTime())) {
              const options: Intl.DateTimeFormatOptions = { 
                weekday: 'long' as const, 
                year: 'numeric' as const, 
                month: 'long' as const, 
                day: 'numeric' as const,
                hour: '2-digit' as const,
                minute: '2-digit' as const
              };
              const formattedDate = dateObj.toLocaleDateString(undefined, options);
              
              // Add a more natural response message
              data.message = `I've added "${eventName}" to your calendar on ${formattedDate}.`;
              
              if (data.event.htmlLink) {
                data.message += `\n\nYou can [view the event in Google Calendar](${data.event.htmlLink}).`;
              }
            }
          } catch (formatError) {
            console.error('Error formatting date for response:', formatError);
            // Keep the original message if formatting fails
          }
        }
      } else {
        console.warn('Response contains no event data');
      }
      
      return data;
    } catch (jsonError) {
      console.error('Error parsing JSON response:', jsonError);
      throw new Error('Invalid response from server: Could not parse JSON');
    }
  } catch (error: any) {
    console.error('Error creating NLP calendar event:', error);
    throw error;
  }
} 