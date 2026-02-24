const postgres = require('postgres');

async function comparePatientData() {
  try {
    const sql = postgres('postgresql://neondb_owner:npg_8FjAiWwJlhz7@ep-red-cherry-ag82jhqf-pooler.c-2.eu-central-1.aws.neon.tech/neondb', { 
      ssl: 'require',
      max: 1
    });

    const workspaceId = 'fa9fb036-a7eb-49af-890c-54406dad139d';

    console.log('🔍 Comparing Patient Data Content');
    console.log('=================================\n');

    // Get ALL patients from database
    const allPatients = await sql`
      SELECT 
        patientid,
        firstname,
        lastname,
        dateofbirth,
        phone,
        email,
        address,
        gender,
        createdat,
        updatedat,
        nationalid,
        medicalhistory
      FROM patients 
      WHERE workspaceid = ${workspaceId}
      ORDER BY createdat ASC
    `;

    console.log(`📊 TOTAL PATIENTS IN DATABASE: ${allPatients.length}`);
    console.log(`📊 WEB APP DASHBOARD SHOWS: 56`);
    console.log(`📊 DIFFERENCE: ${allPatients.length - 56} patients\n`);

    // Analyze potential filtering criteria
    const patientsWithPhone = allPatients.filter(p => p.phone && p.phone.trim() !== '');
    const patientsWithEmail = allPatients.filter(p => p.email && p.email.trim() !== '');
    const patientsWithAddress = allPatients.filter(p => p.address && p.address.trim() !== '');
    const patientsWithDOB = allPatients.filter(p => p.dateofbirth);
    const patientsWithCompleteData = allPatients.filter(p => 
      p.firstname && p.lastname && 
      (p.phone || p.email) && 
      p.dateofbirth
    );

    console.log('🔍 POTENTIAL FILTERING ANALYSIS:');
    console.log('=================================');
    console.log(`• Patients with Phone: ${patientsWithPhone.length}`);
    console.log(`• Patients with Email: ${patientsWithEmail.length}`);
    console.log(`• Patients with Address: ${patientsWithAddress.length}`);
    console.log(`• Patients with DOB: ${patientsWithDOB.length}`);
    console.log(`• Patients with Complete Data: ${patientsWithCompleteData.length}`);
    console.log('');

    // Check if any of these counts match 56
    if (patientsWithPhone.length === 56) {
      console.log('🎯 LIKELY FILTER: Dashboard shows only patients with phone numbers');
    } else if (patientsWithEmail.length === 56) {
      console.log('🎯 LIKELY FILTER: Dashboard shows only patients with email');
    } else if (patientsWithCompleteData.length === 56) {
      console.log('🎯 LIKELY FILTER: Dashboard shows only patients with complete data');
    } else if (patientsWithAddress.length === 56) {
      console.log('🎯 LIKELY FILTER: Dashboard shows only patients with address');
    }
    console.log('');

    // Show all patients with their data completeness
    console.log('📋 ALL PATIENTS WITH DATA COMPLETENESS:');
    console.log('=======================================');
    
    allPatients.forEach((patient, index) => {
      const hasPhone = patient.phone && patient.phone.trim() !== '';
      const hasEmail = patient.email && patient.email.trim() !== '';
      const hasAddress = patient.address && patient.address.trim() !== '';
      const hasDOB = patient.dateofbirth;
      const isComplete = hasPhone && hasEmail && hasAddress && hasDOB;
      
      console.log(`${index + 1}. ${patient.firstname} ${patient.lastname}`);
      console.log(`   ID: ${patient.patientid}`);
      console.log(`   Created: ${patient.createdat}`);
      console.log(`   Phone: ${hasPhone ? '✅' : '❌'} ${patient.phone || 'N/A'}`);
      console.log(`   Email: ${hasEmail ? '✅' : '❌'} ${patient.email || 'N/A'}`);
      console.log(`   Address: ${hasAddress ? '✅' : '❌'} ${patient.address || 'N/A'}`);
      console.log(`   DOB: ${hasDOB ? '✅' : '❌'} ${patient.dateofbirth || 'N/A'}`);
      console.log(`   Complete: ${isComplete ? '✅' : '❌'}`);
      console.log('');
    });

    // Show the 2 most recent patients (that might be missing from dashboard)
    if (allPatients.length > 56) {
      console.log('🆕 MOST RECENT PATIENTS (might be missing from dashboard):');
      console.log('=======================================================');
      const recentPatients = allPatients.slice(-2);
      recentPatients.forEach((patient, i) => {
        console.log(`${i + 1}. ${patient.firstname} ${patient.lastname}`);
        console.log(`   Created: ${patient.createdat}`);
        console.log(`   Phone: ${patient.phone || 'N/A'}`);
        console.log(`   Email: ${patient.email || 'N/A'}`);
        console.log('');
      });
    }

    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

comparePatientData();
