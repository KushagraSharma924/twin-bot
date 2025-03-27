import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase client initialization
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * User authentication and management
 */
export const auth = {
  /**
   * Sign in a user with email and password
   * @param {string} email - User's email
   * @param {string} password - User's password
   */
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return data;
  },
  
  /**
   * Register a new user
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @param {Object} metadata - Additional user metadata
   */
  async signUp(email, password, metadata = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
    
    if (error) throw error;
    return data;
  },
  
  /**
   * Sign out the current user
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return true;
  },
  
  /**
   * Get the current session
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data;
  }
};

/**
 * User profile management
 */
export const profiles = {
  /**
   * Get a user's profile by ID
   * @param {string} userId - User ID
   */
  async getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  /**
   * Update a user's profile
   * @param {string} userId - User ID
   * @param {Object} updates - Profile updates
   */
  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
    
    if (error) throw error;
    return data;
  }
};

/**
 * Conversation history management
 */
export const conversations = {
  /**
   * Add a message to conversation history
   * @param {string} message - The message content
   * @param {string} source - The source ('user' or 'assistant')
   * @param {string} userId - The user ID
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} - Added message record
   */
  async addMessage(message, source, userId, metadata = {}) {
    try {
      console.log(`Adding message to conversation history for user ${userId}:`, {
        messageLength: message ? message.length : 0,
        source,
        hasMetadata: !!metadata,
        metadataKeys: Object.keys(metadata)
      });
      
      // Check for Supabase client
      if (!supabase) {
        console.error('Error: Supabase client is not initialized');
        return { 
          id: null, 
          success: false, 
          error: 'Database client not initialized' 
        };
      }
      
      // Validate inputs
      if (!message) {
        console.error('Error: Message content is required');
        return { 
          id: null, 
          success: false, 
          error: 'Message content is required' 
        };
      }
      
      if (!source || !['user', 'assistant'].includes(source)) {
        console.error(`Error: Invalid source "${source}" - must be "user" or "assistant"`);
        return { 
          id: null, 
          success: false, 
          error: 'Source must be "user" or "assistant"' 
        };
      }
      
      if (!userId) {
        console.error('Error: User ID is required');
        return { 
          id: null, 
          success: false, 
          error: 'User ID is required' 
        };
      }
      
      // Process metadata - ensure it's an object
      let processedMetadata = metadata || {};
      if (typeof metadata === 'string') {
        try {
          processedMetadata = JSON.parse(metadata);
          console.log('Successfully parsed metadata string to object');
        } catch (e) {
          console.warn('Could not parse metadata string as JSON:', e.message);
          // Use a simple object with the string as a value
          processedMetadata = { rawValue: metadata };
        }
      }
      
      // Convert any non-JSON-serializable items in metadata
      try {
        // Test if the metadata is serializable
        JSON.stringify(processedMetadata);
      } catch (e) {
        console.warn('Metadata contains non-serializable values, converting to string representation');
        // Convert to a simplified version that can be serialized
        processedMetadata = Object.entries(processedMetadata).reduce((acc, [key, value]) => {
          try {
            // Test if this value is serializable
            JSON.stringify(value);
            acc[key] = value;
          } catch (err) {
            console.warn(`Converting non-serializable value for key "${key}" to string`);
            acc[key] = String(value);
          }
          return acc;
        }, {});
      }
      
      // Extract conversation ID from metadata
      const conversationId = processedMetadata.conversationId || null;
      console.log(`Using conversation ID: ${conversationId || 'none'}`);
      
      // Create payload with current timestamp if not provided
      const timestamp = processedMetadata.timestamp || new Date().toISOString();
      delete processedMetadata.timestamp; // Remove from metadata to avoid duplication
      
      const payload = {
        message: message,
        source: source,
        user_id: userId,
        conversation_id: conversationId,
        metadata: processedMetadata,
        timestamp: timestamp
      };
      
      console.log('Executing Supabase insert with payload:', {
        messagePreview: message.substring(0, 20) + (message.length > 20 ? '...' : ''),
        source: payload.source,
        userId: payload.user_id,
        conversationId: payload.conversation_id,
        timestamp: payload.timestamp
      });
      
      // Insert the message
      const { data, error } = await supabase
        .from('conversations')
        .insert(payload)
        .select('*');
      
      if (error) {
        console.error('Supabase error inserting message:', error);
        return { 
          id: null, 
          success: false, 
          error: `Database error: ${error.message || error.code || 'Unknown error'}` 
        };
      }
      
      if (!data || data.length === 0) {
        console.error('No data returned from insert operation');
        return { 
          id: null, 
          success: false, 
          error: 'Failed to insert message - no data returned' 
        };
      }
      
      console.log('Message added successfully with ID:', data[0].id);
      return {
        ...data[0],
        success: true
      };
    } catch (error) {
      console.error('Error adding message to conversation history:', error);
      // Return a structured error response instead of throwing
      return { 
        id: null, 
        success: false, 
        error: error.message || 'Unknown error saving conversation message' 
      };
    }
  },
  
  /**
   * Get conversation history for a user
   * @param {string} userId - User ID to fetch history for
   * @param {number} limit - Maximum number of messages to return
   * @param {number} offset - Offset for pagination
   * @param {string|null} conversationId - Optional conversation ID to filter by
   * @returns {Promise<Array>} - Array of conversation messages
   */
  async getHistory(userId, limit = 50, offset = 0, conversationId = null) {
    console.log('getHistory called with params:', { userId, limit, offset, conversationId });
    
    try {
      // Ensure Supabase client is initialized
      if (!supabase) {
        console.error('Supabase client not initialized');
        return [];
      }
      
      // Validate userId is provided
      if (!userId) {
        console.error('User ID is required for getHistory');
        return [];
      }
      
      console.log(`Fetching conversations for user: ${userId}`);
      
      // Build the base query
      let query = supabase.from('conversations').select('*');
      
      // Add user filter
      query = query.eq('user_id', userId);
      
      // Filter by conversation ID if provided
      if (conversationId) {
        console.log(`Filtering by conversation ID: ${conversationId}`);
        query = query.eq('conversation_id', conversationId);
      }
      
      // Add ordering by timestamp or created_at
      // Check if timestamp column exists
      query = query.order('timestamp', { ascending: false });
      
      // Execute the query
      console.log('Executing Supabase query...');
      const { data, error } = await query;
      
      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.log('No conversation history found');
        return [];
      }
      
      console.log(`Found ${data.length} total messages`);
      
      // Apply pagination manually in JavaScript
      const paginatedData = data.slice(offset, offset + limit);
      console.log(`Returning ${paginatedData.length} messages after pagination`);
      
      return paginatedData;
    } catch (error) {
      console.error('Error fetching conversation history:', error);
      console.error('Error details:', error.stack);
      // Return empty array instead of throwing to avoid breaking the API
      return [];
    }
  }
};

/**
 * Task management
 */
export const tasks = {
  /**
   * Create a new task
   * @param {string} userId - User ID
   * @param {Object} taskData - Task data
   */
  async createTask(userId, taskData) {
    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        user_id: userId,
        ...taskData,
        created_at: new Date(),
        status: taskData.status || 'pending'
      }])
      .select();
    
    if (error) throw error;
    return data[0];
  },
  
  /**
   * Create multiple tasks at once
   * @param {string} userId - User ID
   * @param {Array} tasksData - Array of task data
   */
  async createTasks(userId, tasksData) {
    const tasksWithUser = tasksData.map(task => ({
      user_id: userId,
      ...task,
      created_at: new Date(),
      status: task.status || 'pending'
    }));
    
    const { data, error } = await supabase
      .from('tasks')
      .insert(tasksWithUser)
      .select();
    
    if (error) throw error;
    return data;
  },
  
  /**
   * Get tasks for a user
   * @param {string} userId - User ID
   * @param {Object} filters - Optional filters (status, priority, etc.)
   */
  async getTasks(userId, filters = {}) {
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId);
    
    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }
    
    if (filters.deadline) {
      // Filter by tasks due before the given deadline
      query = query.lte('deadline', filters.deadline);
    }
    
    if (filters.search) {
      // Search in task text
      query = query.ilike('task', `%${filters.search}%`);
    }
    
    // Order tasks
    query = query.order(filters.orderBy || 'created_at', { 
      ascending: filters.ascending || false 
    });
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
  
  /**
   * Update a task
   * @param {string} userId - User ID
   * @param {number} taskId - Task ID
   * @param {Object} updates - Task updates
   */
  async updateTask(userId, taskId, updates) {
    // If marking as completed, set completed_at timestamp
    if (updates.status === 'completed' && !updates.completed_at) {
      updates.completed_at = new Date();
    }
    
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .eq('user_id', userId) // Ensure user can only update their own tasks
      .select();
    
    if (error) throw error;
    return data[0];
  },
  
  /**
   * Delete a task
   * @param {string} userId - User ID
   * @param {number} taskId - Task ID
   */
  async deleteTask(userId, taskId) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', userId); // Ensure user can only delete their own tasks
    
    if (error) throw error;
    return true;
  }
};

/**
 * Calendar event management
 */
export const calendarEvents = {
  /**
   * Store a reference to a Google Calendar event
   * @param {string} userId - User ID
   * @param {string} eventId - Google Calendar event ID
   * @param {string} summary - Event summary/title
   * @param {Object} metadata - Additional event metadata
   */
  async storeEvent(userId, eventId, summary, metadata = {}) {
    const { data, error } = await supabase
      .from('calendar_events')
      .insert([{
        user_id: userId,
        event_id: eventId,
        summary,
        created_at: new Date(),
        metadata
      }]);
    
    if (error) throw error;
    return data;
  },
  
  /**
   * Get calendar events for a user
   * @param {string} userId - User ID
   * @param {number} limit - Maximum number of events to retrieve
   */
  async getEvents(userId, limit = 50) {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  }
};

/**
 * Browser insights management
 */
export const browserInsights = {
  /**
   * Store browser insights
   * @param {string} userId - User ID
   * @param {string} browserId - Browser identifier
   * @param {Object} insights - Browser insights data
   */
  async storeInsights(userId, browserId, insights) {
    const { data, error } = await supabase
      .from('browser_insights')
      .insert([{
        user_id: userId,
        browser_id: browserId,
        insights,
        timestamp: new Date()
      }]);
    
    if (error) throw error;
    return data;
  },
  
  /**
   * Get browser insights for a user
   * @param {string} userId - User ID
   * @param {Object} filters - Filters for insights retrieval
   */
  async getInsights(userId, filters = {}) {
    let query = supabase
      .from('browser_insights')
      .select('*')
      .eq('user_id', userId);
    
    // Filter by time range
    if (filters.start) {
      query = query.gte('timestamp', filters.start);
    }
    
    if (filters.end) {
      query = query.lte('timestamp', filters.end);
    }
    
    if (filters.browserId) {
      query = query.eq('browser_id', filters.browserId);
    }
    
    query = query.order('timestamp', { ascending: false });
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
};

/**
 * User preferences management
 */
export const preferences = {
  /**
   * Get user preferences
   * @param {string} userId - User ID
   */
  async getPreferences(userId) {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      throw error;
    }
    
    return data || { user_id: userId, preferences: {} };
  },
  
  /**
   * Update user preferences
   * @param {string} userId - User ID
   * @param {Object} preferences - User preferences
   */
  async updatePreferences(userId, preferences) {
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert([{
        user_id: userId,
        preferences,
        updated_at: new Date()
      }]);
    
    if (error) throw error;
    return data;
  }
};

/**
 * Learning data management for reinforcement learning
 */
export const learningData = {
  /**
   * Store learning data
   * @param {string} userId - User ID
   * @param {Object} interaction - User interaction data
   * @param {Object} feedback - Feedback data
   */
  async storeLearningData(userId, interaction, feedback) {
    const { data, error } = await supabase
      .from('learning_data')
      .insert([{
        user_id: userId,
        interaction,
        feedback,
        timestamp: new Date()
      }]);
    
    if (error) throw error;
    return data;
  },
  
  /**
   * Get learning data for a user
   * @param {string} userId - User ID
   * @param {number} limit - Maximum number of records to retrieve
   */
  async getLearningData(userId, limit = 100) {
    const { data, error } = await supabase
      .from('learning_data')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  }
};

export default {
  auth,
  profiles,
  conversations,
  tasks,
  calendarEvents,
  browserInsights,
  preferences,
  learningData
}; 