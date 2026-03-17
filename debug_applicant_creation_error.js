console.log('🔍 Debugging Applicant Creation 500 Error...');
console.log('='.repeat(50));

console.log('\n❌ Error Details:');
console.log('• POST http://localhost:3000/api/hr/recruitment 500');
console.log('• Location: page.tsx:64 handleSubmit');
console.log('• Error: Internal Server Error');

console.log('\n🔍 Possible Causes:');
console.log('1. Database connection issue');
console.log('2. SQL query error in candidate creation');
console.log('3. Missing required fields in database');
console.log('4. Foreign key constraint violation');
console.log('5. Data type mismatch');

console.log('\n🔍 Debug Steps:');

console.log('1. Check API endpoint:');
console.log('   • File: src/app/api/hr/recruitment/route.ts');
console.log('   • Method: POST');
console.log('   • Type: candidate creation');

console.log('\n2. Check Database Tables:');
console.log('   • job_candidates table structure');
console.log('   • Required columns exist');
console.log('   • Data types match');

console.log('\n3. Check Form Data:');
console.log('   • All required fields present');
console.log('   • Data types are correct');
console.log('   • Foreign key ID exists');

console.log('\n🔧 Let me check the API endpoint and database structure...');

// Test the API endpoint directly
const testAPI = async () => {
  try {
    console.log('\n📡 Testing API Endpoint...');
    
    const testData = {
      type: 'candidate',
      data: {
        candidate_number: 'CAND-2026-999',
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        phone: '+964-770-200-0001',
        gender: 'MALE',
        nationality: 'Iraqi',
        education: 'BACHELOR',
        university: 'Test University',
        specialization: 'Test Field',
        experience_years: '5',
        current_employer: 'Test Company',
        expected_salary: '2500000',
        source: 'WEBSITE',
        referral_employee: '',
        vacancy_id: 'd4781355-1013-4f6b-bc14-dac93d345289',
        status: 'NEW'
      }
    };
    
    console.log('📋 Test Data:', JSON.stringify(testData, null, 2));
    
    const response = await fetch('http://localhost:3000/api/hr/recruitment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Data:', await response.text());
    
  } catch (error) {
    console.error('❌ API Test Error:', error.message);
  }
};

// Test database table structure
const testDatabase = async () => {
  try {
    console.log('\n🗄 Testing Database Structure...');
    
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
    });
    
    const client = await pool.connect();
    
    try {
      // Check job_candidates table structure
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'job_candidates' 
        ORDER BY ordinal_position
      `);
      
      console.log('📋 job_candidates Table Columns:');
      columnsResult.rows.forEach((col, i) => {
        console.log(`   ${i+1}. ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable}`);
      });
      
      // Check if table has data
      const countResult = await client.query('SELECT COUNT(*) as count FROM job_candidates');
      console.log(`📊 Current Records: ${countResult.rows[0].count}`);
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Database Test Error:', error.message);
  }
};

// Run tests
const runTests = async () => {
  await testAPI();
  await testDatabase();
};

runTests();
