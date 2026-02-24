const postgres = require('postgres');

async function findDdds1Smith() {
  try {
    const sql = postgres('postgresql://neondb_owner:npg_8FjAiWwJlhz7@ep-red-cherry-ag82jhqf-pooler.c-2.eu-central-1.aws.neon.tech/neondb', { 
      ssl: 'require',
      max: 1
    });

    const workspaceId = 'fa9fb036-a7eb-49af-890c-54406dad139d';

    console.log('🔍 Searching for "dddd1 Smith"');
    console.log('===============================\n');

    // Search for exact "dddd1 Smith"
    const exactMatch = await sql`
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
      AND (firstname = 'dddd1' AND lastname = 'Smith')
      ORDER BY createdat DESC
    `;

    console.log('📋 EXACT MATCH RESULTS:');
    console.log('======================');
    if (exactMatch.length > 0) {
      exactMatch.forEach((patient, i) => {
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
      console.log('❌ No exact match found for "dddd1 Smith"');
    }
    console.log('');

    // Search for variations
    const variations = await sql`
      SELECT 
        patientid,
        firstname,
        lastname,
        phone,
        email,
        createdat
      FROM patients 
      WHERE workspaceid = ${workspaceId}
      AND (
        firstname ILIKE '%dddd1%' OR
        firstname ILIKE '%ddd%' OR
        (firstname ILIKE '%dds%' AND lastname = 'Smith')
      )
      ORDER BY createdat DESC
    `;

    console.log('📋 SIMILAR MATCHES:');
    console.log('===================');
    if (variations.length > 0) {
      variations.forEach((patient, i) => {
        console.log(`${i + 1}. ${patient.firstname} ${patient.lastname}`);
        console.log(`   ID: ${patient.patientid}`);
        console.log(`   Phone: ${patient.phone || 'N/A'}`);
        console.log(`   Email: ${patient.email || 'N/A'}`);
        console.log(`   Created: ${patient.createdat}`);
        console.log('');
      });
    } else {
      console.log('❌ No similar matches found');
    }
    console.log('');

    // Check if "dds Smith" exists (we found this before)
    const ddsSmith = await sql`
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
      AND firstname = 'dds' AND lastname = 'Smith'
      ORDER BY createdat DESC
    `;

    console.log('📋 CONFIRMED "dds Smith":');
    console.log('========================');
    if (ddsSmith.length > 0) {
      ddsSmith.forEach((patient, i) => {
        console.log(`${i + 1}. ${patient.firstname} ${patient.lastname}`);
        console.log(`   ID: ${patient.patientid}`);
        console.log(`   Phone: ${patient.phone || 'N/A'}`);
        console.log(`   Email: ${patient.email || 'N/A'}`);
        console.log(`   Address: ${patient.address || 'N/A'}`);
        console.log(`   Created: ${patient.createdat}`);
        console.log(`   Updated: ${patient.updatedat}`);
        console.log(`   Status: ✅ EXISTS IN DATABASE`);
        console.log('');
      });
    }

    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

findDdds1Smith();
