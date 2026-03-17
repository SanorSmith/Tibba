// Check all patient-related tables and their current data
const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = postgres(databaseUrl, {
  ssl: 'require',
});

async function checkAllPatientTables() {
  try {
    console.log('🔍 Checking all patient-related tables...\n');
    
    // 1. Main patients table
    console.log('📋 MAIN PATIENTS TABLE:');
    console.log('========================');
    const patientCount = await sql`SELECT COUNT(*) as count FROM patients`;
    console.log(`Total patients: ${patientCount[0].count}\n`);
    
    const recentPatients = await sql`
      SELECT patientid, ehrid, firstname, lastname, phone, createdat
      FROM patients 
      ORDER BY createdat DESC 
      LIMIT 5
    `;
    
    console.log('Most recent 5 patients:');
    recentPatients.forEach((p, i) => {
      console.log(`${i+1}. ${p.firstname} ${p.lastname} (${p.ehrid}) - ${p.phone} - ${p.createdat}`);
    });
    
    // 2. Emergency contacts table
    console.log('\n📞 EMERGENCY CONTACTS TABLE:');
    console.log('=============================');
    const emergencyCount = await sql`SELECT COUNT(*) as count FROM patient_emergency_contacts`;
    console.log(`Total emergency contacts: ${emergencyCount[0].count}\n`);
    
    if (emergencyCount[0].count > 0) {
      const emergencyContacts = await sql`
        SELECT ec.patientid, ec.contactname, ec.contactphone, ec.createdat,
               p.firstname, p.lastname, p.ehrid
        FROM patient_emergency_contacts ec
        JOIN patients p ON ec.patientid = p.patientid
        ORDER BY ec.createdat DESC
        LIMIT 5
      `;
      
      console.log('Recent emergency contacts:');
      emergencyContacts.forEach((ec, i) => {
        console.log(`${i+1}. ${ec.firstname} ${ec.lastname} (${ec.ehrid})`);
        console.log(`   Contact: ${ec.contactname} / ${ec.contactphone}`);
        console.log(`   Created: ${ec.createdat}\n`);
      });
    } else {
      console.log('❌ No emergency contacts found\n');
    }
    
    // 3. Insurance information table
    console.log('🏥 INSURANCE INFORMATION TABLE:');
    console.log('===============================');
    const insuranceCount = await sql`SELECT COUNT(*) as count FROM patient_insurance_information`;
    console.log(`Total insurance records: ${insuranceCount[0].count}\n`);
    
    if (insuranceCount[0].count > 0) {
      const insuranceInfo = await sql`
        SELECT ins.patientid, ins.insurancecompany, ins.insurancenumber, ins.createdat,
               p.firstname, p.lastname, p.ehrid
        FROM patient_insurance_information ins
        JOIN patients p ON ins.patientid = p.patientid
        ORDER BY ins.createdat DESC
        LIMIT 5
      `;
      
      console.log('Recent insurance information:');
      insuranceInfo.forEach((ins, i) => {
        console.log(`${i+1}. ${ins.firstname} ${ins.lastname} (${ins.ehrid})`);
        console.log(`   Insurance: ${ins.insurancecompany} / ${ins.insurancenumber}`);
        console.log(`   Created: ${ins.createdat}\n`);
      });
    } else {
      console.log('❌ No insurance information found\n');
    }
    
    // 4. Medical information table
    console.log('🩺 MEDICAL INFORMATION TABLE:');
    console.log('============================');
    const medicalCount = await sql`SELECT COUNT(*) as count FROM patient_medical_information`;
    console.log(`Total medical records: ${medicalCount[0].count}\n`);
    
    if (medicalCount[0].count > 0) {
      const medicalInfo = await sql`
        SELECT med.patientid, med.allergies, med.chronicdiseases, med.currentmedications, med.createdat,
               p.firstname, p.lastname, p.ehrid
        FROM patient_medical_information med
        JOIN patients p ON med.patientid = p.patientid
        ORDER BY med.createdat DESC
        LIMIT 5
      `;
      
      console.log('Recent medical information:');
      medicalInfo.forEach((med, i) => {
        console.log(`${i+1}. ${med.firstname} ${med.lastname} (${med.ehrid})`);
        console.log(`   Allergies: ${med.allergies || 'None'}`);
        console.log(`   Chronic: ${med.chronicdiseases || 'None'}`);
        console.log(`   Medications: ${med.currentmedications || 'None'}`);
        console.log(`   Created: ${med.createdat}\n`);
      });
    } else {
      console.log('❌ No medical information found\n');
    }
    
    // 5. Summary of data relationships
    console.log('📊 DATA RELATIONSHIP SUMMARY:');
    console.log('===========================');
    
    const completePatients = await sql`
      SELECT COUNT(*) as count
      FROM patients p
      INNER JOIN patient_emergency_contacts ec ON p.patientid = ec.patientid
      INNER JOIN patient_insurance_information ins ON p.patientid = ins.patientid
      INNER JOIN patient_medical_information med ON p.patientid = med.patientid
    `;
    
    const partialPatients = await sql`
      SELECT COUNT(*) as count
      FROM patients p
      LEFT JOIN patient_emergency_contacts ec ON p.patientid = ec.patientid
      LEFT JOIN patient_insurance_information ins ON p.patientid = ins.patientid
      LEFT JOIN patient_medical_information med ON p.patientid = med.patientid
      WHERE ec.patientid IS NULL OR ins.patientid IS NULL OR med.patientid IS NULL
    `;
    
    console.log(`Patients with COMPLETE data (all 4 tables): ${completePatients[0].count}`);
    console.log(`Patients with PARTIAL data (missing some tables): ${partialPatients[0].count}`);
    console.log(`Total patients: ${patientCount[0].count}`);
    
    // 6. Show patients with complete data
    if (completePatients[0].count > 0) {
      console.log('\n✅ PATIENTS WITH COMPLETE DATA:');
      const completeList = await sql`
        SELECT p.ehrid, p.firstname, p.lastname, p.phone, p.createdat
        FROM patients p
        INNER JOIN patient_emergency_contacts ec ON p.patientid = ec.patientid
        INNER JOIN patient_insurance_information ins ON p.patientid = ins.patientid
        INNER JOIN patient_medical_information med ON p.patientid = med.patientid
        ORDER BY p.createdat DESC
        LIMIT 5
      `;
      
      completeList.forEach((p, i) => {
        console.log(`${i+1}. ${p.firstname} ${p.lastname} (${p.ehrid}) - ${p.phone}`);
      });
    }
    
    console.log('\n🎯 CONCLUSION:');
    if (completePatients[0].count > 0) {
      console.log('✅ Registration system is working - some patients have complete data');
      console.log('✅ These patients should show all fields in the detail view');
    } else {
      console.log('❌ No patients have complete data - registration may have issues');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

checkAllPatientTables();
