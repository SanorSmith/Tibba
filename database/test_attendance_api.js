const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function testAttendanceAPI() {
  try {
    console.log('🔍 Testing attendance API query...');
    
    // Test the exact query from the API
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
      WHERE da.date = '2026-02-01'
      ORDER BY da.date DESC, s.firstname ASC
      LIMIT 5
    `;
    
    const result = await pool.query(query);
    console.log('✅ Query executed successfully');
    console.log(`📊 Found ${result.rows.length} records`);
    
    // Check the data structure
    if (result.rows.length > 0) {
      console.log('📋 Sample record structure:');
      const sampleRow = result.rows[0];
      Object.keys(sampleRow).forEach(key => {
        console.log(`  ${key}: ${sampleRow[key]} (${typeof sampleRow[key]})`);
      });
    }
    
    // Test formatting
    const formattedRecords = result.rows.map(row => {
      let actualStatus = row.status;
      let statusDisplay = row.status;
      
      if (row.leave_status) {
        actualStatus = 'ON_LEAVE';
        statusDisplay = row.leave_status;
      }
      
      return {
        id: row.id,
        employee_name: `${row.first_name} ${row.last_name}`,
        date: row.date.toISOString().split('T')[0],
        status: statusDisplay,
        actual_status: actualStatus,
        leave_status: row.leave_status,
        leave_type_code: row.leave_type_code,
        leave_start_date: row.leave_start_date ? row.leave_start_date.toISOString().split('T')[0] : null,
        leave_end_date: row.leave_end_date ? row.leave_end_date.toISOString().split('T')[0] : null,
        is_on_leave: !!row.leave_status,
      };
    });
    
    console.log('\n✅ Formatted records:');
    formattedRecords.forEach((record, index) => {
      console.log(`${index + 1}. ${record.employee_name} - ${record.date} - ${record.status} (on_leave: ${record.is_on_leave})`);
    });
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

testAttendanceAPI();
