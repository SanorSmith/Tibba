// Test doctor availability API
const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

async function testDoctorAvailability() {
  try {
    console.log('🔍 Testing doctor availability API...');
    
    const workspaceid = 'fa9fb036-a7eb-49af-890c-54406dad139d';
    
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
    
    // Test the API query directly
    const appointments = await sql`
      SELECT 
        appointmentid,
        starttime,
        endtime,
        status,
        appointmentname,
        appointmenttype,
        location,
        unit
      FROM appointments
      WHERE doctorid = ${doctor.userid}
      AND workspaceid = ${workspaceid}
      AND status NOT IN ('cancelled', 'completed')
      AND starttime >= NOW() - INTERVAL '7 days'
      AND starttime <= NOW() + INTERVAL '30 days'
      ORDER BY starttime ASC
    `;
    
    console.log(`\n📋 Found ${appointments.length} appointments for this doctor:\n`);
    
    appointments.forEach((apt, index) => {
      console.log(`${index + 1}. ${new Date(apt.starttime).toLocaleString()}`);
      console.log(`   Status: ${apt.status}`);
      console.log(`   Type: ${apt.appointmenttype}`);
      console.log(`   Location: ${apt.location || 'N/A'}`);
      console.log(`   Duration: ${Math.round((new Date(apt.endtime) - new Date(apt.starttime)) / 60000)} minutes`);
      console.log('');
    });
    
    // Transform into booked slots format
    const bookedSlots = appointments.map(apt => ({
      appointmentId: apt.appointmentid,
      startTime: apt.starttime,
      endTime: apt.endtime,
      status: apt.status,
      date: new Date(apt.starttime).toISOString().split('T')[0],
      timeSlot: {
        start: new Date(apt.starttime),
        end: new Date(apt.endtime)
      }
    }));
    
    console.log('📊 Booked slots summary:');
    console.log(`  Total appointments: ${bookedSlots.length}`);
    
    // Group by date
    const byDate = bookedSlots.reduce((acc, slot) => {
      if (!acc[slot.date]) acc[slot.date] = [];
      acc[slot.date].push(slot);
      return acc;
    }, {});
    
    Object.keys(byDate).forEach(date => {
      console.log(`  ${date}: ${byDate[date].length} appointment(s)`);
    });
    
    console.log('\n✅ Doctor availability test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

testDoctorAvailability();
