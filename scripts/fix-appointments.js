/**
 * Fix Appointments - Use correct user IDs for doctorid
 */

require('dotenv').config({ path: '.env.local' });

const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL || process.env.TIBBNA_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Database URL is not configured');
}

const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

async function fixAppointments() {
  console.log('🔧 Fixing appointments with correct user IDs...\n');

  try {
    // Get current data
    const workspaces = await sql`SELECT workspaceid FROM workspaces LIMIT 1`;
    const users = await sql`SELECT userid, name FROM users`;
    const patients = await sql`SELECT patientid, firstname, lastname FROM patients LIMIT 10`;
    
    if (workspaces.length === 0 || users.length === 0 || patients.length === 0) {
      throw new Error('Missing required data for appointments');
    }

    const workspaceId = workspaces[0].workspaceid;

    // Clear existing appointments
    await sql`DELETE FROM appointments`;
    console.log('🗑️  Cleared existing appointments');

    // Create appointments with correct user IDs
    const appointments = [
      { patientIdx: 0, userIdx: 1, starttime: '2026-03-01 09:00:00+00', endtime: '2026-03-01 09:30:00+00', location: 'Room 101', status: 'scheduled', unit: 'Cardiology' },
      { patientIdx: 1, userIdx: 2, starttime: '2026-03-01 10:00:00+00', endtime: '2026-03-01 10:30:00+00', location: 'Room 201', status: 'scheduled', unit: 'Pediatrics' },
      { patientIdx: 2, userIdx: 1, starttime: '2026-03-01 11:00:00+00', endtime: '2026-03-01 11:30:00+00', location: 'Room 101', status: 'scheduled', unit: 'Cardiology' },
      { patientIdx: 3, userIdx: 2, starttime: '2026-03-01 14:00:00+00', endtime: '2026-03-01 14:30:00+00', location: 'Room 201', status: 'confirmed', unit: 'Pediatrics' },
      { patientIdx: 4, userIdx: 3, starttime: '2026-03-01 15:00:00+00', endtime: '2026-03-01 15:30:00+00', location: 'Emergency Room 1', status: 'confirmed', unit: 'Emergency' },
      { patientIdx: 0, userIdx: 1, starttime: '2026-03-02 09:00:00+00', endtime: '2026-03-02 09:30:00+00', location: 'Room 101', status: 'scheduled', unit: 'Cardiology' },
      { patientIdx: 1, userIdx: 2, starttime: '2026-03-02 10:00:00+00', endtime: '2026-03-02 10:30:00+00', location: 'Room 201', status: 'scheduled', unit: 'Pediatrics' },
      { patientIdx: 2, userIdx: 4, starttime: '2026-03-02 11:00:00+00', endtime: '2026-03-02 11:30:00+00', location: 'Radiology Suite', status: 'scheduled', unit: 'Radiology' },
      { patientIdx: 3, userIdx: 5, starttime: '2026-03-02 14:00:00+00', endtime: '2026-03-02 14:30:00+00', location: 'Lab Room 3', status: 'completed', unit: 'Laboratory' },
      { patientIdx: 4, userIdx: 3, starttime: '2026-03-03 08:00:00+00', endtime: '2026-03-03 10:00:00+00', location: 'Operating Room 2', status: 'scheduled', unit: 'Surgery' },
      { patientIdx: 0, userIdx: 6, starttime: '2026-03-03 13:00:00+00', endtime: '2026-03-03 13:15:00+00', location: 'Pharmacy Counter', status: 'completed', unit: 'Pharmacy' },
      { patientIdx: 1, userIdx: 1, starttime: '2026-03-04 09:00:00+00', endtime: '2026-03-04 09:30:00+00', location: 'Room 101', status: 'scheduled', unit: 'Cardiology' },
      { patientIdx: 2, userIdx: 2, starttime: '2026-03-04 10:00:00+00', endtime: '2026-03-04 10:30:00+00', location: 'Room 201', status: 'cancelled', unit: 'Pediatrics' },
    ];

    for (const appt of appointments) {
      const patient = patients[appt.patientIdx];
      const user = users[appt.userIdx];
      
      await sql`
        INSERT INTO appointments (appointmentid, workspaceid, patientid, doctorid, starttime, endtime, location, status, unit, notes, createdat, updatedat)
        VALUES (
          gen_random_uuid(),
          ${workspaceId},
          ${patient.patientid},
          ${user.userid},
          ${appt.starttime},
          ${appt.endtime},
          ${appt.location},
          ${appt.status}::appointment_status,
          ${appt.unit},
          '{}'::jsonb,
          NOW(),
          NOW()
        )
      `;
      
      console.log(`✅ Appointment: ${patient.firstname} ${patient.lastname} with ${user.name}`);
    }

    console.log(`\n🎉 Fixed ${appointments.length} appointments successfully!`);

  } catch (error) {
    console.error('❌ Error fixing appointments:', error.message);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run
fixAppointments().catch(console.error);
