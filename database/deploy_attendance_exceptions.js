const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function deployAttendanceExceptions() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting attendance_exceptions table deployment...\n');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '004_create_attendance_exceptions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    console.log('📝 Executing migration...');
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    
    console.log('✅ Migration executed successfully!\n');
    
    // Verify table creation
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'attendance_exceptions'
      ) as exists
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ Table attendance_exceptions created successfully');
      
      // Check table structure
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'attendance_exceptions' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `);
      
      console.log(`\n📋 Table structure (${columnsResult.rows.length} columns):`);
      columnsResult.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
      });
      
      // Check indexes
      const indexesResult = await client.query(`
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'attendance_exceptions'
        ORDER BY indexname
      `);
      
      console.log(`\n📊 Indexes created (${indexesResult.rows.length}):`);
      indexesResult.rows.forEach(idx => {
        console.log(`   - ${idx.indexname}`);
      });
      
      // Check view
      const viewCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.views 
          WHERE table_schema = 'public' 
          AND table_name = 'attendance_exceptions_detailed'
        ) as exists
      `);
      
      if (viewCheck.rows[0].exists) {
        console.log('\n✅ View attendance_exceptions_detailed created successfully');
      }
      
      // Check function
      const functionCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM pg_proc 
          WHERE proname = 'detect_attendance_exceptions'
        ) as exists
      `);
      
      if (functionCheck.rows[0].exists) {
        console.log('✅ Function detect_attendance_exceptions created successfully');
      }
      
      // Test the detection function on existing data
      console.log('\n🔍 Testing exception detection on existing attendance data...');
      const detectionResult = await client.query(`
        SELECT * FROM detect_attendance_exceptions((CURRENT_DATE - INTERVAL '7 days')::DATE)
      `);
      
      if (detectionResult.rows.length > 0) {
        console.log(`✅ Detection function works! Found ${detectionResult.rows[0].exceptions_detected} exceptions`);
      }
      
      // Check how many exceptions were created
      const countResult = await client.query('SELECT COUNT(*) as count FROM attendance_exceptions');
      console.log(`\n📊 Total exceptions in table: ${countResult.rows[0].count}`);
      
      if (countResult.rows[0].count > 0) {
        const sampleResult = await client.query(`
          SELECT exception_type, severity, COUNT(*) as count 
          FROM attendance_exceptions 
          GROUP BY exception_type, severity
          ORDER BY exception_type, severity
        `);
        
        console.log('\n📋 Exception breakdown:');
        sampleResult.rows.forEach(row => {
          console.log(`   - ${row.exception_type} (${row.severity}): ${row.count}`);
        });
      }
      
      console.log('\n✅ Deployment completed successfully!');
      console.log('\n📌 Next steps:');
      console.log('   1. Create API endpoint for attendance exceptions');
      console.log('   2. Update Attendance Exceptions page to use database');
      console.log('   3. Test integration with existing systems');
      
    } else {
      console.error('❌ Table creation failed');
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Deployment failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

deployAttendanceExceptions();
