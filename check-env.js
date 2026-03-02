#!/usr/bin/env node

/**
 * CHECK ENVIRONMENT VARIABLES
 * Shows what environment variables are actually loaded
 */

console.log('🔍 Checking Environment Variables...');
console.log('=====================================');

// List all environment variables that might be related to Supabase
const supabaseVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'DATABASE_URL',
  'TIBBNA_DATABASE_URL'
];

console.log('\n📋 Supabase-related Environment Variables:');
supabaseVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    // Show first few characters and length for security
    const display = value.length > 20 
      ? value.substring(0, 20) + '...' + value.substring(value.length - 5)
      : value;
    console.log(`✅ ${varName}: ${display} (${value.length} chars)`);
  } else {
    console.log(`❌ ${varName}: NOT SET`);
  }
});

console.log('\n📁 Current Working Directory:', process.cwd());
console.log('📄 Node Version:', process.version);

// Try to load .env.local manually if it exists
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  console.log('\n📄 .env.local file exists');
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    
    console.log('\n📝 Contents of .env.local:');
    lines.forEach((line, index) => {
      if (line.includes('SUPABASE') || line.includes('DATABASE')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=');
        if (value) {
          const display = value.length > 20 
            ? value.substring(0, 20) + '...' + value.substring(value.length - 5)
            : value;
          console.log(`   ${key}: ${display}`);
        } else {
          console.log(`   ${key}: [empty]`);
        }
      }
    });
  } catch (err) {
    console.log('❌ Error reading .env.local:', err.message);
  }
} else {
  console.log('\n❌ .env.local file does not exist');
}

console.log('\n🎯 Recommendation:');
console.log('Make sure your .env.local file contains:');
console.log('NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
console.log('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
