#!/usr/bin/env node

/**
 * TEST SUPABASE CONNECTION - FIXED VERSION
 * Loads .env.local and tests Supabase connection
 * 
 * Usage: npm run test:supabase:fixed
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ============================================================================
// LOAD ENVIRONMENT VARIABLES
// ============================================================================

// Load .env.local manually
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=');
      if (key && value) {
        // Remove quotes if present
        const cleanValue = value.replace(/^["']|["']$/g, '');
        process.env[key] = cleanValue;
      }
    }
  });
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n🔍 Testing Supabase Connection (Fixed Version)...');
console.log('==================================================');

// Check environment variables
console.log(`NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ SET' : '❌ NOT SET'}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${supabaseKey ? '✅ SET' : '❌ NOT SET'}`);

if (!supabaseUrl || !supabaseKey) {
  console.log('\n❌ Still missing Supabase credentials after loading .env.local');
  
  // Show what we found
  console.log('\n📋 Available Supabase vars in .env.local:');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  lines.forEach(line => {
    if (line.includes('SUPABASE') && line.includes('=')) {
      const [key] = line.split('=');
      console.log(`   - ${key}`);
    }
  });
  
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
      } catch (err) {
        console.log(`❌ Table ${table}: ${err.message}`);
      }
    }
    
    console.log('\n🎉 Supabase connection test completed successfully!');
    console.log('\nYou can now run:');
    console.log('  npm run migrate:hr      - To migrate HR data');
    console.log('  npm run validate:hr     - To validate migration');
    console.log('  npm run migrate:hr:rollback - To rollback migration');
    
  } catch (error) {
    console.log('💥 Connection test failed:', error.message);
    process.exit(1);
  }
}

testConnection();
