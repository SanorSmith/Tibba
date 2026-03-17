// Find the rrrrrrrrrrrrrrrrrrrr patient you just created
const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = postgres(databaseUrl, {
  ssl: 'require',
});

async function findRrrrrrPatient() {
  try {
    console.log('🔍 Searching for "rrrrrrrrrrrrrrrrrrrr" patient...\n');
    
    // Search in main patients table
    const patients = await sql`
      SELECT patientid, ehrid, firstname, lastname, phone, email, createdat
      FROM patients 
      WHERE firstname ILIKE '%rrrrr%' OR lastname ILIKE '%rrrrr%'
      ORDER BY createdat DESC
    `;
    
    if (patients.length === 0) {
      console.log('❌ No patient found with "rrrrrrrrrrrrrrrrrrrr" in name');
      
      // Try searching for most recent patients
      console.log('\n📋 Checking most recent patients (last 5 minutes):\n');
      const recentPatients = await sql`
        SELECT patientid, ehrid, firstname, lastname, phone, email, createdat
        FROM patients 
        WHERE createdat > NOW() - INTERVAL '5 minutes'
        ORDER BY createdat DESC
      `;
      
      if (recentPatients.length > 0) {
        console.log('Recent patients found:');
        recentPatients.forEach((p, i) => {
          console.log(`${i+1}. ${p.firstname} ${p.lastname} (${p.ehrid})`);
          console.log(`   Phone: ${p.phone}`);
          console.log(`   Email: ${p.email || 'None'}`);
          console.log(`   Created: ${p.createdat}\n`);
        });
        
        // Check if the most recent patient has complete data
        const latestPatient = recentPatients[0];
        console.log(`🔍 Checking complete data for most recent patient: ${latestPatient.firstname} ${latestPatient.lastname}\n`);
        
        // Check related data for the most recent patient
        const emergency = await sql`
          SELECT contactname, contactphone FROM patient_emergency_contacts 
          WHERE patientid = ${latestPatient.patientid}
        `;
        
        const insurance = await sql`
          SELECT insurancecompany, insurancenumber FROM patient_insurance_information 
          WHERE patientid = ${latestPatient.patientid}
        `;
        
        const medical = await sql`
          SELECT allergies, chronicdiseases, currentmedications FROM patient_medical_information 
          WHERE patientid = ${latestPatient.patientid}
        `;
        
        console.log(`Emergency Contact: ${emergency.length > 0 ? '✅' : '❌'} ${emergency.length > 0 ? `(${emergency[0].contactname})` : ''}`);
        console.log(`Insurance: ${insurance.length > 0 ? '✅' : '❌'} ${insurance.length > 0 ? `(${insurance[0].insurancecompany})` : ''}`);
        console.log(`Medical Info: ${medical.length > 0 ? '✅' : '❌'} ${medical.length > 0 ? `(${medical[0].allergies || 'None'})` : ''}`);
        
        const isComplete = emergency.length > 0 && insurance.length > 0 && medical.length > 0;
        console.log(`Status: ${isComplete ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);
        
        if (!isComplete) {
          console.log('\n⚠️  This patient has incomplete data - some fields will be empty in the detail view');
        }
        
      } else {
        console.log('❌ No recent patients found in the last 5 minutes');
      }
      
    } else {
      console.log(`✅ Found ${patients.length} patient(s) with "rrrrrrrrrrrrrrrrrrrr":\n`);
      
      for (let index = 0; index < patients.length; index++) {
        const patient = patients[index];
        console.log(`${index + 1}. ${patient.firstname} ${patient.lastname} (${patient.ehrid})`);
        console.log(`   Phone: ${patient.phone}`);
        console.log(`   Email: ${patient.email || 'None'}`);
        console.log(`   Created: ${patient.createdat}\n`);
        
        // Check related data for each patient
        console.log(`   Checking related data:`);
        
        const emergency = await sql`
          SELECT contactname, contactphone FROM patient_emergency_contacts 
          WHERE patientid = ${patient.patientid}
        `;
        
        const insurance = await sql`
          SELECT insurancecompany, insurancenumber FROM patient_insurance_information 
          WHERE patientid = ${patient.patientid}
        `;
        
        const medical = await sql`
          SELECT allergies, chronicdiseases, currentmedications FROM patient_medical_information 
          WHERE patientid = ${patient.patientid}
        `;
        
        console.log(`   Emergency Contact: ${emergency.length > 0 ? '✅' : '❌'} ${emergency.length > 0 ? `(${emergency[0].contactname})` : ''}`);
        console.log(`   Insurance: ${insurance.length > 0 ? '✅' : '❌'} ${insurance.length > 0 ? `(${insurance[0].insurancecompany})` : ''}`);
        console.log(`   Medical Info: ${medical.length > 0 ? '✅' : '❌'} ${medical.length > 0 ? `(${medical[0].allergies || 'None'})` : ''}`);
        
        const isComplete = emergency.length > 0 && insurance.length > 0 && medical.length > 0;
        console.log(`   Status: ${isComplete ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);
        console.log('');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

findRrrrrrPatient();
