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
    
    const response = await fetch(`${API_URL}/api/twin/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ message, userId })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send message to AI');
    }
    
    const data = await response.json();
    return data.response;
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
    
    const response = await fetch(`${API_URL}/api/twin/extract-tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ content, userId })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to extract tasks');
    }
    
    const data = await response.json();
    return data.tasks;
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