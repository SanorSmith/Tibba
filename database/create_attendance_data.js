const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function createAttendanceData() {
  try {
    console.log('🔨 Creating attendance data...');
    
    // Get staff records
    const staffResult = await pool.query('SELECT staffid, firstname, lastname, custom_staff_id FROM staff LIMIT 3');
    
    if (staffResult.rows.length === 0) {
      console.log('❌ No staff records found. Creating staff first...');
      await createSampleStaff();
      // Try again after creating staff
      const staffResult2 = await pool.query('SELECT staffid, firstname, lastname, custom_staff_id FROM staff LIMIT 3');
      if (staffResult2.rows.length === 0) {
        console.log('❌ Still no staff records. Please check staff table.');
        return;
      }
      staffResult.rows = staffResult2.rows;
    }
    
    // Get shift records
    const shiftResult = await pool.query('SELECT id, code, name FROM shifts LIMIT 2');
    
    if (shiftResult.rows.length === 0) {
      console.log('❌ No shift records found. Creating sample shift...');
      await createSampleShift();
      const shiftResult2 = await pool.query('SELECT id, code, name FROM shifts LIMIT 2');
      if (shiftResult2.rows.length === 0) {
        console.log('❌ Still no shift records. Please check shifts table.');
        return;
      }
      shiftResult.rows = shiftResult2.rows;
    }
    
    console.log(`✅ Found ${staffResult.rows.length} staff and ${shiftResult.rows.length} shifts`);
    
    // Create attendance records for the last 7 days
    const today = new Date();
    let recordsCreated = 0;
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      for (const staff of staffResult.rows) {
        const shift = shiftResult.rows[0]; // Use first shift
        
        // Randomly decide if employee was present (80% chance)
        const isPresent = Math.random() > 0.2;
        const status = isPresent ? 'PRESENT' : 'ABSENT';
        
        if (isPresent) {
          // Create attendance record with times
          await pool.query(`
            INSERT INTO daily_attendance (
              employee_id, date, shift_id, status, first_in, last_out, 
              total_hours, regular_hours, overtime_hours, late_arrival_minutes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            staff.staffid,
            dateStr,
            shift.id,
            status,
            `${dateStr} 08:00:00`,
            `${dateStr} 16:30:00`,
            8.5,
            8.0,
            0.5,
            Math.random() > 0.7 ? 15 : 0
          ]);
          
          console.log(`✅ ${staff.firstname} ${staff.lastname} - ${dateStr} - ${status} (8.5h)`);
          recordsCreated++;
        } else {
          // Create absent record
          await pool.query(`
            INSERT INTO daily_attendance (
              employee_id, date, shift_id, status
            ) VALUES ($1, $2, $3, $4)
          `, [staff.staffid, dateStr, shift.id, status]);
          
          console.log(`✅ ${staff.firstname} ${staff.lastname} - ${dateStr} - ${status}`);
          recordsCreated++;
        }
      }
    }
    
    console.log(`✅ Created ${recordsCreated} attendance records successfully!`);
    
    // Verify created records
    const finalCount = await pool.query('SELECT COUNT(*) as count FROM daily_attendance');
    console.log(`📊 Total attendance records now: ${finalCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error creating attendance data:', error.message);
  } finally {
    await pool.end();
  }
}

async function createSampleStaff() {
  try {
    console.log('👥 Creating sample staff...');
    
    const sampleStaff = [
      {
        staffid: '00000000-0000-0000-0000-000000000001',
        firstname: 'John',
        lastname: 'Doe',
        custom_staff_id: 'STAFF-001',
        email: 'john.doe@hospital.com',
        phone: '123-456-7890',
        unit: 'Emergency',
        position: 'Doctor',
        hire_date: new Date().toISOString().split('T')[0]
      },
      {
        staffid: '00000000-0000-0000-0000-000000000002',
        firstname: 'Jane',
        lastname: 'Smith',
        custom_staff_id: 'STAFF-002',
        email: 'jane.smith@hospital.com',
        phone: '123-456-7891',
        unit: 'Emergency',
        position: 'Nurse',
        hire_date: new Date().toISOString().split('T')[0]
      },
      {
        staffid: '00000000-0000-0000-0000-000000000003',
        firstname: 'Mike',
        lastname: 'Johnson',
        custom_staff_id: 'STAFF-003',
        email: 'mike.johnson@hospital.com',
        phone: '123-456-7892',
        unit: 'Emergency',
        position: 'Technician',
        hire_date: new Date().toISOString().split('T')[0]
      }
    ];
    
    for (const staff of sampleStaff) {
      await pool.query(`
        INSERT INTO staff (
          staffid, firstname, lastname, custom_staff_id, email, phone, unit, position, hire_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        staff.staffid,
        staff.firstname,
        staff.lastname,
        staff.custom_staff_id,
        staff.email,
        staff.phone,
        staff.unit,
        staff.position,
        staff.hire_date
      ]);
    }
    
    console.log('✅ Created 3 sample staff records');
  } catch (error) {
    console.error('❌ Error creating staff:', error.message);
  }
}

async function createSampleShift() {
  try {
    console.log('⏰ Creating sample shifts...');
    
    const sampleShifts = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        code: 'DAY',
        name: 'Day Shift',
        start_time: '08:00:00',
        end_time: '16:30:00',
        hours: 8.5
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        code: 'NIGHT',
        name: 'Night Shift',
        start_time: '20:00:00',
        end_time: '04:30:00',
        hours: 8.5
      }
    ];
    
    for (const shift of sampleShifts) {
      await pool.query(`
        INSERT INTO shifts (
          id, code, name, start_time, end_time, hours
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        shift.id,
        shift.code,
        shift.name,
        shift.start_time,
        shift.end_time,
        shift.hours
      ]);
    }
    
    console.log('✅ Created 2 sample shift records');
  } catch (error) {
    console.error('❌ Error creating shifts:', error.message);
  }
}

createAttendanceData();
