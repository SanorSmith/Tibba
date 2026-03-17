// Test the patient API to see what data is being returned
const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = postgres(databaseUrl, {
  ssl: 'require',
});

async function testPatientData() {
  try {
    console.log('🔍 Testing patient data API...\n');
    
    // Test the exact query that the API uses for a specific patient with related data
    const query = `
      SELECT 
        p.patientid as id,
        p.ehrid as patient_number,
        p.firstname as first_name_ar,
        p.firstname as first_name_en,
        p.middlename as middle_name,
        p.lastname as last_name_ar,
        p.lastname as last_name_en,
        p.firstname || ' ' || COALESCE(p.middlename || ' ', '') || p.lastname as full_name_ar,
        p.firstname || ' ' || COALESCE(p.middlename || ' ', '') || p.lastname as full_name_en,
        p.dateofbirth::date as date_of_birth,
        EXTRACT(YEAR FROM AGE(p.dateofbirth::date)) as age,
        p.gender,
        p.bloodgroup as blood_group,
        p.nationalid as national_id,
        p.phone,
        p.phone as mobile,
        p.email,
        p.address,
        p.address as governorate,
        NULL as district,
        NULL as neighborhood,
        ec.contactname as emergency_contact,
        ec.contactphone as emergency_phone,
        NULL as emergency_contact_relationship_ar,
        p.medicalhistory as medical_history,
        0 as total_balance,
        true as is_active,
        p.createdat as created_at,
        p.updatedat as updated_at,
        NULL as insurance_state,
        ins.insurancenumber as insurance_number,
        ins.insurancecompany as insurance_company,
        NULL as next_appointment,
        med.allergies,
        med.chronicdiseases as chronic_diseases,
        med.currentmedications as current_medications
      FROM patients p
      LEFT JOIN patient_emergency_contacts ec ON p.patientid = ec.patientid
      LEFT JOIN patient_insurance_information ins ON p.patientid = ins.patientid
      LEFT JOIN patient_medical_information med ON p.patientid = med.patientid
      WHERE p.patientid = '4318deb1-5a13-43d4-aae1-698573f6a93c'
      LIMIT 1
    `;
    
    console.log('📊 Executing query to fetch patient data...\n');
    const result = await sql.unsafe(query);
    
    console.log('📋 Result:', result);
    
    if (result && result.length > 0) {
      console.log(`Found ${result.length} patients:\n`);
      result.forEach((patient, index) => {
        console.log(`\n=== Patient ${index + 1} ===`);
        console.log(`ID: ${patient.id}`);
        console.log(`Name: ${patient.full_name_ar}`);
        console.log(`Phone: ${patient.phone}`);
        console.log(`Emergency Contact: ${patient.emergency_contact || 'NULL'}`);
        console.log(`Emergency Phone: ${patient.emergency_phone || 'NULL'}`);
        console.log(`Insurance Company: ${patient.insurance_company || 'NULL'}`);
        console.log(`Insurance Number: ${patient.insurance_number || 'NULL'}`);
        console.log(`Allergies: ${patient.allergies || 'NULL'}`);
        console.log(`Chronic Diseases: ${patient.chronic_diseases || 'NULL'}`);
        console.log(`Current Medications: ${patient.currentmedications || 'NULL'}`);
        console.log(`Medical History: ${patient.medical_history || 'NULL'}`);
      });
    } else {
      console.log('❌ No patients found or query failed');
    }
    
    // Check if tables have data
    console.log('\n🔍 Checking table data separately...\n');
    
    const emergencyCount = await sql`SELECT COUNT(*) as count FROM patient_emergency_contacts`;
    console.log(`Emergency contacts table: ${emergencyCount[0].count} records`);
    
    const insuranceCount = await sql`SELECT COUNT(*) as count FROM patient_insurance_information`;
    console.log(`Insurance table: ${insuranceCount[0].count} records`);
    
    const medicalCount = await sql`SELECT COUNT(*) as count FROM patient_medical_information`;
    console.log(`Medical information table: ${medicalCount[0].count} records`);
    
    // Show sample data from each table
    if (emergencyCount[0].count > 0) {
      const emergencySample = await sql`SELECT * FROM patient_emergency_contacts LIMIT 2`;
      console.log('\n📄 Sample emergency contacts:');
      emergencySample.forEach(record => {
        console.log(`  PatientID: ${record.patientid}, Name: ${record.contactname}, Phone: ${record.contactphone}`);
      });
    }
    
    if (insuranceCount[0].count > 0) {
      const insuranceSample = await sql`SELECT * FROM patient_insurance_information LIMIT 2`;
      console.log('\n📄 Sample insurance info:');
      insuranceSample.forEach(record => {
        console.log(`  PatientID: ${record.patientid}, Company: ${record.insurancecompany}, Number: ${record.insurancenumber}`);
      });
    }
    
    if (medicalCount[0].count > 0) {
      const medicalSample = await sql`SELECT * FROM patient_medical_information LIMIT 2`;
      console.log('\n📄 Sample medical info:');
      medicalSample.forEach(record => {
        console.log(`  PatientID: ${record.patientid}, Allergies: ${record.allergies}, Chronic: ${record.chronicdiseases}`);
      });
    }

    // Check which patients have related data
    console.log('\n🔍 Checking patients with related data...\n');
    
    const patientsWithEmergency = await sql`
      SELECT DISTINCT p.patientid, p.firstname, p.lastname 
      FROM patients p
      INNER JOIN patient_emergency_contacts ec ON p.patientid = ec.patientid
      LIMIT 3
    `;
    
    const patientsWithInsurance = await sql`
      SELECT DISTINCT p.patientid, p.firstname, p.lastname 
      FROM patients p
      INNER JOIN patient_insurance_information ins ON p.patientid = ins.patientid
      LIMIT 3
    `;
    
    const patientsWithMedical = await sql`
      SELECT DISTINCT p.patientid, p.firstname, p.lastname 
      FROM patients p
      INNER JOIN patient_medical_information med ON p.patientid = med.patientid
      LIMIT 3
    `;
    
    console.log('📋 Patients with emergency contacts:');
    patientsWithEmergency.forEach(p => {
      console.log(`  ${p.firstname} ${p.lastname} (ID: ${p.patientid})`);
    });
    
    console.log('\n📋 Patients with insurance info:');
    patientsWithInsurance.forEach(p => {
      console.log(`  ${p.firstname} ${p.lastname} (ID: ${p.patientid})`);
    });
    
    console.log('\n📋 Patients with medical info:');
    patientsWithMedical.forEach(p => {
      console.log(`  ${p.firstname} ${p.lastname} (ID: ${p.patientid})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

testPatientData();
