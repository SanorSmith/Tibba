const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkTables() {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%attendance%' OR table_name LIKE '%exception%' OR table_name LIKE '%shift%')
      ORDER BY table_name
    `);
    
    console.log('📊 Attendance-related tables:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Check if exceptions table exists
    const exceptionsCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'attendance_exceptions'
      ) as exists
    `);
    
    console.log(`\n📋 Attendance exceptions table exists: ${exceptionsCheck.rows[0].exists}`);
    
    // Check structure of attendance_transactions table
    const attendanceTxCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'attendance_transactions' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    if (attendanceTxCheck.rows.length > 0) {
      console.log('\n📋 attendance_transactions columns:');
      attendanceTxCheck.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
      });
    }
    
    // Check structure of daily_attendance table
    const dailyAttendanceCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'daily_attendance' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    if (dailyAttendanceCheck.rows.length > 0) {
      console.log('\n📋 daily_attendance columns:');
      dailyAttendanceCheck.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();
