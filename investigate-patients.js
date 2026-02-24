const postgres = require('postgres');

async function investigatePatientCount() {
  try {
    const sql = postgres('postgresql://neondb_owner:npg_8FjAiWwJlhz7@ep-red-cherry-ag82jhqf-pooler.c-2.eu-central-1.aws.neon.tech/neondb', { 
      ssl: 'require',
      max: 1
    });

    const workspaceId = 'fa9fb036-a7eb-49af-890c-54406dad139d';

    console.log('🔍 Investigating Patient Count Discrepancy');
    console.log('==========================================\n');

    // Get all patients with details
    const allPatients = await sql`
      SELECT 
        patientid,
        firstname,
        lastname,
        createdat,
        updatedat,
        gender,
        phone,
        email,
        is_active
      FROM patients 
      WHERE workspaceid = ${workspaceId}
      ORDER BY createdat DESC
    `;

    console.log('📊 DATABASE ANALYSIS:');
    console.log('====================');
    console.log(`• Total Patients in Database: ${allPatients.length}`);
    console.log(`• Web App Dashboard Shows: 56`);
    console.log(`• Discrepancy: ${allPatients.length - 56} patients`);
    console.log('');

    // Check for potential filtering criteria
    const patientsWithPhone = allPatients.filter(p => p.phone && p.phone.trim() !== '');
    const patientsWithEmail = allPatients.filter(p => p.email && p.email.trim() !== '');
    const patientsWithBoth = allPatients.filter(p => 
      p.phone && p.phone.trim() !== '' && 
      p.email && p.email.trim() !== ''
    );

    console.log('🔍 POTENTIAL FILTERING ANALYSIS:');
    console.log('=================================');
    console.log(`• Patients with Phone: ${patientsWithPhone.length}`);
    console.log(`• Patients with Email: ${patientsWithEmail.length}`);
    console.log(`• Patients with Both: ${patientsWithBoth.length}`);
    console.log('');

    // Show latest patients that might be missing from dashboard
    console.log('📋 LATEST PATIENTS (Most Recent First):');
    console.log('===========================================');
    allPatients.slice(0, 10).forEach((p, i) => {
      console.log(`${i + 1}. ${p.firstname} ${p.lastname}`);
      console.log(`   ID: ${p.patientid}`);
      console.log(`   Created: ${p.createdat}`);
      console.log(`   Phone: ${p.phone || 'N/A'}`);
      console.log(`   Email: ${p.email || 'N/A'}`);
      console.log('');
    });

    // Check if there are any duplicate or incomplete records
    const incompletePatients = allPatients.filter(p => 
      !p.firstname || !p.lastname || (!p.phone && !p.email)
    );

    if (incompletePatients.length > 0) {
      console.log('⚠️  INCOMPLETE PATIENT RECORDS:');
      console.log('===============================');
      incompletePatients.forEach((p, i) => {
        console.log(`${i + 1}. ${p.firstname || 'N/A'} ${p.lastname || 'N/A'}`);
        console.log(`   ID: ${p.patientid}`);
        console.log(`   Missing: ${!p.firstname ? 'First Name ' : ''}${!p.lastname ? 'Last Name ' : ''}${!p.phone && !p.email ? 'Contact Info' : ''}`);
        console.log('');
      });
    }

    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

investigatePatientCount();
