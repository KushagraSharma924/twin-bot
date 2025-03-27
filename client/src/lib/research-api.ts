const API_URL = typeof window !== 'undefined' 
  ? (window.location.hostname === 'localhost' ? 'http://localhost:5002' : `${window.location.origin}/api`)
  : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';

/**
 * Interface for research document type
 */
export interface ResearchDocument {
  id: string;
  title: string;
  excerpt: string;
  content?: string;
  category: string;
  type: 'paper' | 'article' | 'news' | 'alert' | 'synthesis' | 'graph';
  source: string;
  url?: string;
  dateAdded: string;
  datePublished?: string;
  saved: boolean;
  starred: boolean;
  tags: string[];
  metadata: any;
  process_id?: string;
}

/**
 * Interface for research process status
 */
export interface ResearchProcess {
  id: string;
  type: 'realtime' | 'synthesis';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  query: string;
  sources?: string[];
  document_ids?: string[];
  depth?: 'low' | 'medium' | 'high';
  category?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  result_count?: number;
  error_message?: string;
}

/**
 * Interface for research process result
 */
export interface ResearchProcessResult {
  status: string;
  process: ResearchProcess;
  documents?: ResearchDocument[];
}

// Add authentication helper
function getAuthHeaders(): { Authorization: string } | Record<string, never> {
  if (typeof window === 'undefined') return {};
  
  try {
    const session = JSON.parse(localStorage.getItem('session') || '{}');
    const token = session.access_token;
    
    if (!token) {
      console.warn('No authentication token available');
      return {};
    }
    
    return { Authorization: `Bearer ${token}` };
  } catch (error) {
    console.error('Error getting auth token:', error);
    return {};
  }
}

/**
 * Get research documents with optional filtering
 */
export async function getResearchDocuments(
  options: { 
    type?: string; 
    category?: string; 
    query?: string; 
    page?: number; 
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
  } = {}
): Promise<{ documents: ResearchDocument[]; pagination: any }> {
  try {
    // Build query string from options
    const queryParams = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    const headers = getAuthHeaders();
    
    if (Object.keys(headers).length === 0) {
      throw new Error('Authentication required');
    }
    
    // For debugging
    console.log(`Fetching documents from: ${API_URL}/research/documents?${queryParams.toString()}`);
    
    const response = await fetch(`${API_URL}/research/documents?${queryParams.toString()}`, {
      headers
    });
    
    // Log the response for debugging
    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    // Check content type to avoid parsing HTML as JSON
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
      throw new Error(`Unexpected content type: ${contentType}`);
    }
    
    // Safely parse JSON
    const responseText = await response.text();
    console.log('Response text preview:', responseText.substring(0, 100) + '...');
    
    if (!responseText || responseText.trim() === '') {
      throw new Error('Empty response from API');
    }
    
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      throw new Error('Received HTML instead of JSON');
    }
    
    try {
      const data = JSON.parse(responseText);
      return data;
    } catch (jsonError) {
      console.error('Error parsing JSON response:', jsonError, 'Response text:', responseText.substring(0, 200));
      throw new Error('Invalid JSON response from server');
    }
  } catch (error: any) {
    console.error('Error in getResearchDocuments:', error);
    throw error;
  }
}

/**
 * Get a specific research document by ID
 */
export async function getResearchDocumentById(documentId: string): Promise<ResearchDocument> {
  try {
    const session = JSON.parse(localStorage.getItem('session') || '{}');
    const token = session.access_token;
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch(`${API_URL}/api/research/documents/${documentId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Handle non-JSON responses (like HTML error pages)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error('Server returned HTML instead of JSON (likely a 404 page)');
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }
    
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to fetch research document');
      } catch (parseError) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
    }
    
    // Safely parse JSON
    try {
      const responseText = await response.text();
      const data = JSON.parse(responseText);
      return data;
    } catch (jsonError) {
      console.error('Error parsing JSON response:', jsonError);
      throw new Error('Invalid response from server: Could not parse JSON');
    }
  } catch (error: any) {
    console.error('Error fetching research document:', error);
    throw error;
  }
}

/**
 * Start a real-time research process
 */
export async function startRealtimeResearch(
  query: string,
  sources: string[],
  maxResults: number = 10,
  category?: string
): Promise<{ researchId: string; estimatedTime: number }> {
  try {
    const headers = getAuthHeaders();
    
    if (Object.keys(headers).length === 0) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch(`${API_URL}/research/realtime`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({
        query,
        sources,
        maxResults,
        category
      })
    });
    
    // Skip checking response.ok - we'll handle errors via text inspection
    
    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
      throw new Error(`Unexpected content type: ${contentType}`);
    }
    
    // Safely parse JSON
    const responseText = await response.text();
    
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      throw new Error('Received HTML instead of JSON');
    }
    
    try {
      const data = JSON.parse(responseText);
      
      // If the API returns an error object
      if (data.error) {
        throw new Error(data.error);
      }
      
      return {
        researchId: data.processId || data.researchId,
        estimatedTime: data.estimatedTime || 30
      };
    } catch (jsonError) {
      console.error('Error parsing JSON:', jsonError);
      throw new Error('Invalid response from server: Could not parse JSON');
    }
  } catch (error: any) {
    console.error('Error starting real-time research:', error);
    throw error;
  }
}

/**
 * Start a knowledge synthesis process
 */
export async function startKnowledgeSynthesis(
  topic: string,
  documents: string[] = [],
  depth: 'low' | 'medium' | 'high' = 'medium',
  category?: string
): Promise<{ synthesisId: string; estimatedTime: number }> {
  try {
    const session = JSON.parse(localStorage.getItem('session') || '{}');
    const token = session.access_token;
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch(`${API_URL}/api/research/synthesis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        topic,
        documents,
        depth,
        category
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to start knowledge synthesis');
    }
    
    const data = await response.json();
    return {
      synthesisId: data.synthesisId,
      estimatedTime: data.estimatedTime
    };
  } catch (error: any) {
    console.error('Error starting knowledge synthesis:', error);
    throw error;
  }
}

/**
 * Get the status of a research process
 */
export async function getProcessStatus(processId: string): Promise<ResearchProcessResult> {
  try {
    const headers = getAuthHeaders();
    
    if (Object.keys(headers).length === 0) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch(`${API_URL}/research/process/${processId}`, {
      headers
    });
    
    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
      throw new Error(`Unexpected content type: ${contentType}`);
    }
    
    // Safely parse JSON
    const responseText = await response.text();
    
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      throw new Error('Received HTML instead of JSON');
    }
    
    try {
      const data = JSON.parse(responseText);
      
      // Handle missing or error data
      if (!data || data.error) {
        throw new Error(data?.error || 'Invalid response data');
      }
      
      return data;
    } catch (jsonError) {
      console.error('Error parsing JSON:', jsonError);
      throw new Error('Invalid response from server: Could not parse JSON');
    }
  } catch (error: any) {
    console.error('Error getting process status:', error);
    throw error;
  }
}

/**
 * Update a research document (bookmark, star, tags, etc.)
 */
export async function updateResearchDocument(
  documentId: string,
  updates: { saved?: boolean; starred?: boolean; tags?: string[]; metadata?: any }
): Promise<ResearchDocument> {
  try {
    const headers = getAuthHeaders();
    
    if (Object.keys(headers).length === 0) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch(`${API_URL}/research/documents/${documentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorData.message || 'Failed to update research document';
      } catch (e) {
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error updating research document:', error);
    throw error;
  }
}

/**
 * Delete a research document
 */
export async function deleteResearchDocument(documentId: string): Promise<void> {
  try {
    const session = JSON.parse(localStorage.getItem('session') || '{}');
    const token = session.access_token;
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch(`${API_URL}/api/research/${documentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete research document');
    }
  } catch (error: any) {
    console.error('Error deleting research document:', error);
    throw error;
  }
}

/**
 * Get research interests from the user's chat history
 * @returns An array of research interests
 */
export async function getUserResearchInterests(): Promise<string[]> {
  try {
    const headers = getAuthHeaders();
    
    if (Object.keys(headers).length === 0) {
      console.warn('No auth token available for getUserResearchInterests');
      return ['AI & Machine Learning'];
    }
    
    try {
      const response = await fetch(`${API_URL}/research/interests`, {
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });
      
      // Log response info for debugging
      console.log(`Interests response status: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      // Check content type to avoid parsing HTML as JSON
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('application/json')) {
        console.error(`Unexpected content type: ${contentType}`);
        return ['AI & Machine Learning'];
      }
      
      const responseText = await response.text();
      
      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response');
      }
      
      if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
        throw new Error('Received HTML instead of JSON');
      }
      
      const data = JSON.parse(responseText);
      return data.interests || [];
    } catch (error) {
      console.error('Error fetching research interests:', error);
      return ['AI & Machine Learning'];
    }
  } catch (error) {
    console.error('Error in getUserResearchInterests:', error);
    return ['AI & Machine Learning'];
  }
}

/**
 * Mock function to extract research interests from a chat message
 * This can be used on the client side until we implement the server-side endpoint
 */
export function extractInterestsFromMessage(message: string): string[] {
  // Simple extraction logic based on keywords
  const interests: string[] = [];
  
  // Define some key topics to look for
  const topics = [
    'AI', 'Machine Learning', 'Data Science', 'Web Development',
    'JavaScript', 'Python', 'React', 'Node.js', 'Cybersecurity',
    'Blockchain', 'Web3', 'Database', 'Cloud Computing', 'DevOps',
    'Mobile Development', 'UX Design', 'Game Development'
  ];
  
  // Check for topics in the message
  topics.forEach(topic => {
    if (message.toLowerCase().includes(topic.toLowerCase())) {
      interests.push(topic);
    }
  });
  
  return interests;
}

// Add a function to save user search history
export async function saveSearchHistory(query: string): Promise<void> {
  try {
    const headers = getAuthHeaders();
    
    if (Object.keys(headers).length === 0) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch(`${API_URL}/research/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({ query })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
  } catch (error: any) {
    console.error('Error saving search history:', error);
    throw error;
  }
}

// Add a function to get suggested research topics based on user activity
export async function getResearchSuggestions(baseQuery?: string): Promise<string[]> {
  try {
    const headers = getAuthHeaders();
    
    if (Object.keys(headers).length === 0) {
      throw new Error('Authentication required');
    }
    
    const queryParams = new URLSearchParams();
    if (baseQuery) {
      queryParams.append('query', baseQuery);
    }
    
    const response = await fetch(`${API_URL}/research/suggestions?${queryParams.toString()}`, {
      headers
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.suggestions || [];
  } catch (error: any) {
    console.error('Error getting research suggestions:', error);
    return [];
  }
} 