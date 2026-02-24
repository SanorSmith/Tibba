const postgres = require('postgres');

async function findByNationalId() {
  try {
    const sql = postgres('postgresql://neondb_owner:npg_8FjAiWwJlhz7@ep-red-cherry-ag82jhqf-pooler.c-2.eu-central-1.aws.neon.tech/neondb', { 
      ssl: 'require',
      max: 1
    });

    const workspaceId = 'fa9fb036-a7eb-49af-890c-54406dad139d';
    const nationalId = '19800202-2200';

    console.log('🔍 Searching for National ID: 19800202-2200');
    console.log('==========================================\n');

    // Search for exact national ID match
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
        console.log(`   Date of Birth: ${patient.dateofbirth || 'N/A'}`);
        console.log(`   Gender: ${patient.gender || 'N/A'}`);
        console.log(`   Phone: ${patient.phone || 'N/A'}`);
        console.log(`   Email: ${patient.email || 'N/A'}`);
        console.log(`   Address: ${patient.address || 'N/A'}`);
        console.log(`   Created: ${patient.createdat}`);
        console.log(`   Updated: ${patient.updatedat}`);
        console.log(`   Status: ✅ FOUND IN DATABASE`);
        console.log('');
      });
    } else {
      console.log('❌ No exact match found for national ID: 19800202-2200');
    }
    console.log('');

    // Search for partial matches (in case of formatting differences)
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
      AND nationalid ILIKE '%19800202%'
      ORDER BY createdat DESC
    `;

    console.log('📋 PARTIAL MATCH RESULTS (contains 19800202):');
    console.log('===============================================');
    if (partialMatches.length > 0) {
      partialMatches.forEach((patient, i) => {
        console.log(`${i + 1}. ${patient.firstname} ${patient.lastname}`);
        console.log(`   Patient ID: ${patient.patientid}`);
        console.log(`   National ID: ${patient.nationalid}`);
        console.log(`   Phone: ${patient.phone || 'N/A'}`);
        console.log(`   Email: ${patient.email || 'N/A'}`);
        console.log(`   Created: ${patient.createdat}`);
        console.log('');
      });
    } else {
      console.log('❌ No partial matches found containing "19800202"');
    }
    console.log('');

    // Search for similar patterns (19800202 without dash)
    const similarMatches = await sql`
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
      AND (nationalid = '198002022200' OR nationalid ILIKE '%198002022200%')
      ORDER BY createdat DESC
    `;

    console.log('📋 SIMILAR PATTERN RESULTS (198002022200):');
    console.log('============================================');
    if (similarMatches.length > 0) {
      similarMatches.forEach((patient, i) => {
        console.log(`${i + 1}. ${patient.firstname} ${patient.lastname}`);
        console.log(`   Patient ID: ${patient.patientid}`);
        console.log(`   National ID: ${patient.nationalid}`);
        console.log(`   Phone: ${patient.phone || 'N/A'}`);
        console.log(`   Email: ${patient.email || 'N/A'}`);
        console.log(`   Created: ${patient.createdat}`);
        console.log('');
      });
    } else {
      console.log('❌ No matches found for pattern "198002022200"');
    }
    console.log('');

    // Check if this patient would appear in web app dashboard (has phone?)
    if (exactMatch.length > 0) {
      console.log('🌐 WEB APP DASHBOARD AVAILABILITY:');
      console.log('==================================');
      exactMatch.forEach((patient, i) => {
        const hasPhone = patient.phone && patient.phone.trim() !== '';
        console.log(`${i + 1}. ${patient.firstname} ${patient.lastname}`);
        console.log(`   Has Phone: ${hasPhone ? '✅ YES' : '❌ NO'}`);
        console.log(`   Web App Dashboard: ${hasPhone ? '✅ VISIBLE' : '❌ HIDDEN (no phone)'}`);
        console.log(`   Local Project: ✅ VISIBLE (no filtering)`);
        console.log('');
      });
    }

    console.log('🎯 SUMMARY:');
    console.log('===========');
    console.log(`• National ID Searched: ${nationalId}`);
    console.log(`• Exact Matches: ${exactMatch.length}`);
    console.log(`• Partial Matches: ${partialMatches.length}`);
    console.log(`• Similar Patterns: ${similarMatches.length}`);
    console.log(`• Total Found: ${exactMatch.length + partialMatches.length + similarMatches.length}`);

    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

findByNationalId();
