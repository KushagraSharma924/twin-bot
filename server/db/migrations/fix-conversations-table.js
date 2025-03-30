import { supabase } from '../../config/index.js';
import logger from '../../utils/logger.js';

/**
 * This migration fixes the conversations table by renaming the 'timestamp' column to 'created_at'
 * to match the code that's referencing it.
 */
async function migrateConversationsTable() {
  try {
    logger.info('Starting conversations table migration...');
    
    // Check if supabase client is available
    if (!supabase) {
      logger.error('Supabase client not available, cannot perform migration');
      return false;
    }
    
    // First, check if the table exists
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'conversations')
      .eq('table_schema', 'public');
    
    if (tableError) {
      logger.error('Error checking if conversations table exists:', tableError);
      return false;
    }
    
    if (!tables || tables.length === 0) {
      logger.warn('Conversations table does not exist, migration not needed');
      return false;
    }
    
    // Check if timestamp column exists and created_at doesn't yet
    const { data: columns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'conversations')
      .eq('table_schema', 'public');
    
    if (columnError) {
      logger.error('Error checking conversations table columns:', columnError);
      return false;
    }
    
    const hasTimestamp = columns.some(col => col.column_name === 'timestamp');
    const hasCreatedAt = columns.some(col => col.column_name === 'created_at');
    
    if (!hasTimestamp) {
      logger.warn('Conversations table does not have timestamp column, cannot migrate');
      
      // If neither column exists, create the created_at column
      if (!hasCreatedAt) {
        logger.info('Adding created_at column to conversations table...');
        const { error: alterError } = await supabase.rpc(
          'execute_sql',
          { 
            query: 'ALTER TABLE conversations ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE(\'utc\'::text, NOW())' 
          }
        );
        
        if (alterError) {
          logger.error('Error adding created_at column:', alterError);
          return false;
        }
        
        logger.info('Successfully added created_at column to conversations table');
        return true;
      }
      
      return false;
    }
    
    if (hasCreatedAt) {
      logger.info('Conversations table already has created_at column, migration not needed');
      return true;
    }
    
    // Rename timestamp column to created_at
    logger.info('Renaming timestamp column to created_at in conversations table...');
    
    // Using rpc to execute raw SQL (many Supabase instances allow this)
    const { error: renameError } = await supabase.rpc(
      'execute_sql',
      { 
        query: 'ALTER TABLE conversations RENAME COLUMN "timestamp" TO "created_at"' 
      }
    );
    
    if (renameError) {
      logger.error('Error renaming column:', renameError);
      
      // If rpc method is not available, try alternative approach
      logger.info('Attempting alternative migration approach...');
      
      // Alternative: Create a new column, copy data, then drop old column
      try {
        // 1. Add new column
        await supabase.rpc(
          'execute_sql',
          { 
            query: 'ALTER TABLE conversations ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE(\'utc\'::text, NOW())' 
          }
        );
        
        // 2. Copy data from timestamp to created_at
        await supabase.rpc(
          'execute_sql',
          { 
            query: 'UPDATE conversations SET created_at = "timestamp"' 
          }
        );
        
        // 3. Drop the timestamp column
        await supabase.rpc(
          'execute_sql',
          { 
            query: 'ALTER TABLE conversations DROP COLUMN "timestamp"' 
          }
        );
        
        logger.info('Alternative migration completed successfully');
        return true;
      } catch (altError) {
        logger.error('Alternative migration also failed:', altError);
        return false;
      }
    }
    
    logger.info('Successfully renamed timestamp to created_at in conversations table');
    return true;
  } catch (error) {
    logger.error('Error during conversations table migration:', error);
    return false;
  }
}

export default migrateConversationsTable; 