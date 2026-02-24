// Test the new patient search API
const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

async function testPatientSearch() {
  try {
    console.log('🔍 Testing patient search in Neon database...');
    
    // Test search for "Red"
    console.log('\n📋 Searching for "Red":');
    const searchRed = await sql`
      SELECT 
        patientid,
        firstname,
        middlename,
        lastname,
        nationalid,
        phone,
        email
      FROM patients
      WHERE 
        LOWER(firstname) LIKE LOWER(${'%red%'})
        OR LOWER(lastname) LIKE LOWER(${'%red%'})
        OR LOWER(nationalid) LIKE LOWER(${'%red%'})
        OR LOWER(phone) LIKE LOWER(${'%red%'})
      ORDER BY 
        firstname ASC,
        lastname ASC
      LIMIT 20
    `;
    
    console.log(`Found ${searchRed.length} patients matching "Red":`);
    searchRed.forEach((patient, index) => {
      console.log(`${index + 1}. ${patient.firstname} ${patient.middlename || ''} ${patient.lastname} - ID: ${patient.nationalid || 'No ID'}`);
    });
    
    // Test search for "Saif"
    console.log('\n📋 Searching for "Saif":');
    const searchSaif = await sql`
      SELECT 
        patientid,
        firstname,
        middlename,
        lastname,
        nationalid,
        phone,
        email
      FROM patients
      WHERE 
        LOWER(firstname) LIKE LOWER(${'%saif%'})
        OR LOWER(lastname) LIKE LOWER(${'%saif%'})
        OR LOWER(nationalid) LIKE LOWER(${'%saif%'})
        OR LOWER(phone) LIKE LOWER(${'%saif%'})
      ORDER BY 
        firstname ASC,
        lastname ASC
      LIMIT 20
    `;
    
    console.log(`Found ${searchSaif.length} patients matching "Saif":`);
    searchSaif.forEach((patient, index) => {
      console.log(`${index + 1}. ${patient.firstname} ${patient.middlename || ''} ${patient.lastname} - ID: ${patient.nationalid || 'No ID'}`);
    });
    
    // Test empty search (should return all patients)
    console.log('\n📋 Total patients in database:');
    const allPatients = await sql`
      SELECT COUNT(*) as count
      FROM patients
    `;
    console.log(`Total patients: ${allPatients[0].count}`);
    
    console.log('\n✅ Patient search test complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

testPatientSearch();
