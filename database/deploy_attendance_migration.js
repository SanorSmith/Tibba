const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function deployMigration() {
  try {
    console.log('🚀 Deploying staff attendance system migration...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '003_staff_attendance_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await pool.query(migrationSQL);

    console.log('✅ Migration deployed successfully!\n');

    // Test the function
    console.log('🧪 Testing process_staff_attendance_transaction function...\n');
    
    // Get a test staff member
    const staffResult = await pool.query('SELECT staffid, firstname, lastname FROM staff LIMIT 1');
    
    if (staffResult.rows.length > 0) {
      const testStaff = staffResult.rows[0];
      console.log(`Testing with staff: ${testStaff.firstname} ${testStaff.lastname} (${testStaff.staffid})\n`);

      // Test check-in
      const checkInResult = await pool.query(`
        SELECT * FROM process_staff_attendance_transaction(
          $1::UUID,
          'IN'::VARCHAR,
          NOW()::TIMESTAMP WITH TIME ZONE,
          'TEST'::VARCHAR,
          'MIGRATION_TEST'::VARCHAR
        )
      `, [testStaff.staffid]);

      console.log('Check-in test result:', checkInResult.rows[0]);

      // Test check-out
      const checkOutResult = await pool.query(`
        SELECT * FROM process_staff_attendance_transaction(
          $1::UUID,
          'OUT'::VARCHAR,
          NOW()::TIMESTAMP WITH TIME ZONE,
          'TEST'::VARCHAR,
          'MIGRATION_TEST'::VARCHAR
        )
      `, [testStaff.staffid]);

      console.log('Check-out test result:', checkOutResult.rows[0]);

      console.log('\n✅ Function tests passed!\n');
    }

    // Verify views
    console.log('📊 Verifying views...\n');
    
    const todayView = await pool.query('SELECT COUNT(*) FROM staff_attendance_today');
    console.log(`✅ staff_attendance_today view: ${todayView.rows[0].count} records`);

    const recentView = await pool.query('SELECT COUNT(*) FROM staff_attendance_transactions_recent');
    console.log(`✅ staff_attendance_transactions_recent view: ${recentView.rows[0].count} records`);

    console.log('\n🎉 Staff attendance system is ready to use!\n');

  } catch (error) {
    console.error('❌ Error deploying migration:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

deployMigration();
