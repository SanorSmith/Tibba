// Test script to verify appointments table exists in the shared database
const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

async function testConnection() {
  try {
    console.log('🔍 Testing connection to database...');
    
    // Test 1: Check if appointments table exists
    console.log('\n📋 Checking if appointments table exists...');
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'appointments'
      );
    `;
    console.log('Appointments table exists:', tableCheck[0].exists);
    
    if (tableCheck[0].exists) {
      // Test 2: Get table structure
      console.log('\n📊 Getting appointments table structure...');
      const columns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'appointments'
        ORDER BY ordinal_position;
      `;
      console.log('Columns:', columns);
      
      // Test 3: Count appointments
      console.log('\n🔢 Counting appointments...');
      const count = await sql`SELECT COUNT(*) FROM appointments`;
      console.log('Total appointments:', count[0].count);
      
      // Test 4: Get sample appointments with workspace filter
      console.log('\n📝 Getting sample appointments for workspace fa9fb036-a7eb-49af-890c-54406dad139d...');
      const workspaceid = 'fa9fb036-a7eb-49af-890c-54406dad139d';
      const appointments = await sql`
        SELECT a.*, p.firstname, p.lastname
        FROM appointments a
        LEFT JOIN patients p ON a.patientid = p.patientid
        WHERE a.workspaceid = ${workspaceid}
        ORDER BY a.starttime DESC
        LIMIT 5
      `;
      console.log('Sample appointments:', appointments);
      
      // Test 5: Check if patients table exists
      console.log('\n👥 Checking if patients table exists...');
      const patientsCheck = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'patients'
        );
      `;
      console.log('Patients table exists:', patientsCheck[0].exists);
      
      if (patientsCheck[0].exists) {
        const patientCount = await sql`SELECT COUNT(*) FROM patients WHERE workspaceid = ${workspaceid}`;
        console.log('Total patients in workspace:', patientCount[0].count);
      }
    } else {
      console.log('\n❌ Appointments table does NOT exist in this database!');
      console.log('This means you need to either:');
      console.log('1. Run the migration to create the table, OR');
      console.log('2. Use a different DATABASE_URL that has the appointments table');
    }
    
    console.log('\n✅ Connection test complete!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await sql.end();
  }
}

testConnection();
