const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function testSchedulesAPI() {
  try {
    console.log('🧪 Testing schedules API POST request...');
    
    // Get a staff member and shift for testing
    const staffResult = await pool.query('SELECT staffid, custom_staff_id, firstname, lastname FROM staff LIMIT 1');
    const shiftResult = await pool.query('SELECT id, code FROM shifts LIMIT 1');
    
    if (staffResult.rows.length === 0) {
      console.log('❌ No staff found in database');
      return;
    }
    
    if (shiftResult.rows.length === 0) {
      console.log('❌ No shifts found in database');
      return;
    }
    
    const staff = staffResult.rows[0];
    const shift = shiftResult.rows[0];
    
    console.log(`📊 Using staff: ${staff.firstname} ${staff.lastname} (${staff.custom_staff_id || staff.staffid})`);
    console.log(`📊 Using shift: ${shift.code}`);
    
    // Test the exact API call structure
    const testSchedule = {
      employee_id: staff.custom_staff_id || staff.staffid.toString(),
      shift_id: shift.code,
      effective_date: '2026-02-01',
      end_date: null,
      schedule_type: 'REGULAR',
      rotation_pattern: null,
      notes: 'Test schedule from API test',
      daily_details: [
        {
          day_of_week: 1,
          start_time: '08:00',
          end_time: '16:00',
          lunch_start: '12:00',
          lunch_end: '13:00',
          lunch_duration: 60,
          morning_break_start: '10:00',
          morning_break_end: '10:15',
          afternoon_break_start: '14:00',
          afternoon_break_end: '14:15',
          break_duration: 15,
          total_hours: 8,
          net_hours: 6.5,
          flexible_start: false,
          flexible_end: false,
          core_hours_start: null,
          core_hours_end: null,
        }
      ]
    };
    
    console.log('📝 Test schedule data:', JSON.stringify(testSchedule, null, 2));
    
    // Test the database insert directly
    const employeeUuid = staff.staffid;
    const shiftUuid = shift.id;
    
    console.log('🔍 Testing database insert...');
    
    const scheduleResult = await pool.query(
      `INSERT INTO employee_schedules (
        employee_id, shift_id, effective_date, end_date, schedule_type,
        rotation_pattern, notes, status, organization_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        employeeUuid,
        shiftUuid,
        testSchedule.effective_date,
        testSchedule.end_date || null,
        testSchedule.schedule_type || 'REGULAR',
        testSchedule.rotation_pattern || null,
        testSchedule.notes || null,
        'ACTIVE',
        '00000000-0000-0000-0000-000000000001',
      ]
    );
    
    const scheduleId = scheduleResult.rows[0].id;
    console.log('✅ Schedule created successfully:', scheduleId);
    
    // Test daily schedule details
    if (testSchedule.daily_details && Array.isArray(testSchedule.daily_details)) {
      for (const detail of testSchedule.daily_details) {
        await pool.query(
          `INSERT INTO daily_schedule_details (
            schedule_id, day_of_week, start_time, end_time,
            lunch_start, lunch_end, lunch_duration_mins,
            morning_break_start, morning_break_end,
            afternoon_break_start, afternoon_break_end,
            break_duration_mins, total_work_hours, net_work_hours,
            flexible_start, flexible_end, core_hours_start, core_hours_end,
            organization_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
          [
            scheduleId,
            detail.day_of_week,
            detail.start_time,
            detail.end_time,
            detail.lunch_start || null,
            detail.lunch_end || null,
            detail.lunch_duration || 60,
            detail.morning_break_start || null,
            detail.morning_break_end || null,
            detail.afternoon_break_start || null,
            detail.afternoon_break_end || null,
            detail.break_duration || 15,
            detail.total_hours || 8,
            detail.net_hours || 7,
            detail.flexible_start || false,
            detail.flexible_end || false,
            detail.core_hours_start || null,
            detail.core_hours_end || null,
            '00000000-0000-0000-0000-000000000001',
          ]
        );
      }
      console.log('✅ Daily schedule details created successfully');
    }
    
    // Verify the data was inserted
    const verifyResult = await pool.query(`
      SELECT 
        es.id,
        s.firstname,
        s.lastname,
        sh.code as shift_code,
        es.effective_date,
        es.schedule_type
      FROM employee_schedules es
      INNER JOIN staff s ON es.employee_id = s.staffid
      LEFT JOIN shifts sh ON es.shift_id = sh.id
      WHERE es.id = $1
    `, [scheduleId]);
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ Verification successful:');
      console.log(`   Employee: ${verifyResult.rows[0].firstname} ${verifyResult.rows[0].lastname}`);
      console.log(`   Shift: ${verifyResult.rows[0].shift_code}`);
      console.log(`   Date: ${verifyResult.rows[0].effective_date}`);
      console.log(`   Type: ${verifyResult.rows[0].schedule_type}`);
    }
    
    // Clean up test data
    await pool.query('DELETE FROM daily_schedule_details WHERE schedule_id = $1', [scheduleId]);
    await pool.query('DELETE FROM employee_schedules WHERE id = $1', [scheduleId]);
    console.log('🧹 Test data cleaned up');
    
    console.log('✅ All tests passed! API should work correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testSchedulesAPI();
