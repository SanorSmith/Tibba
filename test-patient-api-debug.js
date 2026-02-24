// Test script to debug patient API 500 error
const postgres = require('postgres');

// Check environment variables
console.log('🔍 Environment Variables Check:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('NON_MEDICAL_DATABASE_URL:', process.env.NON_MEDICAL_DATABASE_URL ? 'SET' : 'NOT SET');
console.log('TEAMMATE_DATABASE_URL:', process.env.TEAMMATE_DATABASE_URL ? 'SET' : 'NOT SET');

// Use the same DATABASE_URL as the API
const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

console.log('\n🔗 Using database URL:', databaseUrl.substring(0, 50) + '...');

const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

async function testPatientAPI() {
  try {
    console.log('\n🔍 Testing database connection...');
    
    // Test basic connection
    const testQuery = await sql`SELECT NOW() as current_time`;
    console.log('✅ Database connection successful:', testQuery[0].current_time);
    
    // Check if patients table exists
    const tableCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'patients'
    `;
    
    if (tableCheck.length === 0) {
      console.log('❌ Patients table does not exist');
      
      // Check what tables do exist
      const tables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `;
      console.log('📋 Available tables:', tables.map(t => t.table_name));
      return;
    }
    
    console.log('✅ Patients table exists');
    
    // Check patients table structure
    const structure = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'patients'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    console.log('\n📋 Patients table structure:');
    structure.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
    });
    
    // Test inserting a sample patient (like the API does)
    const workspaceId = 'fa9fb036-a7eb-49af-890c-54406dad139d';
    const testPatientId = 'test-' + Date.now();
    
    console.log('\n🧪 Testing patient insertion...');
    
    const insertResult = await sql`
      INSERT INTO patients (
        patientid, firstname, lastname, dateofbirth, gender,
        phone, email, address, nationalid, medicalhistory,
        workspaceid, ehrid
      ) VALUES (
        ${testPatientId},
        ${'Test'},
        ${'Patient'},
        ${'2000-01-01'},
        ${'other'},
        ${'+1234567890'},
        ${'test@example.com'},
        ${'Test Address'},
        ${'123456789'},
        ${'Test medical history'},
        ${workspaceId},
        ${null}
      )
      RETURNING *
    `;
    
    console.log('✅ Test patient created:', insertResult[0].patientid);
    
    // Clean up test patient
    await sql`DELETE FROM patients WHERE patientid = ${testPatientId}`;
    console.log('🧹 Test patient cleaned up');
    
    console.log('\n✅ All tests passed! Patient API should work correctly.');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sql.end();
  }
}

testPatientAPI();
