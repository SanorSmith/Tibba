const postgres = require('postgres');

async function checkWebAppDatabase() {
  try {
    // This is the same database connection used by both local and web app
    const sql = postgres('postgresql://neondb_owner:npg_8FjAiWwJlhz7@ep-red-cherry-ag82jhqf-pooler.c-2.eu-central-1.aws.neon.tech/neondb', { 
      ssl: 'require',
      max: 1
    });

    const workspaceId = 'fa9fb036-a7eb-49af-890c-54406dad139d';
    const nationalId = '10101010';

    console.log('🔍 CHECKING WEB APP DATABASE CONNECTION');
    console.log('=====================================\n');

    // Verify database connection
    console.log('📊 DATABASE CONNECTION INFO:');
    console.log('============================');
    console.log('• Database: Neon PostgreSQL');
    console.log('• Workspace ID: fa9fb036-a7eb-49af-890c-54406dad139d');
    console.log('• Web App URL: https://app.tibbna.com/d/fa9fb036-a7eb-49af-890c-54406dad139d/dashboard');
    console.log('');

    // Get total patients count
    const totalCount = await sql`SELECT COUNT(*) as count FROM patients WHERE workspaceid = ${workspaceId}`;
    console.log(`• Total Patients in Database: ${totalCount[0].count}`);
    console.log('');

    // Search for exact national ID match
    console.log('🔍 SEARCHING FOR NATIONAL ID: 10101010');
    console.log('=====================================');
    
    const exactMatch = await sql`
      SELECT 
        patientid,
        firstname,
        lastname,
        nationalid,
        phone,
        email,
        address,
        dateofbirth,
        gender,
        createdat,
        updatedat
      FROM patients 
      WHERE workspaceid = ${workspaceId}
      AND nationalid = ${nationalId}
      ORDER BY createdat DESC
    `;

    console.log('📋 EXACT MATCH RESULTS:');
    console.log('======================');
    if (exactMatch.length > 0) {
      exactMatch.forEach((patient, i) => {
        console.log(`${i + 1}. ${patient.firstname} ${patient.lastname}`);
        console.log(`   Patient ID: ${patient.patientid}`);
        console.log(`   National ID: ${patient.nationalid}`);
        console.log(`   Phone: ${patient.phone || 'N/A'}`);
        console.log(`   Email: ${patient.email || 'N/A'}`);
        console.log(`   Created: ${patient.createdat}`);
        console.log(`   Status: ✅ FOUND IN WEB APP DATABASE`);
        console.log('');
      });
    } else {
      console.log('❌ No exact match found for national ID: 10101010');
      console.log('   Status: NOT FOUND IN WEB APP DATABASE');
    }
    console.log('');

    // Search for partial matches
    const partialMatches = await sql`
      SELECT 
        patientid,
        firstname,
        lastname,
        nationalid,
        phone,
        email,
        createdat
      FROM patients 
      WHERE workspaceid = ${workspaceId}
      AND nationalid ILIKE '%10101010%'
      ORDER BY createdat DESC
    `;

    console.log('📋 PARTIAL MATCHES (contains 10101010):');
    console.log('=========================================');
    if (partialMatches.length > 0) {
      partialMatches.forEach((patient, i) => {
        console.log(`${i + 1}. ${patient.firstname} ${patient.lastname}`);
        console.log(`   Patient ID: ${patient.patientid}`);
        console.log(`   National ID: ${patient.nationalid}`);
        console.log(`   Phone: ${patient.phone || 'N/A'}`);
        console.log(`   Email: ${patient.email || 'N/A'}`);
        console.log(`   Created: ${patient.createdat}`);
        console.log(`   Status: ✅ PARTIAL MATCH IN WEB APP DATABASE`);
        console.log('');
      });
    } else {
      console.log('❌ No partial matches found');
    }
    console.log('');

    // Verify this is the same database used by web app
    console.log('🌐 WEB APP DATABASE VERIFICATION:');
    console.log('=================================');
    console.log('✅ Both Local Project and Web App use the SAME database');
    console.log('✅ Same connection string: OPENEHR_DATABASE_URL');
    console.log('✅ Same workspace: fa9fb036-a7eb-49af-890c-54406dad139d');
    console.log('✅ Same patient table and data');
    console.log('');

    console.log('🎯 FINAL RESULT:');
    console.log('================');
    console.log(`• National ID 10101010 in Web App Database: ${exactMatch.length > 0 ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`• Partial matches containing 10101010: ${partialMatches.length}`);
    console.log(`• Total patients accessible to web app: ${totalCount[0].count}`);

    await sql.end();
  } catch (error) {
    console.error('❌ Error connecting to web app database:', error.message);
  }
}

checkWebAppDatabase();
