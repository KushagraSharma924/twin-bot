import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

dotenv.config();

// Supabase client initialization
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Azure OpenAI client initialization
const azureApiKey = process.env.AZURE_OPENAI_KEY;
const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
const modelName = "gpt-4";

/**
 * Initialize the Azure OpenAI client
 */
function createClient() {
  return ModelClient(
    azureEndpoint,
    new AzureKeyCredential(azureApiKey)
  );
}

/**
 * Record user feedback for a particular interaction
 * @param {string} userId - User ID
 * @param {Object} interaction - Details of the interaction
 * @param {Object} feedback - User feedback
 */
export async function recordFeedback(userId, interaction, feedback) {
  try {
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
  } catch (error) {
    console.error("Error recording feedback:", error);
    throw error;
  }
}

/**
 * Analyze user feedback to derive learning
 * @param {string} userId - User ID
 */
export async function analyzeFeedback(userId) {
  try {
    // Get recent feedback for this user
    const { data: learningData, error } = await supabase
      .from('learning_data')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(100);
    
    if (error) throw error;
    
    if (!learningData || learningData.length === 0) {
      return {
        patterns: [],
        improvements: []
      };
    }
    
    const client = createClient();
    
    const messages = [
      { 
        role: "system", 
        content: `You are an AI system that analyzes user feedback to improve a digital twin assistant.
                  Analyze the provided learning data to identify patterns and potential improvements.
                  Focus on:
                  1. Identifying recurring feedback themes
                  2. Detecting user preferences and behavior patterns
                  3. Finding opportunities to improve the digital twin's responses
                  4. Suggesting concrete adjustments to the assistant's behavior
                  
                  Format your response as a JSON object with these properties:
                  - patterns: array of identified patterns (strings)
                  - userPreferences: object with user preference insights
                  - improvements: array of concrete improvement suggestions
                  - priority: object mapping improvement areas to priority levels (high, medium, low)`
      },
      { role: "user", content: JSON.stringify(learningData) }
    ];
    
    const response = await client.path("/chat/completions").post({
      body: {
        messages,
        max_tokens: 2000,
        model: modelName,
        temperature: 0.3
      }
    });

    if (isUnexpected(response)) {
      throw response.body.error;
    }

    const analysisText = response.body.choices[0].message.content;
    
    // Extract JSON from the response
    const jsonMatch = analysisText.match(/\{.*\}/s);
    if (!jsonMatch) {
      throw new Error("Could not extract valid JSON from the response");
    }
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Error analyzing feedback:", error);
    throw error;
  }
}

/**
 * Update user's personalization model based on learning
 * @param {string} userId - User ID
 * @param {Object} analysis - Result of feedback analysis
 */
export async function updatePersonalizationModel(userId, analysis) {
  try {
    // Get the user's current preferences
    const { data: preferences, error: prefError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (prefError && prefError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      throw prefError;
    }
    
    // Create or update user preferences with learning data
    const currentPrefs = preferences?.preferences || {};
    const updatedPrefs = {
      ...currentPrefs,
      learningModel: {
        lastUpdated: new Date().toISOString(),
        patterns: analysis.patterns || [],
        userPreferences: analysis.userPreferences || {},
        improvements: analysis.improvements || []
      }
    };
    
    // Update the preferences in the database
    const { error } = await supabase
      .from('user_preferences')
      .upsert([{
        user_id: userId,
        preferences: updatedPrefs,
        updated_at: new Date()
      }]);
    
    if (error) throw error;
    
    return updatedPrefs;
  } catch (error) {
    console.error("Error updating personalization model:", error);
    throw error;
  }
}

/**
 * Apply learning to enhance user interaction
 * @param {string} userId - User ID
 * @param {string} message - User message
 * @param {Array} history - Conversation history
 */
export async function enhanceWithLearning(userId, message, history = []) {
  try {
    // Get the user's preferences which contain the learning model
    const { data: preferences, error: prefError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (prefError && prefError.code !== 'PGRST116') {
      throw prefError;
    }
    
    // If there's no learning model, just return the original message
    if (!preferences?.preferences?.learningModel) {
      return { enhancedMessage: message, appliedLearning: false };
    }
    
    const learningModel = preferences.preferences.learningModel;
    
    const client = createClient();
    
    // Convert history to a format suitable for the model
    const formattedHistory = history.map(entry => ({
      role: entry.source === 'user' ? 'user' : 'assistant',
      content: entry.message
    }));
    
    const messages = [
      { 
        role: "system", 
        content: `You are an AI system that applies personalized learning to enhance user interactions.
                  Using the user's learning model, improve the current message to better match their preferences.
                  
                  Learning model:
                  ${JSON.stringify(learningModel)}
                  
                  Your task is to:
                  1. Analyze if the learning model contains relevant patterns for this message
                  2. If applicable, modify the message to better match user preferences
                  3. Maintain the core intent and information of the original message
                  
                  Return a JSON object with:
                  - enhancedMessage: string (the improved message)
                  - appliedPatterns: array of strings (patterns from the learning model that were applied)
                  - explanation: string (brief explanation of the changes made)`
      },
      ...formattedHistory,
      { 
        role: "user", 
        content: `Original message: ${message}
                  
                  Apply my learning model to enhance this message if applicable.` 
      }
    ];
    
    const response = await client.path("/chat/completions").post({
      body: {
        messages,
        max_tokens: 1500,
        model: modelName,
        temperature: 0.4
      }
    });

    if (isUnexpected(response)) {
      throw response.body.error;
    }

    const enhancedText = response.body.choices[0].message.content;
    
    // Extract JSON from the response
    const jsonMatch = enhancedText.match(/\{.*\}/s);
    if (!jsonMatch) {
      return { enhancedMessage: message, appliedLearning: false };
    }
    
    const enhancement = JSON.parse(jsonMatch[0]);
    
    // Log this enhancement for future learning
    await supabase
      .from('learning_data')
      .insert([{
        user_id: userId,
        interaction: {
          type: 'message_enhancement',
          original: message,
          enhanced: enhancement.enhancedMessage,
          patterns: enhancement.appliedPatterns
        },
        feedback: {
          automated: true,
          source: 'system',
          quality: 'pending_user_feedback'
        },
        timestamp: new Date()
      }]);
    
    return {
      enhancedMessage: enhancement.enhancedMessage,
      appliedLearning: true,
      appliedPatterns: enhancement.appliedPatterns,
      explanation: enhancement.explanation
    };
  } catch (error) {
    console.error("Error enhancing with learning:", error);
    // Fall back to original message if there's an error
    return { enhancedMessage: message, appliedLearning: false };
  }
}

/**
 * Train a personalized model based on user data
 * @param {string} userId - User ID
 */
export async function trainPersonalizedModel(userId) {
  try {
    // Collect all relevant user data for training
    const [conversations, tasks, browserInsights, calendarEvents, learningData] = await Promise.all([
      // Get conversations
      supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(200)
        .then(({ data, error }) => {
          if (error) throw error;
          return data;
        }),
      
      // Get tasks
      supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .then(({ data, error }) => {
          if (error) throw error;
          return data;
        }),
      
      // Get browser insights
      supabase
        .from('browser_insights')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(50)
        .then(({ data, error }) => {
          if (error) throw error;
          return data;
        }),
      
      // Get calendar events
      supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .then(({ data, error }) => {
          if (error) throw error;
          return data;
        }),
      
      // Get learning data
      supabase
        .from('learning_data')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .then(({ data, error }) => {
          if (error) throw error;
          return data;
        })
    ]);
    
    const client = createClient();
    
    const messages = [
      { 
        role: "system", 
        content: `You are an AI system that creates personalized models for digital twin assistants.
                  Analyze the provided user data to create a comprehensive personalization model.
                  
                  Focus on:
                  1. Communication style preferences
                  2. Task and productivity patterns
                  3. Time management habits
                  4. Content and interest preferences
                  5. Response formatting preferences
                  
                  Create a JSON model that captures these aspects of personalization for this user.
                  The model should include:
                  - communicationStyle: object with style preferences
                  - taskPatterns: object with task and productivity insights
                  - timeManagement: object with time management preferences
                  - interests: array of interest areas with confidence scores
                  - formatPreferences: object with presentation preferences
                  - specialInstructions: array of specific instructions for the assistant`
      },
      { 
        role: "user", 
        content: `User data for training:
                  
                  Conversations:
                  ${JSON.stringify(conversations)}
                  
                  Tasks:
                  ${JSON.stringify(tasks)}
                  
                  Browser Insights:
                  ${JSON.stringify(browserInsights)}
                  
                  Calendar Events:
                  ${JSON.stringify(calendarEvents)}
                  
                  Learning Data:
                  ${JSON.stringify(learningData)}
                  
                  Please create a personalized model for this user.` 
      }
    ];
    
    const response = await client.path("/chat/completions").post({
      body: {
        messages,
        max_tokens: 4000,
        model: modelName,
        temperature: 0.3
      }
    });

    if (isUnexpected(response)) {
      throw response.body.error;
    }

    const modelText = response.body.choices[0].message.content;
    
    // Extract JSON from the response
    const jsonMatch = modelText.match(/\{.*\}/s);
    if (!jsonMatch) {
      throw new Error("Could not extract valid JSON from the response");
    }
    
    const personalizedModel = JSON.parse(jsonMatch[0]);
    
    // Store this personalized model
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    const currentPrefs = preferences?.preferences || {};
    const updatedPrefs = {
      ...currentPrefs,
      personalizedModel: {
        ...personalizedModel,
        lastUpdated: new Date().toISOString(),
        version: 1
      }
    };
    
    await supabase
      .from('user_preferences')
      .upsert([{
        user_id: userId,
        preferences: updatedPrefs,
        updated_at: new Date()
      }]);
    
    return {
      success: true,
      model: personalizedModel
    };
  } catch (error) {
    console.error("Error training personalized model:", error);
    throw error;
  }
}

export default {
  recordFeedback,
  analyzeFeedback,
  updatePersonalizationModel,
  enhanceWithLearning,
  trainPersonalizedModel
}; 