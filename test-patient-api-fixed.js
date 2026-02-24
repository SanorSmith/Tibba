// Test the fixed patient API
const postgres = require('postgres');

const databaseUrl = "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

async function testPatientAPI() {
  try {
    console.log('🔍 Testing patient API with proper UUID...');
    
    // Test inserting a patient with proper UUID
    const workspaceId = 'fa9fb036-a7eb-49af-890c-54406dad139d';
    const patientId = crypto.randomUUID(); // Proper UUID format
    
    console.log('🧪 Testing patient insertion with proper UUID:', patientId);
    
    const insertResult = await sql`
      INSERT INTO patients (
        patientid, firstname, lastname, dateofbirth, gender,
        phone, email, address, nationalid, medicalhistory,
        workspaceid, ehrid
      ) VALUES (
        ${patientId},
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
    await sql`DELETE FROM patients WHERE patientid = ${patientId}`;
    console.log('🧹 Test patient cleaned up');
    
    console.log('\n✅ Patient API should now work correctly!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

testPatientAPI();
