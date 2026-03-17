const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkKeyRelatedTables() {
  try {
    // Focus on the most relevant tables for attendance/exception system
    const keyTables = [
      'daily_schedule_details',
      'leave_requests', 
      'leave_approval_workflow',
      'leave_audit_log',
      'leave_balance',
      'appointments',
      'notification_preferences',
      'audit_logs'
    ];
    
    console.log('🔍 Checking Key Attendance-Related Tables:');
    
    for (const tableName of keyTables) {
      try {
        // Check if table exists
        const existsResult = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = '${tableName}'
          ) as exists
        `);
        
        if (existsResult.rows[0].exists) {
          // Get table structure
          const columnsResult = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = '${tableName}' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
          `);
          
          // Get record count
          const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
          
          // Get sample data if available
          let sampleData = null;
          if (countResult.rows[0].count > 0) {
            const sampleResult = await pool.query(`SELECT * FROM ${tableName} LIMIT 1`);
            sampleData = sampleResult.rows[0];
          }
          
          console.log(`\n📋 ${tableName} (${countResult.rows[0].count} records)`);
          console.log('   Columns:', columnsResult.rows.map(c => `${c.column_name}:${c.data_type}`).join(', '));
          
          if (sampleData) {
            console.log('   Sample:', JSON.stringify(sampleData, null, 2));
          }
          
          // Analyze relevance
          console.log('   🎯 Relevance:');
          if (tableName === 'daily_schedule_details') {
            console.log('     - Detailed daily schedule information');
            console.log('     - Could show planned vs actual attendance');
          } else if (tableName === 'leave_requests') {
            console.log('     - Employee leave requests');
            console.log('     - Cross-reference with attendance exceptions');
          } else if (tableName === 'leave_approval_workflow') {
            console.log('     - Leave approval process tracking');
            console.log('     - Workflow management for leave');
          } else if (tableName === 'leave_audit_log') {
            console.log('     - Audit trail for leave changes');
            console.log('     - Compliance tracking');
          } else if (tableName === 'leave_balance') {
            console.log('     - Employee leave balances');
            console.log('     - Leave entitlement tracking');
          } else if (tableName === 'appointments') {
            console.log('     - Patient appointments (could affect staff availability)');
            console.log('     - Staff scheduling conflicts');
          } else if (tableName === 'notification_preferences') {
            console.log('     - Notification settings for exceptions');
            console.log('     - Alert system integration');
          } else if (tableName === 'audit_logs') {
            console.log('     - System audit trail');
            console.log('     - Exception tracking compliance');
          }
        } else {
          console.log(`\n❌ ${tableName} - Table does not exist`);
        }
        
      } catch (error) {
        console.error(`❌ Error checking ${tableName}:`, error.message);
      }
    }
    
    // Check for any foreign key relationships
    console.log('\n🔗 Foreign Key Relationships Analysis:');
    try {
      const fkResult = await pool.query(`
        SELECT 
          tc.table_name, 
          kcu.column_name, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name 
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND (tc.table_name LIKE '%attendance%' OR tc.table_name LIKE '%leave%' OR tc.table_name LIKE '%schedule%' OR tc.table_name LIKE '%shift%')
        ORDER BY tc.table_name, kcu.column_name
      `);
      
      if (fkResult.rows.length > 0) {
        fkResult.rows.forEach(fk => {
          console.log(`   ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
        });
      } else {
        console.log('   No foreign key relationships found in attendance-related tables');
      }
      
    } catch (error) {
      console.error('❌ Error checking foreign keys:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkKeyRelatedTables();
