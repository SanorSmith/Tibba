/**
 * Clean HR Demo Data Script
 * Removes all demo data from HR models and leaves only 1 demo record per table
 */

import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL || process.env.TIBBNA_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Database URL is not configured');
}

const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

interface CleanupResult {
  table: string;
  recordsBefore: number;
  recordsAfter: number;
  recordsDeleted: number;
  status: 'success' | 'error';
  error?: string;
}

async function cleanupHRData(): Promise<void> {
  console.log('🧹 Starting HR Demo Data Cleanup...\n');

  const results: CleanupResult[] = [];
  
  // Define HR tables to clean up
  const hrTables = [
    'attendance_records',
    'leave_requests', 
    'payroll_transactions',
    'employees',
    'departments',
    'shifts',
    'leave_types',
    'payroll_periods',
    'alerts',
    'workflows',
    'workflow_steps',
    'workflow_runs',
    'alert_rules',
    'notification_queue',
    'audit_logs'
  ];

  for (const tableName of hrTables) {
    try {
      console.log(`📊 Processing table: ${tableName}`);
      
      // Check if table exists
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        )
      `;

      if (!tableExists[0].exists) {
        console.log(`⚠️  Table ${tableName} does not exist, skipping...`);
        continue;
      }

      // Get count before cleanup
      const countBefore = await sql`
        SELECT COUNT(*) as count FROM ${sql.unsafe(tableName)}
      `;
      const recordsBefore = parseInt(countBefore[0].count);

      // Skip if table is already empty or has only 1 record
      if (recordsBefore <= 1) {
        console.log(`✅ Table ${tableName} already has ${recordsBefore} record(s), skipping...`);
        results.push({
          table: tableName,
          recordsBefore,
          recordsAfter: recordsBefore,
          recordsDeleted: 0,
          status: 'success'
        });
        continue;
      }

      // Get the first record to keep (preserve one demo record)
      const firstRecord = await sql.unsafe(`
        SELECT * FROM ${tableName} LIMIT 1
      `);

      if (firstRecord.length === 0) {
        console.log(`⚠️  No records found in ${tableName}`);
        continue;
      }

      // Get primary key column name
      const primaryKeyColumn = await sql.unsafe(`
        SELECT column_name 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name 
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY' 
        AND tc.table_name = ${tableName}
      `);

      let pkColumn = 'id'; // default fallback
      if (primaryKeyColumn.length > 0) {
        pkColumn = primaryKeyColumn[0].column_name;
      }

      // Delete all records except the first one
      const firstRecordId = firstRecord[0][pkColumn];
      
      await sql.unsafe(`
        DELETE FROM ${tableName} 
        WHERE ${sql.unsafe(pkColumn)} != ${firstRecordId}
      `);

      // Get count after cleanup
      const countAfter = await sql`
        SELECT COUNT(*) as count FROM ${sql.unsafe(tableName)}
      `;
      const recordsAfter = parseInt(countAfter[0].count);
      const recordsDeleted = recordsBefore - recordsAfter;

      console.log(`✅ ${tableName}: ${recordsBefore} → ${recordsAfter} (deleted ${recordsDeleted})`);
      
      results.push({
        table: tableName,
        recordsBefore,
        recordsAfter,
        recordsDeleted,
        status: 'success'
      });

    } catch (error: any) {
      console.error(`❌ Error cleaning ${tableName}:`, error.message);
      results.push({
        table: tableName,
        recordsBefore: 0,
        recordsAfter: 0,
        recordsDeleted: 0,
        status: 'error',
        error: error.message
      });
    }
  }

  // Print summary
  console.log('\n📋 Cleanup Summary:');
  console.log('=' .repeat(80));
  
  let totalDeleted = 0;
  let totalErrors = 0;
  
  results.forEach(result => {
    if (result.status === 'success') {
      console.log(`✅ ${result.table.padEnd(20)}: ${result.recordsBefore.toString().padStart(4)} → ${result.recordsAfter.toString().padStart(3)} (deleted ${result.recordsDeleted.toString().padStart(3)})`);
      totalDeleted += result.recordsDeleted;
    } else {
      console.log(`❌ ${result.table.padEnd(20)}: ERROR - ${result.error}`);
      totalErrors++;
    }
  });
  
  console.log('=' .repeat(80));
  console.log(`📊 Total records deleted: ${totalDeleted}`);
  console.log(`📊 Tables processed: ${results.length}`);
  console.log(`📊 Errors: ${totalErrors}`);
  
  if (totalErrors === 0) {
    console.log('\n🎉 HR Demo Data Cleanup completed successfully!');
  } else {
    console.log(`\n⚠️  Cleanup completed with ${totalErrors} errors.`);
  }

  // Close connection
  await sql.end();
}

// Create minimal demo data if tables are completely empty
async function createMinimalDemoData(): Promise<void> {
  console.log('\n🔧 Creating minimal demo data...');
  
  try {
    // Create one department if none exists
    const deptCount = await sql`SELECT COUNT(*) as count FROM departments`;
    if (parseInt(deptCount[0].count) === 0) {
      await sql`
        INSERT INTO departments (id, name, code, type, active) 
        VALUES ('dept-001', 'Executive Management', 'EXEC', 'department', true)
      `;
      console.log('✅ Created demo department');
    }

    // Create one employee if none exists
    const empCount = await sql`SELECT COUNT(*) as count FROM employees`;
    if (parseInt(empCount[0].count) === 0) {
      const dept = await sql`SELECT id FROM departments LIMIT 1`;
      await sql`
        INSERT INTO employees (
          id, employee_number, first_name, last_name, email, 
          job_title, department_id, employment_type, employment_status,
          hire_date, base_salary, salary_grade, currency
        ) VALUES (
          gen_random_uuid(), 'EMP-DEMO-001', 'Demo', 'Employee', 
          'demo@tibbna.com', 'Demo Position', ${dept[0]?.id || 'dept-001'}, 
          'FULL_TIME', 'ACTIVE', CURRENT_DATE, 50000, 'G-01', 'IQD'
        )
      `;
      console.log('✅ Created demo employee');
    }

    // Create one attendance record if none exists
    const attCount = await sql`SELECT COUNT(*) as count FROM attendance_records`;
    if (parseInt(attCount[0].count) === 0) {
      const emp = await sql`SELECT id FROM employees LIMIT 1`;
      await sql`
        INSERT INTO attendance_records (
          id, employee_id, attendance_date, check_in, check_out,
          total_hours, status, created_at
        ) VALUES (
          gen_random_uuid(), ${emp[0]?.id}, CURRENT_DATE, 
          '08:00', '17:00', 8.0, 'PRESENT', CURRENT_TIMESTAMP
        )
      `;
      console.log('✅ Created demo attendance record');
    }

    console.log('🎉 Minimal demo data created successfully!');
    
  } catch (error: any) {
    console.error('❌ Error creating minimal demo data:', error.message);
  }
}

// Main execution
async function main(): Promise<void> {
  try {
    await cleanupHRData();
    await createMinimalDemoData();
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { cleanupHRData, createMinimalDemoData };
