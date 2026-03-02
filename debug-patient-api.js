#!/usr/bin/env node

/**
 * DEBUG SCRIPT FOR PATIENT API
 * Tests the database connection and API endpoint
 */

const https = require('https');
const http = require('http');

console.log('🔍 DEBUGGING PATIENT API ISSUE');
console.log('==================================');

// Test patient data
const testPatient = {
  first_name_ar: 'أحمد',
  last_name_ar: 'محمد',
  date_of_birth: '1990-01-01',
  gender: 'MALE',
  phone: '+9647701234567',
  email: 'test@example.com',
  governorate: 'بغداد',
  national_id: '1234567890',
  medical_history: 'No known allergies'
};

console.log('📝 Test patient data:', JSON.stringify(testPatient, null, 2));

// Function to make HTTP request
function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test the API endpoint
async function testPatientAPI() {
  try {
    console.log('\n🌐 Testing POST /api/tibbna-openehr-patients...');
    
    const response = await makeRequest('http://localhost:3001/api/tibbna-openehr-patients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    }, testPatient);

    console.log(`📊 Status Code: ${response.statusCode}`);
    console.log('📄 Response Headers:', JSON.stringify(response.headers, null, 2));
    
    try {
      const responseJson = JSON.parse(response.body);
      console.log('📋 Response Body:', JSON.stringify(responseJson, null, 2));
    } catch (e) {
      console.log('📄 Raw Response Body:', response.body);
    }

  } catch (error) {
    console.error('❌ Request failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the Next.js dev server is running on http://localhost:3001');
      console.log('💡 Run: npm run dev');
    }
  }
}

// Test database connection directly
async function testDatabaseConnection() {
  console.log('\n🗄️ Testing database connection...');
  
  try {
    // Import postgres
    const postgres = require('postgres');
    
    // Database URL from the API file
    const nonMedicalDatabaseUrl = process.env.TIBBNA_DATABASE_URL || 
                                 process.env.DATABASE_URL || 
                                 "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
    
    console.log('🔗 Database URL:', nonMedicalDatabaseUrl ? 'SET' : 'NOT SET');
    
    if (!nonMedicalDatabaseUrl) {
      console.log('❌ Database URL not found in environment variables');
      return;
    }
    
    const sql = postgres(nonMedicalDatabaseUrl, { 
      ssl: 'require',
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10
    });
    
    console.log('🔌 Connecting to database...');
    
    // Test connection with a simple query
    const result = await sql`SELECT NOW() as current_time, version() as db_version`;
    
    console.log('✅ Database connection successful!');
    console.log('📊 Current time:', result[0].current_time);
    console.log('📊 Database version:', result[0].db_version);
    
    // Check if patients table exists
    try {
      const tableCheck = await sql`
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'patients' 
        ORDER BY ordinal_position
      `;
      
      if (tableCheck.length > 0) {
        console.log('✅ Patients table exists with columns:');
        tableCheck.forEach(col => {
          console.log(`  - ${col.column_name} (${col.data_type})`);
        });
      } else {
        console.log('❌ Patients table not found');
      }
    } catch (e) {
      console.log('❌ Error checking patients table:', e.message);
    }
    
    // Test inserting a patient
    console.log('\n📝 Testing patient insertion...');
    const testId = 'test-' + Date.now();
    
    const insertResult = await sql`
      INSERT INTO patients (
        patientid, firstname, lastname, dateofbirth, gender,
        phone, email, address, nationalid, medicalhistory,
        workspaceid, ehrid
      ) VALUES (
        ${testId},
        ${testPatient.first_name_ar},
        ${testPatient.last_name_ar},
        ${testPatient.date_of_birth},
        ${testPatient.gender},
        ${testPatient.phone},
        ${testPatient.email},
        ${testPatient.governorate},
        ${testPatient.national_id},
        ${testPatient.medical_history},
        ${'fa9fb036-a7eb-49af-890c-54406dad139d'},
        ${null}
      )
      RETURNING *
    `;
    
    console.log('✅ Test patient inserted successfully!');
    console.log('📋 Inserted patient:', JSON.stringify(insertResult[0], null, 2));
    
    // Clean up test data
    await sql`DELETE FROM patients WHERE patientid = ${testId}`;
    console.log('🧹 Test data cleaned up');
    
    await sql.end();
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('🔍 Full error:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Database connection refused - check URL and credentials');
    } else if (error.code === '3D000') {
      console.log('💡 Database does not exist');
    } else if (error.code === '28P01') {
      console.log('💡 Authentication failed - check username/password');
    }
  }
}

// Check environment variables
function checkEnvironment() {
  console.log('\n🔧 Checking environment variables...');
  
  const vars = [
    'TIBBNA_DATABASE_URL',
    'DATABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  vars.forEach(varName => {
    const value = process.env[varName];
    console.log(`${value ? '✅' : '❌'} ${varName}: ${value ? 'SET' : 'NOT SET'}`);
  });
}

// Main execution
async function main() {
  checkEnvironment();
  await testDatabaseConnection();
  await testPatientAPI();
  
  console.log('\n🎯 DEBUG COMPLETE');
  console.log('==================');
  console.log('If you see errors above, fix them before trying to save patients.');
}

main().catch(console.error);
