// Test the doctors API endpoint
const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

async function testDoctorsAPI() {
  try {
    console.log('🔍 Testing doctors API query...');
    
    const workspaceid = 'fa9fb036-a7eb-49af-890c-54406dad139d';
    
    // Fetch doctors from the staff table
    const doctors = await sql`
      SELECT 
        staffid as userid,
        CONCAT(firstname, ' ', COALESCE(middlename, ''), ' ', lastname) as name,
        email,
        unit,
        specialty,
        phone,
        role
      FROM staff
      WHERE role = 'doctor'
      AND workspaceid = ${workspaceid}
      ORDER BY firstname, lastname
    `;

    console.log(`\n📋 Found ${doctors.length} doctors in the database:\n`);
    
    doctors.forEach((doctor, index) => {
      console.log(`${index + 1}. ${doctor.name}`);
      console.log(`   Email: ${doctor.email || 'N/A'}`);
      console.log(`   Unit: ${doctor.unit || 'N/A'}`);
      console.log(`   Specialty: ${doctor.specialty || 'N/A'}`);
      console.log(`   Phone: ${doctor.phone || 'N/A'}`);
      console.log(`   ID: ${doctor.userid}`);
      console.log('');
    });

    console.log('✅ Doctors API test complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

testDoctorsAPI();
