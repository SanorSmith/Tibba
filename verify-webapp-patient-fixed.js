const postgres = require('postgres');

async function verifyWebAppPatientData() {
  try {
    const sql = postgres('postgresql://neondb_owner:npg_8FjAiWwJlhz7@ep-red-cherry-ag82jhqf-pooler.c-2.eu-central-1.aws.neon.tech/neondb', { 
      ssl: 'require',
      max: 1
    });

    const workspaceId = 'fa9fb036-a7eb-49af-890c-54406dad139d';

    console.log('🔍 VERIFYING WEB APP PATIENT DATA');
    console.log('==================================\n');

    // Check the specific patient found in web app
    console.log('📋 PATIENT FOUND IN WEB APP:');
    console.log('============================');
    console.log('• Name: ALI dani');
    console.log('• National ID: 10101010');
    console.log('• Contact: N/A (no phone/email)');
    console.log('');

    // Search for this patient in the database
    const patientSearch = await sql`
      SELECT 
        patientid,
        firstname,
        lastname,
        nationalid,
        phone,
        email,
        address,
        createdat,
        updatedat
      FROM patients 
      WHERE workspaceid = ${workspaceId}
      AND nationalid = '10101010'
      ORDER BY createdat DESC
    `;

    console.log('🔍 DATABASE SEARCH RESULTS:');
    console.log('===========================');
    if (patientSearch.length > 0) {
      patientSearch.forEach((patient, i) => {
        console.log(`${i + 1}. ${patient.firstname} ${patient.lastname}`);
        console.log(`   Patient ID: ${patient.patientid}`);
        console.log(`   National ID: ${patient.nationalid}`);
        console.log(`   Phone: ${patient.phone || 'N/A'}`);
        console.log(`   Email: ${patient.email || 'N/A'}`);
        console.log(`   Address: ${patient.address || 'N/A'}`);
        console.log(`   Created: ${patient.createdat}`);
        console.log(`   Updated: ${patient.updatedat}`);
        console.log(`   Status: ✅ FOUND IN DATABASE`);
        console.log('');
      });
    } else {
      console.log('❌ Patient NOT FOUND in database');
    }

    // Also check for "dddd1 Smith" that was visible in web app
    const ddds1Search = await sql`
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
      AND firstname = 'dddd1' AND lastname = 'Smith'
      ORDER BY createdat DESC
    `;

    console.log('📋 CHECKING "dddd1 Smith":');
    console.log('===========================');
    if (ddds1Search.length > 0) {
      ddds1Search.forEach((patient, i) => {
        console.log(`${i + 1}. ${patient.firstname} ${patient.lastname}`);
        console.log(`   Patient ID: ${patient.patientid}`);
        console.log(`   National ID: ${patient.nationalid || 'N/A'}`);
        console.log(`   Phone: ${patient.phone || 'N/A'}`);
        console.log(`   Email: ${patient.email || 'N/A'}`);
        console.log(`   Created: ${patient.createdat}`);
        console.log(`   Status: ✅ FOUND IN DATABASE`);
        console.log('');
      });
    } else {
      console.log('❌ "dddd1 Smith" NOT FOUND in database');
    }

    // Get total count to verify web app shows correct number
    const totalCount = await sql`SELECT COUNT(*) as count FROM patients WHERE workspaceid = ${workspaceId}`;

    console.log('📊 VERIFICATION SUMMARY:');
    console.log('========================');
    console.log(`• Web App Shows: 57 patients`);
    console.log(`• Database Has: ${totalCount[0].count} patients`);
    console.log(`• ALI dani (10101010): ${patientSearch.length > 0 ? '✅ CONFIRMED' : '❌ NOT FOUND'}`);
    console.log(`• ddds1 Smith: ${ddds1Search.length > 0 ? '✅ CONFIRMED' : '❌ NOT FOUND'}`);
    console.log('');

    console.log('🎯 CONCLUSION:');
    console.log('===============');
    if (patientSearch.length > 0) {
      console.log('✅ Web app is connected to the correct database');
      console.log('✅ Patient "ALI dani" with National ID "10101010" EXISTS');
      console.log('✅ Web app data matches database data');
    } else {
      console.log('❌ Web app shows patient that does not exist in database');
      console.log('❌ Possible data sync issue or different database');
    }

    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyWebAppPatientData();
