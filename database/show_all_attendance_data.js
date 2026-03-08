const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function showAllAttendanceData() {
  try {
    console.log('🔍 Fetching all attendance data from database...');
    console.log('=' .repeat(80));
    
    // Get all attendance records with full details
    const query = `
      SELECT 
        da.id,
        da.employee_id,
        s.custom_staff_id as employee_number,
        s.firstname as first_name,
        s.lastname as last_name,
        s.unit as department_name,
        da.date,
        da.shift_id,
        sh.code as shift_code,
        sh.name as shift_name,
        da.first_in,
        da.last_out,
        da.total_hours,
        da.regular_hours,
        da.overtime_hours,
        da.late_arrival_minutes,
        da.status,
        da.created_at,
        da.updated_at,
        COALESCE(lr.status, null) as leave_status,
        COALESCE(lr.leave_type_code, null) as leave_type_code,
        lr.start_date as leave_start_date,
        lr.end_date as leave_end_date
      FROM daily_attendance da
      INNER JOIN staff s ON da.employee_id = s.staffid
      LEFT JOIN shifts sh ON da.shift_id = sh.id
      LEFT JOIN leave_requests lr ON 
        s.staffid = lr.employee_id AND 
        da.date BETWEEN lr.start_date AND COALESCE(lr.return_date, lr.end_date)
      ORDER BY da.date DESC, s.firstname ASC
    `;
    
    const result = await pool.query(query);
    console.log(`📊 Total attendance records: ${result.rows.length}`);
    console.log('=' .repeat(80));
    
    if (result.rows.length === 0) {
      console.log('❌ No attendance records found in the database.');
      return;
    }
    
    // Group by date for better readability
    const groupedByDate = {};
    result.rows.forEach(row => {
      const date = row.date.toISOString().split('T')[0];
      if (!groupedByDate[date]) {
        groupedByDate[date] = [];
      }
      groupedByDate[date].push(row);
    });
    
    // Display data grouped by date
    Object.keys(groupedByDate).forEach(date => {
      console.log(`\n📅 Date: ${date}`);
      console.log('-'.repeat(50));
      
      groupedByDate[date].forEach((record, index) => {
        const isOnLeave = !!record.leave_status;
        const leaveInfo = isOnLeave 
          ? `(${record.leave_type_code} leave)` 
          : '';
        
        console.log(`${index + 1}. ${record.first_name} ${record.last_name} - ${record.custom_staff_id || 'N/A'}`);
        console.log(`   Department: ${record.department_name}`);
        console.log(`   Status: ${record.status} ${leaveInfo}`);
        
        if (!isOnLeave) {
          console.log(`   Time: ${record.first_in ? new Date(record.first_in).toTimeString().slice(0, 5) : '--:--'} - ${record.last_out ? new Date(record.last_out).toTimeString().slice(0, 5) : '--:--'}`);
          console.log(`   Hours: ${record.total_hours}h total, ${record.regular_hours}h regular, ${record.overtime_hours}h overtime`);
        } else {
          console.log(`   Time: --:-- - --:-- (ON LEAVE)`);
          console.log(`   Hours: 0h total, 0h regular, 0h overtime`);
          console.log(`   Leave: ${record.leave_type_code} from ${record.leave_start_date ? record.leave_start_date.toISOString().split('T')[0] : 'N/A'} to ${record.leave_end_date ? record.leave_end_date.toISOString().split('T')[0] : 'N/A'}`);
        }
        console.log(`   Shift: ${record.shift_name || 'N/A'} (${record.shift_code || 'N/A'})`);
        console.log('');
      });
    });
    
    // Summary statistics
    console.log('\n📈 Summary Statistics');
    console.log('=' .repeat(80));
    
    const totalRecords = result.rows.length;
    const presentRecords = result.rows.filter(r => r.status === 'PRESENT').length;
    const absentRecords = result.rows.filter(r => r.status === 'ABSENT').length;
    const onLeaveRecords = result.rows.filter(r => r.leave_status).length;
    
    const totalHours = result.rows.reduce((sum, r) => sum + parseFloat(r.total_hours || 0), 0);
    const regularHours = result.rows.reduce((sum, r) => sum + parseFloat(r.regular_hours || 0), 0);
    const overtimeHours = result.rows.reduce((sum, r) => sum + parseFloat(r.overtime_hours || 0), 0);
    
    const uniqueDates = [...new Set(result.rows.map(r => r.date.toISOString().split('T')[0]))];
    
    console.log(`📊 Total Records: ${totalRecords}`);
    console.log(`📅 Unique Dates: ${uniqueDates.length}`);
    console.log(`✅ Present: ${presentRecords}`);
    console.log(`❌ Absent: ${absentRecords}`);
    console.log(`🏖️ On Leave: ${onLeaveRecords}`);
    console.log(`⏰ Total Hours: ${totalHours.toFixed(1)}h`);
    console.log(`👷 Regular Hours: ${regularHours.toFixed(1)}h`);
    console.log(`⚡ Overtime Hours: ${overtimeHours.toFixed(1)}h`);
    
    // Leave summary
    const leaveTypes = {};
    result.rows.filter(r => r.leave_type_code).forEach(r => {
      leaveTypes[r.leave_type_code] = (leaveTypes[r.leave_type_code] || 0) + 1;
    });
    
    if (Object.keys(leaveTypes).length > 0) {
      console.log('\n🏖️ Leave Types Summary');
      console.log('-'.repeat(50));
      Object.entries(leaveTypes).forEach(([code, count]) => {
        console.log(`${code}: ${count} day(s)`);
      });
    }
    
    // Department summary
    const departments = {};
    result.rows.forEach(r => {
      const dept = r.department_name || 'Unknown';
      departments[dept] = (departments[dept] || 0) + 1;
    });
    
    console.log('\n🏢 Department Summary');
    console.log('-'.repeat(50));
    Object.entries(departments).forEach(([dept, count]) => {
      console.log(`${dept}: ${count} record(s)`);
    });
    
  } catch (error) {
    console.error('❌ Error fetching attendance data:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

showAllAttendanceData();
