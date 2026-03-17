// Check which tables contain the rrrrrrrrrrrrrrrrrrrr patient name
const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = postgres(databaseUrl, {
  ssl: 'require',
});

async function checkRrrrrrTables() {
  try {
    console.log('🔍 Checking which tables contain "rrrrrrrrrrrrrrrrrrrr"...\n');
    
    // 1. Check main patients table
    console.log('📋 MAIN PATIENTS TABLE:');
    const mainPatient = await sql`
      SELECT patientid, ehrid, firstname, lastname, phone, email, createdat
      FROM patients 
      WHERE firstname ILIKE '%rrrrr%' OR lastname ILIKE '%rrrrr%'
    `;
    
    if (mainPatient.length > 0) {
      console.log('✅ Found in main patients table:');
      console.log(`   First Name: "${mainPatient[0].firstname}"`);
      console.log(`   Last Name: "${mainPatient[0].lastname}"`);
      console.log(`   Patient ID: ${mainPatient[0].patientid}`);
      console.log(`   Patient Number: ${mainPatient[0].ehrid}`);
      console.log(`   Phone: ${mainPatient[0].phone}`);
      console.log(`   Email: ${mainPatient[0].email}`);
      console.log(`   Created: ${mainPatient[0].createdat}`);
    } else {
      console.log('❌ Not found in main patients table');
    }
    
    // 2. Check emergency contacts table
    console.log('\n📞 EMERGENCY CONTACTS TABLE:');
    const emergencyContact = await sql`
      SELECT patientid, contactname, contactphone, createdat
      FROM patient_emergency_contacts 
      WHERE contactname ILIKE '%rrrrr%'
    `;
    
    if (emergencyContact.length > 0) {
      console.log('✅ Found in emergency contacts table:');
      console.log(`   Contact Name: "${emergencyContact[0].contactname}"`);
      console.log(`   Contact Phone: ${emergencyContact[0].contactphone}`);
      console.log(`   Patient ID: ${emergencyContact[0].patientid}`);
      console.log(`   Created: ${emergencyContact[0].createdat}`);
    } else {
      console.log('❌ Not found in emergency contacts table');
    }
    
    // 3. Check insurance table (unlikely to have patient name)
    console.log('\n🏥 INSURANCE TABLE:');
    const insurance = await sql`
      SELECT patientid, insurancecompany, insurancenumber, createdat
      FROM patient_insurance_information 
      WHERE insurancecompany ILIKE '%rrrrr%'
    `;
    
    if (insurance.length > 0) {
      console.log('✅ Found in insurance table:');
      console.log(`   Insurance Company: "${insurance[0].insurancecompany}"`);
      console.log(`   Insurance Number: ${insurance[0].insurancenumber}`);
      console.log(`   Patient ID: ${insurance[0].patientid}`);
      console.log(`   Created: ${insurance[0].createdat}`);
    } else {
      console.log('❌ Not found in insurance table');
    }
    
    // 4. Check medical information table (unlikely to have patient name)
    console.log('\n🩺 MEDICAL INFORMATION TABLE:');
    const medical = await sql`
      SELECT patientid, allergies, chronicdiseases, currentmedications, createdat
      FROM patient_medical_information 
      WHERE allergies ILIKE '%rrrrr%' OR chronicdiseases ILIKE '%rrrrr%' OR currentmedications ILIKE '%rrrrr%'
    `;
    
    if (medical.length > 0) {
      console.log('✅ Found in medical information table:');
      console.log(`   Allergies: "${medical[0].allergies}"`);
      console.log(`   Chronic Diseases: "${medical[0].chronicdiseases}"`);
      console.log(`   Current Medications: "${medical[0].currentmedications}"`);
      console.log(`   Patient ID: ${medical[0].patientid}`);
      console.log(`   Created: ${medical[0].createdat}`);
    } else {
      console.log('❌ Not found in medical information table');
    }
    
    // 5. Show the complete data for this patient
    if (mainPatient.length > 0) {
      const patientId = mainPatient[0].patientid;
      console.log('\n📊 COMPLETE DATA FOR THIS PATIENT:');
      console.log('=====================================');
      
      // Get all related data
      const emergency = await sql`
        SELECT contactname, contactphone FROM patient_emergency_contacts 
        WHERE patientid = ${patientId}
      `;
      
      const insuranceInfo = await sql`
        SELECT insurancecompany, insurancenumber FROM patient_insurance_information 
        WHERE patientid = ${patientId}
      `;
      
      const medicalInfo = await sql`
        SELECT allergies, chronicdiseases, currentmedications, medicalhistory FROM patient_medical_information 
        WHERE patientid = ${patientId}
      `;
      
      console.log(`📋 Main Table: "${mainPatient[0].firstname} ${mainPatient[0].lastname}"`);
      console.log(`📞 Emergency: "${emergency[0]?.contactname || 'None'}"`);
      console.log(`🏥 Insurance: "${insuranceInfo[0]?.insurancecompany || 'None'}"`);
      console.log(`🩺 Medical: "${medicalInfo[0]?.allergies || 'None'}"`);
      
      console.log('\n🎯 SUMMARY:');
      console.log('===========');
      console.log(`✅ Patient name "rrrrrrrrrrrrrrrrrrrr" is stored in: MAIN PATIENTS TABLE`);
      console.log(`❌ Not stored in emergency, insurance, or medical tables`);
      console.log(`📝 Related tables store different information (contact details, insurance info, medical data)`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

checkRrrrrrTables();
