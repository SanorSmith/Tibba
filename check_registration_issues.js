// Check for registration issues
const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = postgres(databaseUrl, {
  ssl: 'require',
});

async function checkRegistrationIssues() {
  try {
    console.log('🔍 Checking registration issues...\n');
    
    // Find patients that might have incomplete data
    console.log('📋 Patients with incomplete related data:\n');
    
    const incompletePatients = await sql`
      SELECT 
        p.patientid,
        p.ehrid,
        p.firstname,
        p.lastname,
        p.phone,
        p.createdat,
        CASE 
          WHEN ec.patientid IS NULL THEN 'Missing Emergency Contact'
          WHEN ins.patientid IS NULL THEN 'Missing Insurance'
          WHEN med.patientid IS NULL THEN 'Missing Medical Info'
          ELSE 'Complete'
        END as status
      FROM patients p
      LEFT JOIN patient_emergency_contacts ec ON p.patientid = ec.patientid
      LEFT JOIN patient_insurance_information ins ON p.patientid = ins.patientid
      LEFT JOIN patient_medical_information med ON p.patientid = med.patientid
      WHERE ec.patientid IS NULL OR ins.patientid IS NULL OR med.patientid IS NULL
      ORDER BY p.createdat DESC
      LIMIT 10
    `;
    
    incompletePatients.forEach((patient, index) => {
      console.log(`${index + 1}. ${patient.firstname} ${patient.lastname} (${patient.ehrid})`);
      console.log(`   Status: ${patient.status}`);
      console.log(`   Created: ${patient.createdat}\n`);
    });
    
    // Check if there are any patients with only basic info (might indicate validation failure)
    console.log('🔍 Checking for potential validation failures...\n');
    
    const basicOnlyPatients = await sql`
      SELECT 
        p.patientid,
        p.ehrid,
        p.firstname,
        p.lastname,
        p.phone,
        p.email,
        p.createdat,
        ec.patientid as has_emergency,
        ins.patientid as has_insurance,
        med.patientid as has_medical
      FROM patients p
      LEFT JOIN patient_emergency_contacts ec ON p.patientid = ec.patientid
      LEFT JOIN patient_insurance_information ins ON p.patientid = ins.patientid
      LEFT JOIN patient_medical_information med ON p.patientid = med.patientid
      WHERE ec.patientid IS NULL 
        AND ins.patientid IS NULL 
        AND med.patientid IS NULL
        AND p.createdat > NOW() - INTERVAL '1 day'
      ORDER BY p.createdat DESC
    `;
    
    if (basicOnlyPatients.length > 0) {
      console.log('⚠️  Patients with only basic info (possible validation issues):');
      basicOnlyPatients.forEach(p => {
        console.log(`- ${p.firstname} ${p.lastname} (${p.ehrid})`);
        console.log(`  Phone: ${p.phone}, Email: ${p.email || 'None'}`);
        console.log(`  Created: ${p.createdat}`);
      });
    } else {
      console.log('✅ No recent patients with only basic info found');
    }
    
    // Check the most recent successful registration
    console.log('\n📊 Most recent successful registration:\n');
    
    const recentComplete = await sql`
      SELECT 
        p.patientid,
        p.ehrid,
        p.firstname,
        p.lastname,
        p.phone,
        p.createdat,
        ec.contactname,
        ec.contactphone,
        ins.insurancecompany,
        ins.insurancenumber,
        med.allergies,
        med.chronicdiseases,
        med.currentmedications
      FROM patients p
      INNER JOIN patient_emergency_contacts ec ON p.patientid = ec.patientid
      INNER JOIN patient_insurance_information ins ON p.patientid = ins.patientid
      INNER JOIN patient_medical_information med ON p.patientid = med.patientid
      ORDER BY p.createdat DESC
      LIMIT 1
    `;
    
    if (recentComplete.length > 0) {
      const patient = recentComplete[0];
      console.log('✅ Most recent complete registration:');
      console.log(`${patient.firstname} ${patient.lastname} (${patient.ehrid})`);
      console.log(`  Emergency: ${patient.contactname} / ${patient.contactphone}`);
      console.log(`  Insurance: ${patient.insurancecompany} / ${patient.insurancenumber}`);
      console.log(`  Medical: ${patient.allergies}, ${patient.chronicdiseases}, ${patient.currentmedications}`);
      console.log(`  Created: ${patient.createdat}`);
    } else {
      console.log('❌ No complete registrations found');
    }
    
    // Quick check: Are you looking at the right patient?
    console.log('\n🎯 Quick check - Are you looking at the right patient?\n');
    console.log('Recent patients in order:');
    
    const allRecent = await sql`
      SELECT ehrid, firstname, lastname, phone, createdat
      FROM patients 
      ORDER BY createdat DESC 
      LIMIT 5
    `;
    
    allRecent.forEach((p, i) => {
      console.log(`${i+1}. ${p.firstname} ${p.lastname} (${p.ehrid}) - ${p.phone} - ${p.createdat}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

checkRegistrationIssues();
