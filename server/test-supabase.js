import { supabase } from './config/index.js';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

console.log('Testing Supabase connectivity');
console.log('----------------------------');
console.log('Supabase URL:', process.env.SUPABASE_URL);
console.log('Supabase Key available:', !!process.env.SUPABASE_KEY);
console.log('Supabase Service Role Key available:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('Supabase client initialized:', !!supabase);

async function testSupabase() {
  if (!supabase) {
    console.error('Supabase client is not initialized. Check your environment variables.');
    return;
  }

  console.log('\nTesting Supabase connection...');
  
  try {
    console.log('\nTesting simple query:');
    const startTime = Date.now();
    const { data: testData, error: testError } = await supabase
      .from('_test_connection')
      .select('*')
      .limit(1)
      .maybeSingle();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (testError) {
      if (testError.code === 'PGRST104') {
        console.log('✅ Supabase connection working (table not found but connection successful)');
        console.log(`   Response time: ${duration}s`);
      } else {
        console.error('❌ Supabase error on simple query:', testError);
      }
    } else {
      console.log('✅ Supabase connection working');
      console.log(`   Response time: ${duration}s`);
      console.log('   Data:', testData);
    }
    
    // Test authentication
    console.log('\nTesting auth functionality:');
    const authStartTime = Date.now();
    const { data: authData, error: authError } = await supabase.auth.getSession();
    const authDuration = ((Date.now() - authStartTime) / 1000).toFixed(2);
    
    if (authError) {
      console.error('❌ Auth error:', authError);
    } else {
      console.log('✅ Auth functionality working');
      console.log(`   Response time: ${authDuration}s`);
      console.log('   Session present:', !!authData?.session);
    }

    // List all tables
    console.log('\nListing tables in database:');
    const { data: tableList, error: tableError } = await supabase
      .from('pg_tables')
      .select('schemaname, tablename')
      .eq('schemaname', 'public');
    
    if (tableError) {
      console.error('❌ Error listing tables:', tableError);
    } else {
      console.log('✅ Tables found:', tableList.length);
      console.log('   Tables:', tableList.map(t => t.tablename).join(', '));
    }
    
    // Testing conversations table as fallback
    console.log('\nTesting conversations table:');
    const convoStartTime = Date.now();
    const { data: convoData, error: convoError } = await supabase
      .from('conversations')
      .select('*')
      .limit(1);
    
    const convoDuration = ((Date.now() - convoStartTime) / 1000).toFixed(2);
    
    if (convoError) {
      console.error('❌ Error querying conversations:', convoError);
    } else {
      console.log('✅ conversations table accessible');
      console.log(`   Response time: ${convoDuration}s`);
      console.log('   Records found:', convoData.length);
      
      if (convoData.length > 0) {
        // Display column names from the first record
        console.log('   Table structure (columns):', Object.keys(convoData[0]).join(', '));
        // Display a sample record
        console.log('   Sample record:');
        for (const [key, value] of Object.entries(convoData[0])) {
          // Trim long values for readability
          const displayValue = typeof value === 'string' && value.length > 100 
            ? value.substring(0, 100) + '...' 
            : value;
          console.log(`     ${key}: ${displayValue}`);
        }
      }
    }
    
    // Now check for conversation_history table to see if it exists
    console.log('\nTesting conversation_history table:');
    const historyStartTime = Date.now();
    const { data: historyData, error: historyError } = await supabase
      .from('conversation_history')
      .select('id')
      .limit(1);
    
    const historyDuration = ((Date.now() - historyStartTime) / 1000).toFixed(2);
    
    if (historyError) {
      if (historyError.code === '42P01') {
        console.log('❌ conversation_history table does not exist');
        console.log('   Error message:', historyError.message);
      } else {
        console.error('❌ Error querying conversation_history:', historyError);
      }
    } else {
      console.log('✅ conversation_history table accessible');
      console.log(`   Response time: ${historyDuration}s`);
      console.log('   Records found:', historyData.length);
    }
    
    // Test inserting into conversations table
    console.log('\nTesting insert into conversations table:');
    
    // Use the user_id from our sample record to satisfy the foreign key constraint
    const existingUserId = convoData.length > 0 ? convoData[0].user_id : null;
    
    if (!existingUserId) {
      console.log('❌ Cannot test insert - no existing user ID found in sample record');
    } else {
      console.log(`Using existing user ID for test: ${existingUserId}`);
      
      const testMessage = {
        message: 'Test message from test script ' + new Date().toISOString(),
        source: 'assistant',
        user_id: existingUserId,
        conversation_id: 'test_conversation_' + Date.now(),
        timestamp: new Date().toISOString(),
        metadata: { test: true, from: 'test-script' }
      };
      
      // Ensure proper headers are set
      console.log('Setting explicit headers for Supabase request');
      
      // Create a new supabase client with explicit headers just for this operation
      const supabaseWithHeaders = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY,
        {
          global: {
            headers: {
              'apikey': process.env.SUPABASE_KEY,
              'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            }
          }
        }
      );
      
      const insertStartTime = Date.now();
      const { data: insertData, error: insertError } = await supabaseWithHeaders
        .from('conversations')
        .insert(testMessage)
        .select();
      
      const insertDuration = ((Date.now() - insertStartTime) / 1000).toFixed(2);
      
      if (insertError) {
        console.error('❌ Error inserting test message:', insertError);
      } else {
        console.log('✅ Successfully inserted test message');
        console.log(`   Response time: ${insertDuration}s`);
        console.log('   Inserted record ID:', insertData[0].id);
        
        // Clean up - delete the test message
        console.log('\nCleaning up test message:');
        const { error: deleteError } = await supabaseWithHeaders
          .from('conversations')
          .delete()
          .eq('id', insertData[0].id);
        
        if (deleteError) {
          console.error('❌ Error deleting test message:', deleteError);
        } else {
          console.log('✅ Successfully deleted test message');
        }
      }
    }
  } catch (error) {
    console.error('❌ Unexpected error during Supabase test:', error);
  }
}

testSupabase().catch(console.error).finally(() => {
  console.log('\nTest completed');
}); 