const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function createTestScheduleDetails() {
  try {
    console.log('🧪 Creating test schedule details...');
    
    // Get existing schedules
    const scheduleResult = await pool.query(`
      SELECT es.id, es.employee_id, s.firstname, s.lastname
      FROM employee_schedules es
      LEFT JOIN staff s ON es.employee_id = s.staffid
      LIMIT 2
    `);
    
    if (scheduleResult.rows.length === 0) {
      console.log('❌ No schedules found. Please create a schedule first.');
      return;
    }
    
    for (const schedule of scheduleResult.rows) {
      const scheduleId = schedule.id;
      const employeeName = `${schedule.firstname} ${schedule.lastname}`;
      
      console.log(`📅 Creating details for schedule ${scheduleId} (${employeeName})`);
      
      // Clear existing details for this schedule
      await pool.query('DELETE FROM daily_schedule_details WHERE schedule_id = $1', [scheduleId]);
      
      // Create daily details for a standard work week (Monday-Friday)
      const workDays = [
        { day: 1, start: '08:00', end: '16:00', lunch_start: '12:00', lunch_end: '13:00', total: 8, net: 7 }, // Monday
        { day: 2, start: '08:00', end: '16:00', lunch_start: '12:00', lunch_end: '13:00', total: 8, net: 7 }, // Tuesday
        { day: 3, start: '08:00', end: '16:00', lunch_start: '12:00', lunch_end: '13:00', total: 8, net: 7 }, // Wednesday
        { day: 4, start: '08:00', end: '16:00', lunch_start: '12:00', lunch_end: '13:00', total: 8, net: 7 }, // Thursday
        { day: 5, start: '08:00', end: '16:00', lunch_start: '12:00', lunch_end: '13:00', total: 8, net: 7 }, // Friday
      ];
      
      for (const workDay of workDays) {
        await pool.query(`
          INSERT INTO daily_schedule_details (
            schedule_id, day_of_week, start_time, end_time, 
            lunch_start, lunch_end, total_work_hours, net_work_hours
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          scheduleId, workDay.day, workDay.start, workDay.end,
          workDay.lunch_start, workDay.lunch_end, workDay.total, workDay.net
        ]);
      }
      
      console.log(`✅ Created 5 work days for ${employeeName}`);
    }
    
    // Verify the data
    const verifyResult = await pool.query(`
      SELECT 
        es.id,
        s.firstname,
        s.lastname,
        COUNT(dsd.id) as detail_count
      FROM employee_schedules es
      LEFT JOIN staff s ON es.employee_id = s.staffid
      LEFT JOIN daily_schedule_details dsd ON es.id = dsd.schedule_id
      GROUP BY es.id, s.firstname, s.lastname
      ORDER BY s.firstname, s.lastname
    `);
    
    console.log('\n📊 Schedule Details Summary:');
    console.log('================================');
    verifyResult.rows.forEach(row => {
      console.log(`👤 ${row.firstname} ${row.lastname}: ${row.detail_count} days scheduled`);
    });
    
    console.log('\n🎉 Test schedule details created successfully!');
    console.log('🔗 You can now test the detail view at: /hr/schedules/[schedule-id]');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createTestScheduleDetails();
