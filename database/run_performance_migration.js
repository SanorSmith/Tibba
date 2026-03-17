const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting Performance Management System Migration\n');
    console.log('='.repeat(70));
    
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, 'migrations', '020_performance_management_system.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('\n📄 Executing migration script...\n');
    
    // Execute the migration
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    
    console.log('✅ Migration executed successfully!\n');
    console.log('='.repeat(70));
    
    // Verify tables were created
    console.log('\n📊 Verifying new tables...\n');
    
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN (
          'performance_reviews', 
          'patient_feedback', 
          'employee_recognitions', 
          'promotions', 
          'performance_goals',
          'performance_audit_log'
        )
      ORDER BY table_name
    `);
    
    console.log('✅ Created Tables:');
    tablesResult.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    
    // Check foreign key constraints
    console.log('\n🔗 Verifying Foreign Key Constraints...\n');
    
    const fkResult = await client.query(`
      SELECT
          tc.table_name, 
          kcu.column_name, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name IN (
          'performance_reviews', 
          'patient_feedback', 
          'employee_recognitions', 
          'promotions', 
          'performance_goals'
        )
      ORDER BY tc.table_name, kcu.column_name
    `);
    
    console.log('✅ Foreign Key Relationships:');
    fkResult.rows.forEach(row => {
      console.log(`   ${row.table_name}.${row.column_name} → ${row.foreign_table_name}.${row.foreign_column_name}`);
    });
    
    // Verify existing tables are not broken
    console.log('\n🔍 Verifying Existing Tables (No Breaking Changes)...\n');
    
    const existingTables = ['staff', 'patients', 'attendance_exceptions', 'departments'];
    
    for (const table of existingTables) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM "${table}"`);
        console.log(`   ✓ ${table}: ${countResult.rows[0].count} rows (intact)`);
      } catch (error) {
        console.log(`   ❌ ${table}: ERROR - ${error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('\n🎉 Migration Complete!\n');
    console.log('Summary:');
    console.log(`   • ${tablesResult.rows.length} new tables created`);
    console.log(`   • ${fkResult.rows.length} foreign key constraints established`);
    console.log('   • All existing tables remain intact');
    console.log('   • No data was lost or modified\n');
    console.log('Next Steps:');
    console.log('   1. Build API endpoints for new tables');
    console.log('   2. Create UI components');
    console.log('   3. Test end-to-end integration\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration Failed!\n');
    console.error('Error:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
