// Test appointment creation API
const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

async function testAppointmentCreation() {
  try {
    console.log('🔍 Testing appointment creation...');
    
    const workspaceid = 'fa9fb036-a7eb-49af-890c-54406dad139d';
    
    // First get a patient ID
    const patients = await sql`
      SELECT patientid, firstname, lastname
      FROM patients
      WHERE workspaceid = ${workspaceid}
      LIMIT 1
    `;
    
    if (patients.length === 0) {
      console.log('❌ No patients found in database');
      return;
    }
    
    const patient = patients[0];
    console.log(`✅ Using patient: ${patient.firstname} ${patient.lastname} (${patient.patientid})`);
    
    // Get a doctor ID from staff that has a matching user
    const doctors = await sql`
      SELECT 
        u.userid,
        CONCAT(s.firstname, ' ', COALESCE(s.middlename, ''), ' ', s.lastname) as name,
        s.role
      FROM staff s
      INNER JOIN users u ON s.email = u.email
      WHERE s.workspaceid = ${workspaceid}
      AND s.role = 'doctor'
      LIMIT 1
    `;
    
    if (doctors.length === 0) {
      console.log('❌ No doctors with matching users found');
      return;
    }
    
    const doctor = doctors[0];
    console.log(`✅ Using doctor: ${doctor.name} (${doctor.userid})`);
    
    // Test appointment creation
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 45 * 60000); // 45 minutes later
    
    console.log('\n📋 Creating appointment...');
    
    const result = await sql`
      INSERT INTO appointments (
        workspaceid,
        patientid,
        doctorid,
        appointmentname,
        appointmenttype,
        clinicalindication,
        reasonforrequest,
        description,
        starttime,
        endtime,
        location,
        unit,
        status,
        notes
      ) VALUES (
        ${workspaceid},
        ${patient.patientid},
        ${doctor.userid},
        'new_patient'::appointment_name,
        'visiting'::appointment_type,
        'Test clinical indication',
        'Test reason',
        'Test description',
        ${startTime.toISOString()},
        ${endTime.toISOString()},
        'Room 101',
        'General',
        'scheduled'::appointment_status,
        ${JSON.stringify({test: true})}::jsonb
      )
      RETURNING *
    `;
    
    console.log('✅ Appointment created successfully!');
    console.log('Appointment details:');
    console.log(`  ID: ${result[0].appointmentid}`);
    console.log(`  Patient: ${patient.firstname} ${patient.lastname}`);
    console.log(`  Doctor: ${doctor.firstname} ${doctor.lastname}`);
    console.log(`  Time: ${startTime.toISOString()}`);
    console.log(`  Status: ${result[0].status}`);
    
    // Clean up - delete the test appointment
    await sql`
      DELETE FROM appointments
      WHERE appointmentid = ${result[0].appointmentid}
    `;
    
    console.log('🧹 Test appointment cleaned up');
    console.log('\n✅ Appointment creation test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sql.end();
  }
}

testAppointmentCreation();
