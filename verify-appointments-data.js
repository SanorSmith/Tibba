// Verify the appointments data matches what's displayed in the UI
const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

async function verifyAppointments() {
  try {
    console.log('🔍 Verifying appointments data...');
    
    const workspaceid = 'fa9fb036-a7eb-49af-890c-54406dad139d';
    
    // Get the same appointments that should be displayed in the UI
    const appointments = await sql`
      SELECT a.*, p.firstname, p.lastname
      FROM appointments a
      LEFT JOIN patients p ON a.patientid = p.patientid
      WHERE a.workspaceid = ${workspaceid}
      ORDER BY a.starttime DESC
    `;
    
    console.log(`\n📋 Found ${appointments.length} appointments in database:`);
    
    appointments.forEach((appt, index) => {
      console.log(`\n${index + 1}. Appointment ID: ${appt.appointmentid}`);
      console.log(`   Patient ID: ${appt.patientid}`);
      console.log(`   Patient Name: ${appt.firstname || 'Unknown'} ${appt.lastname || ''}`);
      console.log(`   Date/Time: ${appt.starttime}`);
      console.log(`   Location: ${appt.location || 'None'}`);
      console.log(`   Unit: ${appt.unit || 'None'}`);
      console.log(`   Status: ${appt.status}`);
      console.log(`   Type: ${appt.appointmenttype}`);
      console.log(`   Clinical Indication: ${appt.clinicalindication || 'NULL'}`);
    });
    
    console.log('\n✅ This data should match exactly what you see in the UI!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

verifyAppointments();
