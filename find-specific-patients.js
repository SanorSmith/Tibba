const postgres = require('postgres');

async function findSpecificPatients() {
  try {
    const sql = postgres('postgresql://neondb_owner:npg_8FjAiWwJlhz7@ep-red-cherry-ag82jhqf-pooler.c-2.eu-central-1.aws.neon.tech/neondb', { 
      ssl: 'require',
      max: 1
    });

    const workspaceId = 'fa9fb036-a7eb-49af-890c-54406dad139d';

    console.log('🔍 Searching for Specific Patients');
    console.log('===============================\n');

    // Search for "ALLI MMMMM"
    const searchAlli = await sql`
      SELECT 
        patientid,
        firstname,
        lastname,
        phone,
        email,
        address,
        createdat,
        updatedat
      FROM patients 
      WHERE workspaceid = ${workspaceId}
      AND (firstname ILIKE '%ALLI%' OR lastname ILIKE '%ALLI%')
      ORDER BY createdat DESC
    `;

    console.log('📋 Patients with "ALLI" in name:');
    console.log('===============================');
    if (searchAlli.length > 0) {
      searchAlli.forEach((patient, i) => {
        console.log(`${i + 1}. ${patient.firstname} ${patient.lastname}`);
        console.log(`   ID: ${patient.patientid}`);
        console.log(`   Phone: ${patient.phone || 'N/A'}`);
        console.log(`   Email: ${patient.email || 'N/A'}`);
        console.log(`   Address: ${patient.address || 'N/A'}`);
        console.log(`   Created: ${patient.createdat}`);
        console.log(`   Updated: ${patient.updatedat}`);
        console.log('');
      });
    } else {
      console.log('❌ No patients found with "ALLI" in name');
    }
    console.log('');

    // Search for "dds"
    const searchDds = await sql`
      SELECT 
        patientid,
        firstname,
        lastname,
        phone,
        email,
        address,
        createdat,
        updatedat
      FROM patients 
      WHERE workspaceid = ${workspaceId}
      AND (firstname ILIKE '%dds%' OR lastname ILIKE '%dds%')
      ORDER BY createdat DESC
    `;

    console.log('📋 Patients with "dds" in name:');
    console.log('===============================');
    if (searchDds.length > 0) {
      searchDds.forEach((patient, i) => {
        console.log(`${i + 1}. ${patient.firstname} ${patient.lastname}`);
        console.log(`   ID: ${patient.patientid}`);
        console.log(`   Phone: ${patient.phone || 'N/A'}`);
        console.log(`   Email: ${patient.email || 'N/A'}`);
        console.log(`   Address: ${patient.address || 'N/A'}`);
        console.log(`   Created: ${patient.createdat}`);
        console.log(`   Updated: ${patient.updatedat}`);
        console.log('');
      });
    } else {
      console.log('❌ No patients found with "dds" in name');
    }
    console.log('');

    // Search for "MMMMMM"
    const searchMmmmm = await sql`
      SELECT 
        patientid,
        firstname,
        lastname,
        phone,
        email,
        address,
        createdat,
        updatedat
      FROM patients 
      WHERE workspaceid = ${workspaceId}
      AND (firstname ILIKE '%MMMMMM%' OR lastname ILIKE '%MMMMMM%')
      ORDER BY createdat DESC
    `;

    console.log('📋 Patients with "MMMMMM" in name:');
    console.log('===============================');
    if (searchMmmmm.length > 0) {
      searchMmmmm.forEach((patient, i) => {
        console.log(`${i + 1}. ${patient.firstname} ${patient.lastname}`);
        console.log(`   ID: ${patient.patientid}`);
        console.log(`   Phone: ${patient.phone || 'N/A'}`);
        console.log(`   Email: ${patient.email || 'N/A'}`);
        console.log(`   Address: ${patient.address || 'N/A'}`);
        console.log(`   Created: ${patient.createdat}`);
        console.log(`   Updated: ${patient.updatedat}`);
        console.log('');
      });
    } else {
      console.log('❌ No patients found with "MMMMMM" in name');
    }
    console.log('');

    // Search for exact combination "ALLI MMMMM"
    const searchExact = await sql`
      SELECT 
        patientid,
        firstname,
        lastname,
        phone,
        email,
        address,
        createdat,
        updatedat
      FROM patients 
      WHERE workspaceid = ${workspaceId}
      AND (
        (firstname = 'ALLI' AND lastname = 'MMMMMM') OR
        (firstname = 'MMMMMM' AND lastname = 'ALLI')
      )
      ORDER BY createdat DESC
    `;

    console.log('📋 Exact match for "ALLI MMMMM":');
    console.log('===============================');
    if (searchExact.length > 0) {
      searchExact.forEach((patient, i) => {
        console.log(`${i + 1}. ${patient.firstname} ${patient.lastname}`);
        console.log(`   ID: ${patient.patientid}`);
        console.log(`   Phone: ${patient.phone || 'N/A'}`);
        console.log(`   Email: ${patient.email || 'N/A'}`);
        console.log(`   Address: ${patient.address || 'N/A'}`);
        console.log(`   Created: ${patient.createdat}`);
        console.log(`   Updated: ${patient.updatedat}`);
        console.log('');
      });
    } else {
      console.log('❌ No exact match found for "ALLI MMMMM"');
    }

    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

findSpecificPatients();
