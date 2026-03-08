const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function insertAttendanceRecords() {
  try {
    console.log('📊 Inserting attendance records into database...');
    
    // Read attendance JSON
    const attendanceData = JSON.parse(fs.readFileSync('G:\\Windsurf Workspace\\Tibbna_openEhr\\tibbna-hospital\\src\\data\\hr\\attendance.json', 'utf8'));
    
    // Take first 10 attendance summaries
    const attendanceRecords = attendanceData.daily_summaries.slice(0, 10);
    
    for (const record of attendanceRecords) {
      // Get employee UUID from employee_id
      const empResult = await pool.query('SELECT id FROM employees WHERE employee_id = $1', [record.employee_id]);
      
      if (empResult.rows.length === 0) {
        console.log(`⚠️  Skipped: ${record.employee_id} - Employee not found in database`);
        continue;
      }
      
      const employeeUuid = empResult.rows[0].id;
      
      // Get shift UUID from shift code (extract code from SHIFT-DAY -> DAY)
      const shiftCode = record.shift_id.replace('SHIFT-', '');
      const shiftResult = await pool.query('SELECT id FROM shifts WHERE code = $1', [shiftCode]);
      
      if (shiftResult.rows.length === 0) {
        console.log(`⚠️  Skipped: ${record.employee_id} - Shift ${shiftCode} not found in database`);
        continue;
      }
      
      const shiftUuid = shiftResult.rows[0].id;
      
      const sql = `
        INSERT INTO daily_attendance (
          id, employee_id, date, shift_id, first_in, last_out, total_hours,
          regular_hours, overtime_hours, late_arrival_minutes, status, organization_id
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        )
        ON CONFLICT (employee_id, date) DO UPDATE SET
          shift_id = EXCLUDED.shift_id,
          first_in = EXCLUDED.first_in,
          last_out = EXCLUDED.last_out,
          total_hours = EXCLUDED.total_hours,
          regular_hours = EXCLUDED.regular_hours,
          overtime_hours = EXCLUDED.overtime_hours,
          late_arrival_minutes = EXCLUDED.late_arrival_minutes,
          status = EXCLUDED.status,
          updated_at = CURRENT_TIMESTAMP
      `;
      
      // Convert time strings to timestamps
      const firstInTimestamp = record.first_in ? `${record.date} ${record.first_in}:00` : null;
      const lastOutTimestamp = record.last_out ? `${record.date} ${record.last_out}:00` : null;
      
      await pool.query(sql, [
        employeeUuid, record.date, shiftUuid, firstInTimestamp, lastOutTimestamp,
        record.total_hours, record.regular_hours, record.overtime_hours,
        record.late_minutes, record.status, '00000000-0000-0000-0000-000000000001'
      ]);
      
      console.log(`✅ Inserted: ${record.employee_id} - ${record.date} (${record.status})`);
    }
    
    // Verify count
    const result = await pool.query('SELECT COUNT(*) as count FROM daily_attendance');
    console.log(`📊 Total attendance records in database: ${result.rows[0].count}`);
    
    // Show sample data
    const sample = await pool.query('SELECT employee_id, date, status, total_hours FROM daily_attendance LIMIT 5');
    console.log('\n📋 Sample records:');
    sample.rows.forEach(row => {
      console.log(`  ${row.employee_id} | ${row.date} | ${row.status} | ${row.total_hours}h`);
    });
    
  } catch(err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

insertAttendanceRecords();
