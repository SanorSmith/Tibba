#!/usr/bin/env ts-node

/**
 * TEST SUPABASE CONNECTION
 * Simple test to verify Supabase credentials and connection
 * 
 * Usage: npm run test:supabase
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n🔍 Testing Supabase Connection...');
console.log('=====================================');

// Check environment variables
console.log(`NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ SET' : '❌ NOT SET'}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${supabaseKey ? '✅ SET' : '❌ NOT SET'}`);

if (!supabaseUrl || !supabaseKey) {
  console.log('\n❌ Missing Supabase credentials');
  console.log('\nTo fix this, add the following to your .env.local file:');
  console.log('NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  console.log('\nYou can find these values in your Supabase project settings:');
  console.log('1. Go to https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Settings > API');
  console.log('4. Copy the Project URL and Service Role Key');
  process.exit(1);
}

// Test connection
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('\n🔌 Testing database connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(1);
    
    if (error) {
      console.log('❌ Database connection failed:', error.message);
      console.log('\nPossible causes:');
      console.log('- Invalid Supabase URL');
      console.log('- Invalid service role key');
      console.log('- Database not accessible');
      console.log('- Network connectivity issues');
      process.exit(1);
    }
    
    console.log('✅ Database connection successful!');
    
    if (data && data.length > 0) {
      console.log(`📊 Found organization: ${data[0].name}`);
    } else {
      console.log('📊 No organizations found (will create default during migration)');
    }
    
    // Test HR tables
    console.log('\n📋 Checking HR table structure...');
    
    const tables = ['departments', 'employees', 'attendance_records', 'leave_requests', 'payroll_transactions'];
    
    for (const table of tables) {
      try {
        const { count, error: tableError } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (tableError) {
          console.log(`❌ Table ${table}: ${tableError.message}`);
        } else {
          console.log(`✅ Table ${table}: ${count || 0} records`);
        }
      } catch (err: any) {
        console.log(`❌ Table ${table}: ${err.message}`);
      }
    }
    
    console.log('\n🎉 Supabase connection test completed successfully!');
    console.log('\nYou can now run:');
    console.log('  npm run migrate:hr      - To migrate HR data');
    console.log('  npm run validate:hr     - To validate migration');
    console.log('  npm run migrate:hr:rollback - To rollback migration');
    
  } catch (error: any) {
    console.log('💥 Connection test failed:', error.message);
    process.exit(1);
  }
}

testConnection();
