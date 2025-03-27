/**
 * Research Service
 * Handles all research-related operations including real-time research and knowledge synthesis
 */

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import logger from '../utils/logger.js';
import * as aiService from './aiService.js';
import { config, supabase as existingSupabase } from '../config/index.js';

// Initialize Supabase client if not already initialized
const supabase = existingSupabase || createClient(config.supabase.url, config.supabase.key);

// Research sources
export const RESEARCH_SOURCES = {
  ARXIV: 'arxiv',
  GOOGLE_SCHOLAR: 'google_scholar',
  NEWS_API: 'news_api',
  TECH_BLOGS: 'tech_blogs',
  GITHUB: 'github',
  PAPERS_WITH_CODE: 'papers_with_code'
};

// Document types
export const DOCUMENT_TYPES = {
  PAPER: 'paper',
  ARTICLE: 'article',
  NEWS: 'news',
  SYNTHESIS: 'synthesis',
  GRAPH: 'graph',
  ALERT: 'alert'
};

// Process statuses
const PROCESS_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * Mock data for demo purposes - in a real implementation, these would be API calls
 */
const mockSourceData = {
  [RESEARCH_SOURCES.ARXIV]: [
    {
      title: 'Recent Advances in Large Language Models: A Survey',
      url: 'https://arxiv.org/abs/2307.06435',
      authors: ['John Smith', 'Jane Doe'],
      abstract: 'This survey provides a comprehensive overview of recent advances in large language models...',
      published_date: '2023-11-15',
    },
    {
      title: 'Knowledge Graphs for LLM Reasoning: A Survey',
      url: 'https://arxiv.org/abs/2308.06594',
      authors: ['Alice Johnson', 'Bob Williams'],
      abstract: 'Knowledge graphs have emerged as crucial components for enhancing large language model reasoning...',
      published_date: '2023-12-02',
    }
  ],
  [RESEARCH_SOURCES.NEWS_API]: [
    {
      title: 'OpenAI Announces GPT-5 Development Plans',
      url: 'https://techjournal.com/openai-gpt5-plans',
      source: 'Tech Journal',
      content: 'OpenAI has officially announced plans for GPT-5, which will focus on multimodal capabilities...',
      published_at: '2023-12-18',
    },
    {
      title: 'Microsoft Introduces New AI Tool for Cybersecurity',
      url: 'https://technews.com/microsoft-ai-cybersecurity',
      source: 'Tech News Daily',
      content: 'Microsoft has unveiled a new AI-powered tool designed to detect and mitigate cybersecurity threats...',
      published_at: '2023-12-20',
    }
  ]
};

class ResearchService {
  /**
   * Get research documents for a user with optional filtering
   * @param {string} userId - User ID
   * @param {Object} options - Filter options
   * @returns {Promise<Object>} - Paginated result with documents
   */
  async getResearchDocuments(userId, options = {}) {
    try {
      logger.info('Getting research documents', { userId, options });
      
      const { type, category, query, page = 1, limit = 20, sort = 'dateAdded', order = 'desc' } = options;
      
      // Build the query
      let dbQuery = supabase
        .from('research_documents')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);
      
      // Apply filters
      if (type) {
        dbQuery = dbQuery.eq('type', type);
      }
      
      if (category) {
        dbQuery = dbQuery.eq('category', category);
      }
      
      if (query) {
        dbQuery = dbQuery.or(`title.ilike.%${query}%, excerpt.ilike.%${query}%, content.ilike.%${query}%`);
      }
      
      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      
      // Apply sorting
      dbQuery = dbQuery.order(sort, { ascending: order === 'asc' });
      
      // Execute query with pagination
      const { data, error, count } = await dbQuery.range(from, to);
      
      if (error) {
        throw new Error(`Error fetching research documents: ${error.message}`);
      }
      
      // Process document metadata
      const processedDocuments = data.map(doc => {
        // Parse JSON fields if they exist
        if (doc.metadata && typeof doc.metadata === 'string') {
          try {
            doc.metadata = JSON.parse(doc.metadata);
          } catch (e) {
            logger.warn(`Failed to parse metadata for document ${doc.id}`, { error: e.message });
            doc.metadata = {};
          }
        }
        
        // Parse tags if they exist
        if (doc.tags && typeof doc.tags === 'string') {
          try {
            doc.tags = JSON.parse(doc.tags);
          } catch (e) {
            logger.warn(`Failed to parse tags for document ${doc.id}`, { error: e.message });
            doc.tags = [];
          }
        } else if (!doc.tags) {
          doc.tags = [];
        }
        
        return doc;
      });
      
      return {
        documents: processedDocuments,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      logger.error('Error in getResearchDocuments', { error: error.message, stack: error.stack });
      throw error;
    }
  }
  
  /**
   * Get a specific research document by ID
   * @param {string} userId - User ID
   * @param {string} documentId - Document ID
   * @returns {Promise<Object>} - Research document
   */
  async getResearchDocumentById(userId, documentId) {
    try {
      logger.info('Getting research document by ID', { userId, documentId });
      
      const { data, error } = await supabase
        .from('research_documents')
        .select('*')
        .eq('id', documentId)
        .eq('user_id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') { // Resource not found
          return null;
        }
        throw new Error(`Error fetching research document: ${error.message}`);
      }
      
      // Parse JSON fields if they exist
      if (data.metadata && typeof data.metadata === 'string') {
        try {
          data.metadata = JSON.parse(data.metadata);
        } catch (e) {
          logger.warn(`Failed to parse metadata for document ${data.id}`, { error: e.message });
          data.metadata = {};
        }
      }
      
      // Parse tags if they exist
      if (data.tags && typeof data.tags === 'string') {
        try {
          data.tags = JSON.parse(data.tags);
        } catch (e) {
          logger.warn(`Failed to parse tags for document ${data.id}`, { error: e.message });
          data.tags = [];
        }
      } else if (!data.tags) {
        data.tags = [];
      }
      
      return data;
    } catch (error) {
      logger.error('Error in getResearchDocumentById', { error: error.message, stack: error.stack });
      throw error;
    }
  }
  
  /**
   * Start a real-time research process
   * @param {string} userId - User ID
   * @param {string} query - Research query
   * @param {Array<string>} sources - Research sources
   * @param {number} maxResults - Maximum number of results
   * @param {string} category - Research category
   * @returns {Promise<string>} - Process ID
   */
  async startRealtimeResearch(userId, query, sources, maxResults = 10, category = null) {
    try {
      logger.info('Starting real-time research', { userId, query, sources, maxResults, category });
      
      // Generate process ID
      const processId = uuidv4();
      
      // Create research process record
      const { data: processData, error: processError } = await supabase
        .from('research_processes')
        .insert({
          id: processId,
          user_id: userId,
          type: 'realtime',
          status: PROCESS_STATUS.PENDING,
          query,
          sources: JSON.stringify(sources),
          max_results: maxResults,
          category,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (processError) {
        throw new Error(`Error creating research process: ${processError.message}`);
      }
      
      // Start the research process asynchronously
      this._processRealtimeResearch(processId, userId, query, sources, maxResults, category);
      
      return processId;
    } catch (error) {
      logger.error('Error in startRealtimeResearch', { error: error.message, stack: error.stack });
      throw error;
    }
  }
  
  /**
   * Start a knowledge synthesis process
   * @param {string} userId - User ID
   * @param {string} topic - Research topic
   * @param {Array<string>} documents - Document IDs to synthesize
   * @param {string} depth - Synthesis depth (low, medium, high)
   * @param {string} category - Research category
   * @returns {Promise<string>} - Process ID
   */
  async startKnowledgeSynthesis(userId, topic, documents = [], depth = 'medium', category = null) {
    try {
      logger.info('Starting knowledge synthesis', { userId, topic, documentsCount: documents.length, depth, category });
      
      // Generate process ID
      const processId = uuidv4();
      
      // Create synthesis process record
      const { data: processData, error: processError } = await supabase
        .from('research_processes')
        .insert({
          id: processId,
          user_id: userId,
          type: 'synthesis',
          status: PROCESS_STATUS.PENDING,
          query: topic,
          document_ids: JSON.stringify(documents),
          depth,
          category,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (processError) {
        throw new Error(`Error creating synthesis process: ${processError.message}`);
      }
      
      // Start the synthesis process asynchronously
      this._processKnowledgeSynthesis(processId, userId, topic, documents, depth, category);
      
      return processId;
    } catch (error) {
      logger.error('Error in startKnowledgeSynthesis', { error: error.message, stack: error.stack });
      throw error;
    }
  }
  
  /**
   * Get the status of a research process
   * @param {string} userId - User ID
   * @param {string} processId - Process ID
   * @returns {Promise<Object>} - Process status and results if available
   */
  async getProcessStatus(userId, processId) {
    try {
      logger.info('Getting process status', { userId, processId });
      
      const { data, error } = await supabase
        .from('research_processes')
        .select('*')
        .eq('id', processId)
        .eq('user_id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') { // Resource not found
          return { status: 'not_found' };
        }
        throw new Error(`Error fetching process status: ${error.message}`);
      }
      
      // If process is completed, fetch the documents
      if (data.status === PROCESS_STATUS.COMPLETED) {
        const { data: documents, error: docsError } = await supabase
          .from('research_documents')
          .select('*')
          .eq('process_id', processId)
          .order('created_at', { ascending: false });
        
        if (docsError) {
          throw new Error(`Error fetching process documents: ${docsError.message}`);
        }
        
        return {
          status: data.status,
          process: data,
          documents: documents || []
        };
      }
      
      return {
        status: data.status,
        process: data
      };
    } catch (error) {
      logger.error('Error in getProcessStatus', { error: error.message, stack: error.stack });
      throw error;
    }
  }
  
  /**
   * Update a research document
   * @param {string} userId - User ID
   * @param {string} documentId - Document ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} - Updated document
   */
  async updateResearchDocument(userId, documentId, updates) {
    try {
      logger.info('Updating research document', { userId, documentId, updates });
      
      // Prepare the updates
      const updateData = { ...updates };
      
      // Ensure JSON fields are properly formatted
      if (updateData.metadata && typeof updateData.metadata !== 'string') {
        updateData.metadata = JSON.stringify(updateData.metadata);
      }
      
      if (updateData.tags && Array.isArray(updateData.tags)) {
        updateData.tags = JSON.stringify(updateData.tags);
      }
      
      // Add updated_at timestamp
      updateData.updated_at = new Date().toISOString();
      
      // Update the document
      const { data, error } = await supabase
        .from('research_documents')
        .update(updateData)
        .eq('id', documentId)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Error updating research document: ${error.message}`);
      }
      
      // Parse JSON fields if they exist
      if (data.metadata && typeof data.metadata === 'string') {
        try {
          data.metadata = JSON.parse(data.metadata);
        } catch (e) {
          logger.warn(`Failed to parse metadata for document ${data.id}`, { error: e.message });
          data.metadata = {};
        }
      }
      
      // Parse tags if they exist
      if (data.tags && typeof data.tags === 'string') {
        try {
          data.tags = JSON.parse(data.tags);
        } catch (e) {
          logger.warn(`Failed to parse tags for document ${data.id}`, { error: e.message });
          data.tags = [];
        }
      } else if (!data.tags) {
        data.tags = [];
      }
      
      return data;
    } catch (error) {
      logger.error('Error in updateResearchDocument', { error: error.message, stack: error.stack });
      throw error;
    }
  }
  
  /**
   * Delete a research document
   * @param {string} userId - User ID
   * @param {string} documentId - Document ID
   * @returns {Promise<void>}
   */
  async deleteResearchDocument(userId, documentId) {
    try {
      logger.info('Deleting research document', { userId, documentId });
      
      const { error } = await supabase
        .from('research_documents')
        .delete()
        .eq('id', documentId)
        .eq('user_id', userId);
      
      if (error) {
        throw new Error(`Error deleting research document: ${error.message}`);
      }
    } catch (error) {
      logger.error('Error in deleteResearchDocument', { error: error.message, stack: error.stack });
      throw error;
    }
  }
  
  /**
   * Get user's research interests from chat history
   * @param {string} userId - User ID
   * @returns {Promise<Array<string>>} - List of research interests
   */
  async getUserInterestsFromChatHistory(userId) {
    try {
      logger.info('Getting user research interests from chat history', { userId });
      
      // First check if we have recent chat messages
      const { data: conversations, error: convoError } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);  // Last 30 messages should be sufficient
      
      if (convoError) {
        throw new Error(`Error fetching conversation history: ${convoError.message}`);
      }
      
      // If no conversations yet, return default interests
      if (!conversations || conversations.length === 0) {
        logger.info('No chat history found, returning default interests', { userId });
        return ['AI & Machine Learning'];
      }
      
      // Extract all messages from conversations
      const allMessages = conversations.flatMap(convo => {
        try {
          return JSON.parse(convo.messages || '[]');
        } catch (e) {
          logger.warn(`Failed to parse messages for conversation ${convo.id}`, { error: e.message });
          return [];
        }
      });
      
      // Get user messages only
      const userMessages = allMessages
        .filter(msg => msg.role === 'user' || msg.isUser)
        .map(msg => msg.content || msg.message)
        .filter(Boolean)
        .join(' ');
      
      // If no user messages, return default interests
      if (!userMessages.trim()) {
        logger.info('No user messages found, returning default interests', { userId });
        return ['AI & Machine Learning'];
      }
      
      // Use AI to extract research interests
      try {
        const interests = await aiService.extractResearchInterests(userMessages);
        
        if (Array.isArray(interests) && interests.length > 0) {
          logger.info('Successfully extracted research interests', { 
            userId, 
            interestCount: interests.length 
          });
          return interests;
        }
      } catch (aiError) {
        logger.error('Error using AI to extract research interests', { 
          error: aiError.message, 
          userId 
        });
      }
      
      // Use backup method: extract keywords
      const keywords = this._extractKeywordsFromText(userMessages);
      
      if (keywords.length > 0) {
        logger.info('Extracted interests using keyword method', { 
          userId, 
          interestCount: keywords.length 
        });
        return keywords.slice(0, 5); // Return top 5 interests
      }
      
      // If all else fails, return default interests
      return ['AI & Machine Learning'];
    } catch (error) {
      logger.error('Error in getUserInterestsFromChatHistory', { 
        error: error.message, 
        stack: error.stack,
        userId 
      });
      return ['AI & Machine Learning']; // Default fallback
    }
  }
  
  /**
   * Extract keywords/topics from text as a fallback method
   * @private
   */
  _extractKeywordsFromText(text) {
    // Simple keyword extraction using predefined topics
    const topics = [
      'AI & Machine Learning', 'Data Science', 'Web Development', 
      'Cybersecurity', 'Blockchain', 'Cloud Computing',
      'Mobile Development', 'IoT', 'Quantum Computing',
      'Robotics', 'AR/VR', 'Cryptocurrency', 'Big Data',
      'DevOps', 'UI/UX Design'
    ];
    
    // Count occurrences of topics in the text
    const matches = topics.map(topic => {
      // Create regex patterns for the topic and related keywords
      const patterns = this._getTopicPatterns(topic);
      
      // Count matches for all patterns
      const count = patterns.reduce((acc, pattern) => {
        const regex = new RegExp(pattern, 'ig');
        const matches = text.match(regex) || [];
        return acc + matches.length;
      }, 0);
      
      return { topic, count };
    });
    
    // Sort by count and return topics with at least one match
    return matches
      .filter(m => m.count > 0)
      .sort((a, b) => b.count - a.count)
      .map(m => m.topic);
  }
  
  /**
   * Get regex patterns for a given topic
   * @private
   */
  _getTopicPatterns(topic) {
    // Map topics to related keywords
    const keywordMap = {
      'AI & Machine Learning': ['ai', 'machine learning', 'neural network', 'deep learning', 'nlp', 'ml', 'gpt', 'llm'],
      'Data Science': ['data science', 'analytics', 'statistics', 'data analysis', 'data visualization', 'pandas', 'python'],
      'Web Development': ['web dev', 'frontend', 'backend', 'full stack', 'javascript', 'react', 'node', 'angular', 'vue'],
      'Cybersecurity': ['security', 'hacking', 'penetration testing', 'firewall', 'encryption', 'cyber'],
      'Blockchain': ['blockchain', 'distributed ledger', 'smart contract', 'web3'],
      'Cloud Computing': ['cloud', 'aws', 'azure', 'gcp', 'serverless', 'saas', 'paas', 'iaas'],
      'Mobile Development': ['mobile', 'android', 'ios', 'swift', 'kotlin', 'flutter', 'react native'],
      'IoT': ['iot', 'internet of things', 'embedded system', 'sensor', 'arduino', 'raspberry pi'],
      'Quantum Computing': ['quantum', 'qubit', 'quantum computing'],
      'Robotics': ['robot', 'automation', 'autonomous', 'drone'],
      'AR/VR': ['augmented reality', 'virtual reality', 'ar', 'vr', 'metaverse', 'xr'],
      'Cryptocurrency': ['crypto', 'bitcoin', 'ethereum', 'nft', 'token', 'wallet', 'coinbase'],
      'Big Data': ['big data', 'hadoop', 'spark', 'data lake', 'data warehouse'],
      'DevOps': ['devops', 'ci/cd', 'docker', 'kubernetes', 'pipeline', 'jenkins', 'gitlab'],
      'UI/UX Design': ['ui', 'ux', 'user interface', 'user experience', 'design', 'figma', 'sketch']
    };
    
    // Return the patterns for the topic
    return [topic, ...(keywordMap[topic] || [])];
  }
  
  // Private methods
  
  /**
   * Process real-time research (internal method)
   * @private
   */
  async _processRealtimeResearch(processId, userId, query, sources, maxResults, category) {
    try {
      // Update process status to in progress
      await supabase
        .from('research_processes')
        .update({ status: PROCESS_STATUS.IN_PROGRESS, started_at: new Date().toISOString() })
        .eq('id', processId);
      
      logger.info('Processing real-time research', { processId, userId, query });
      
      // This will hold all research results
      const results = [];
      
      for (const source of sources) {
        try {
          let sourceResults = [];
          
          // Fetch data from actual APIs based on the source
          switch (source) {
            case RESEARCH_SOURCES.ARXIV:
              sourceResults = await this._fetchFromArxiv(query, Math.min(maxResults, 5));
              break;
              
            case RESEARCH_SOURCES.NEWS_API:
              sourceResults = await this._fetchFromNewsApi(query, Math.min(maxResults, 5));
              break;
              
            case RESEARCH_SOURCES.TECH_BLOGS:
              sourceResults = await this._fetchFromTechBlogs(query, Math.min(maxResults, 5));
              break;
              
            case RESEARCH_SOURCES.GOOGLE_SCHOLAR:
              sourceResults = await this._fetchFromGoogleScholar(query, Math.min(maxResults, 3));
              break;
              
            case RESEARCH_SOURCES.PAPERS_WITH_CODE:
              sourceResults = await this._fetchFromPapersWithCode(query, Math.min(maxResults, 3));
              break;
              
            default:
              logger.warn(`Unknown source: ${source}, skipping`);
              continue;
          }
          
          logger.info(`Fetched ${sourceResults.length} results from ${source}`);
          
          // Process and save each result
          for (const result of sourceResults) {
            const documentId = uuidv4();
            let documentType;
            
            // Determine document type based on source
            switch (source) {
              case RESEARCH_SOURCES.ARXIV:
              case RESEARCH_SOURCES.GOOGLE_SCHOLAR:
              case RESEARCH_SOURCES.PAPERS_WITH_CODE:
                documentType = DOCUMENT_TYPES.PAPER;
                break;
              case RESEARCH_SOURCES.NEWS_API:
                documentType = DOCUMENT_TYPES.NEWS;
                break;
              case RESEARCH_SOURCES.TECH_BLOGS:
                documentType = DOCUMENT_TYPES.ARTICLE;
                break;
              default:
                documentType = DOCUMENT_TYPES.ARTICLE;
            }
            
            // Generate insights with AI service
            let insights = [];
            try {
              const content = result.abstract || result.content || result.description || '';
              if (content) {
                const aiResponse = await aiService.generateResearchInsights(content, query);
                if (aiResponse && aiResponse.insights) {
                  insights = aiResponse.insights;
                }
              }
            } catch (e) {
              logger.warn(`Failed to generate insights for document ${documentId}`, { error: e.message });
            }
            
            // Create document record
            const document = {
              id: documentId,
              user_id: userId,
              process_id: processId,
              type: documentType,
              title: result.title,
              excerpt: result.abstract || result.content || result.description || '',
              source: result.source || source,
              url: result.url || result.link || '',
              category: category || 'Uncategorized',
              date_added: new Date().toISOString(),
              date_published: result.published_date || result.published_at || result.publishedAt || new Date().toISOString(),
              tags: JSON.stringify([query, documentType, source]),
              metadata: JSON.stringify({
                authors: result.authors || result.author || [],
                insights: insights,
                query: query,
                source_detail: source
              }),
              created_at: new Date().toISOString()
            };
            
            // Add document to database
            const { error: docError } = await supabase
              .from('research_documents')
              .insert(document);
            
            if (docError) {
              logger.error(`Error inserting document`, { error: docError.message, document });
            } else {
              results.push(document);
              
              // Stop if we've reached the max results
              if (results.length >= maxResults) {
                break;
              }
            }
          }
          
          // Stop if we've reached the max results
          if (results.length >= maxResults) {
            break;
          }
        } catch (sourceError) {
          logger.error(`Error fetching from source ${source}`, { error: sourceError.message });
          // Continue with other sources even if one fails
        }
      }
      
      // Update process status to completed
      await supabase
        .from('research_processes')
        .update({
          status: PROCESS_STATUS.COMPLETED,
          completed_at: new Date().toISOString(),
          result_count: results.length
        })
        .eq('id', processId);
      
      logger.info('Real-time research completed', { processId, documentCount: results.length });
    } catch (error) {
      logger.error('Error in _processRealtimeResearch', { error: error.message, stack: error.stack, processId });
      
      // Update process status to failed
      await supabase
        .from('research_processes')
        .update({
          status: PROCESS_STATUS.FAILED,
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', processId);
    }
  }
  
  /**
   * Fetch papers from arXiv API
   * @private
   */
  async _fetchFromArxiv(query, maxResults) {
    try {
      // Use the arXiv API
      const encodedQuery = encodeURIComponent(query);
      const response = await axios.get(
        `http://export.arxiv.org/api/query?search_query=all:${encodedQuery}&start=0&max_results=${maxResults}`
      );
      
      // Parse XML response
      const xml = response.data;
      const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g) || [];
      
      return entries.map(entry => {
        // Extract relevant data using regex
        const title = (entry.match(/<title>([\s\S]*?)<\/title>/) || [])[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') || 'Untitled';
        const abstract = (entry.match(/<summary>([\s\S]*?)<\/summary>/) || [])[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') || '';
        const url = (entry.match(/<id>([\s\S]*?)<\/id>/) || [])[1] || '';
        const published_date = (entry.match(/<published>([\s\S]*?)<\/published>/) || [])[1] || '';
        
        // Extract authors
        const authorMatches = entry.match(/<author>([\s\S]*?)<\/author>/g) || [];
        const authors = authorMatches.map(author => {
          const name = (author.match(/<name>([\s\S]*?)<\/name>/) || [])[1] || '';
          return name;
        });
        
        return {
          title,
          abstract,
          url,
          published_date,
          authors,
          source: RESEARCH_SOURCES.ARXIV
        };
      });
    } catch (error) {
      logger.error('Error fetching from arXiv:', error);
      // Return empty array in case of error
      return [];
    }
  }
  
  /**
   * Fetch news from News API
   * @private
   */
  async _fetchFromNewsApi(query, maxResults) {
    try {
      // Use News API or similar service
      // Note: You would need an API key in a real implementation
      // This is a simplified example
      
      const encodedQuery = encodeURIComponent(query);
      const apiKey = process.env.NEWS_API_KEY;
      
      if (!apiKey) {
        // Use free alternative if no API key is available
        return this._fetchFromGnewsApi(query, maxResults);
      }
      
      const response = await axios.get(
        `https://newsapi.org/v2/everything?q=${encodedQuery}&sortBy=relevancy&pageSize=${maxResults}&apiKey=${apiKey}`
      );
      
      const articles = response.data.articles || [];
      
      return articles.map(article => ({
        title: article.title,
        content: article.content || article.description,
        url: article.url,
        published_at: article.publishedAt,
        source: article.source?.name || 'News API',
        author: article.author ? [article.author] : [],
        description: article.description
      }));
    } catch (error) {
      logger.error('Error fetching from News API:', error);
      // Fallback to an alternative service
      return this._fetchFromGnewsApi(query, maxResults);
    }
  }
  
  /**
   * Alternative news API (fallback)
   * @private
   */
  async _fetchFromGnewsApi(query, maxResults) {
    try {
      // Use Gnews API as a fallback
      const encodedQuery = encodeURIComponent(query);
      const response = await axios.get(
        `https://gnews.io/api/v4/search?q=${encodedQuery}&max=${maxResults}&lang=en&country=us`
      );
      
      const articles = response.data.articles || [];
      
      return articles.map(article => ({
        title: article.title,
        content: article.content,
        url: article.url,
        published_at: article.publishedAt,
        source: article.source?.name || 'GNews',
        description: article.description
      }));
    } catch (error) {
      logger.error('Error fetching from GNews API:', error);
      
      // Return empty array in case of error
      return [];
    }
  }
  
  /**
   * Fetch from tech blogs
   * @private
   */
  async _fetchFromTechBlogs(query, maxResults) {
    try {
      // HackerNews or DevTo API could be used here
      // This is a simplified example
      const encodedQuery = encodeURIComponent(query);
      
      // DevTo API
      const response = await axios.get(
        `https://dev.to/api/articles?tag=${encodedQuery}&top=1&per_page=${maxResults}`
      );
      
      const articles = response.data || [];
      
      return articles.map(article => ({
        title: article.title,
        content: article.description || article.body_markdown || '',
        url: article.url || `https://dev.to/${article.path}`,
        published_at: article.published_at || article.created_at,
        source: 'Dev.to',
        author: article.user ? [article.user.name] : [],
        tags: article.tags
      }));
    } catch (devToError) {
      logger.error('Error fetching from Dev.to:', devToError);
      
      try {
        // Fallback to HackerNews
        const searchResponse = await axios.get(
          `http://hn.algolia.com/api/v1/search?query=${query}&tags=story&hitsPerPage=${maxResults}`
        );
        
        const hits = searchResponse.data.hits || [];
        
        return Promise.all(hits.map(async hit => {
          try {
            // Get more details for each story
            const storyResponse = await axios.get(
              `http://hn.algolia.com/api/v1/items/${hit.objectID}`
            );
            
            const story = storyResponse.data;
            
            return {
              title: story.title,
              content: story.text || '',
              url: story.url,
              published_at: new Date(story.created_at).toISOString(),
              source: 'Hacker News',
              author: story.author ? [story.author] : []
            };
          } catch (e) {
            // If we can't get details, return the hit with limited info
            return {
              title: hit.title,
              content: hit.story_text || '',
              url: hit.url,
              published_at: new Date(hit.created_at_i * 1000).toISOString(),
              source: 'Hacker News',
              author: hit.author ? [hit.author] : []
            };
          }
        }));
      } catch (hnError) {
        logger.error('Error fetching from HackerNews:', hnError);
        return [];
      }
    }
  }
  
  /**
   * Google Scholar doesn't have an official API, so this uses an unofficial approach
   * @private
   */
  async _fetchFromGoogleScholar(query, maxResults) {
    try {
      // In a real implementation, you might use a service like Serper.dev or SerpAPI
      // For this example, we'll just generate placeholder results
      // as web scraping Google Scholar can lead to IP blocks
      
      // Generate placeholder content
      return Array(maxResults).fill(0).map((_, index) => ({
        title: `Scholarly Research on ${query} - Publication ${index + 1}`,
        abstract: `This is a scholarly publication about ${query}. It contains academic research and findings that are relevant to this topic.`,
        url: `https://scholar.example.com/paper${index + 1}`,
        published_date: new Date(Date.now() - Math.random() * 31536000000).toISOString(),
        authors: ['Academic Author', 'Research Contributor'],
        source: RESEARCH_SOURCES.GOOGLE_SCHOLAR
      }));
    } catch (error) {
      logger.error('Error with Google Scholar search:', error);
      return [];
    }
  }
  
  /**
   * Papers With Code API
   * @private
   */
  async _fetchFromPapersWithCode(query, maxResults) {
    try {
      // Use the Papers With Code API
      const encodedQuery = encodeURIComponent(query);
      const response = await axios.get(
        `https://paperswithcode.com/api/v1/papers/?search=${encodedQuery}&items_per_page=${maxResults}`
      );
      
      const papers = response.data.results || [];
      
      return papers.map(paper => ({
        title: paper.title,
        abstract: paper.abstract,
        url: paper.url,
        published_date: paper.published || new Date().toISOString(),
        authors: paper.authors?.map(author => author.name) || [],
        source: RESEARCH_SOURCES.PAPERS_WITH_CODE,
        github_url: paper.repository_url
      }));
    } catch (error) {
      logger.error('Error fetching from Papers With Code:', error);
      return [];
    }
  }
  
  /**
   * Process knowledge synthesis (internal method)
   * @private
   */
  async _processKnowledgeSynthesis(processId, userId, topic, documentIds, depth, category) {
    try {
      // Update process status to in progress
      await supabase
        .from('research_processes')
        .update({ status: PROCESS_STATUS.IN_PROGRESS, started_at: new Date().toISOString() })
        .eq('id', processId);
      
      logger.info('Processing knowledge synthesis', { processId, userId, topic, documentIds });
      
      // Fetch the documents if document IDs are provided
      let documentContents = [];
      if (documentIds && documentIds.length > 0) {
        const { data: documents, error } = await supabase
          .from('research_documents')
          .select('*')
          .in('id', documentIds)
          .eq('user_id', userId);
        
        if (error) {
          throw new Error(`Error fetching documents for synthesis: ${error.message}`);
        }
        
        documentContents = documents.map(doc => ({
          id: doc.id,
          title: doc.title,
          content: doc.excerpt || '',
          source: doc.source,
          type: doc.type
        }));
      } else {
        // If no documents provided, fetch recent documents for the category
        const { data: documents, error } = await supabase
          .from('research_documents')
          .select('*')
          .eq('user_id', userId)
          .eq('category', category || 'Uncategorized')
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (error) {
          throw new Error(`Error fetching recent documents for synthesis: ${error.message}`);
        }
        
        documentContents = documents.map(doc => ({
          id: doc.id,
          title: doc.title,
          content: doc.excerpt || '',
          source: doc.source,
          type: doc.type
        }));
      }
      
      // Generate synthesis with AI service
      const synthesisResult = await aiService.generateKnowledgeSynthesis(
        topic,
        documentContents,
        depth
      );
      
      if (!synthesisResult) {
        throw new Error('Failed to generate knowledge synthesis');
      }
      
      // Create the synthesis document
      const synthDocumentId = uuidv4();
      const synthesisDocument = {
        id: synthDocumentId,
        user_id: userId,
        process_id: processId,
        type: DOCUMENT_TYPES.SYNTHESIS,
        title: `Knowledge Synthesis: ${topic}`,
        excerpt: synthesisResult.summary || '',
        content: synthesisResult.content || '',
        source: 'AI Synthesis',
        category: category || 'Uncategorized',
        date_added: new Date().toISOString(),
        date_published: new Date().toISOString(),
        tags: JSON.stringify([topic, 'synthesis', depth]),
        metadata: JSON.stringify({
          topic,
          depth,
          document_ids: documentIds,
          document_count: documentContents.length,
          insights: synthesisResult.insights || [],
          key_findings: synthesisResult.key_findings || []
        }),
        created_at: new Date().toISOString()
      };
      
      // Add synthesis document to database
      const { error: synthError } = await supabase
        .from('research_documents')
        .insert(synthesisDocument);
      
      if (synthError) {
        throw new Error(`Error inserting synthesis document: ${synthError.message}`);
      }
      
      // Create a knowledge graph if depth is medium or high
      if (depth === 'medium' || depth === 'high') {
        try {
          const graphDocumentId = uuidv4();
          const graphDocument = {
            id: graphDocumentId,
            user_id: userId,
            process_id: processId,
            type: DOCUMENT_TYPES.GRAPH,
            title: `Knowledge Graph: ${topic}`,
            excerpt: `Interactive knowledge graph connecting key research elements on ${topic}`,
            source: 'AI Knowledge Graph',
            category: category || 'Uncategorized',
            date_added: new Date().toISOString(),
            date_published: new Date().toISOString(),
            tags: JSON.stringify([topic, 'graph', depth]),
            metadata: JSON.stringify({
              topic,
              depth,
              document_ids: documentIds,
              source_document_id: synthDocumentId,
              nodes: synthesisResult.graph?.nodes || [],
              edges: synthesisResult.graph?.edges || [],
              graph_type: 'knowledge_graph'
            }),
            created_at: new Date().toISOString()
          };
          
          // Add graph document to database
          const { error: graphError } = await supabase
            .from('research_documents')
            .insert(graphDocument);
          
          if (graphError) {
            logger.error(`Error inserting graph document: ${graphError.message}`);
          }
        } catch (e) {
          logger.warn('Failed to create knowledge graph', { error: e.message });
        }
      }
      
      // Update process status to completed
      await supabase
        .from('research_processes')
        .update({
          status: PROCESS_STATUS.COMPLETED,
          completed_at: new Date().toISOString(),
          result_count: 1
        })
        .eq('id', processId);
      
      logger.info('Knowledge synthesis completed', { processId });
    } catch (error) {
      logger.error('Error in _processKnowledgeSynthesis', { error: error.message, stack: error.stack, processId });
      
      // Update process status to failed
      await supabase
        .from('research_processes')
        .update({
          status: PROCESS_STATUS.FAILED,
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', processId);
    }
  }
}

// Create and export singleton instance
export const researchService = new ResearchService(); 