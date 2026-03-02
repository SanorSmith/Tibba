/**
 * Clean HR Demo Data Script - Supabase Version
 * Removes all demo data from HR models and leaves only 1 demo record per table
 */

const { createClient } = require('@supabase/supabase-js');

// Use Supabase connection
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase credentials are not configured');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupHRData() {
  console.log('🧹 Starting HR Demo Data Cleanup (Supabase)...\n');

  const results = [];
  
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
      
      // Get all records first
      const { data: allRecords, error: fetchError } = await supabase
        .from(tableName)
        .select('*');

      if (fetchError) {
        console.log(`⚠️  Table ${tableName} does not exist or error: ${fetchError.message}, skipping...`);
        continue;
      }

      const recordsBefore = allRecords.length;

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

      // Keep the first record, delete the rest
      const firstRecord = allRecords[0];
      const recordsToDelete = allRecords.slice(1);

      if (recordsToDelete.length > 0) {
        // Delete all records except the first one
        const { error: deleteError } = await supabase
          .from(tableName)
          .delete()
          .in('id', recordsToDelete.map(r => r.id));

        if (deleteError) {
          throw new Error(`Delete failed: ${deleteError.message}`);
        }
      }

      const recordsAfter = 1;
      const recordsDeleted = recordsBefore - recordsAfter;

      console.log(`✅ ${tableName}: ${recordsBefore} → ${recordsAfter} (deleted ${recordsDeleted})`);
      
      results.push({
        table: tableName,
        recordsBefore,
        recordsAfter,
        recordsDeleted,
        status: 'success'
      });

    } catch (error) {
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
  console.log('='.repeat(80));
  
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
  
  console.log('='.repeat(80));
  console.log(`📊 Total records deleted: ${totalDeleted}`);
  console.log(`📊 Tables processed: ${results.length}`);
  console.log(`📊 Errors: ${totalErrors}`);
  
  if (totalErrors === 0) {
    console.log('\n🎉 HR Demo Data Cleanup completed successfully!');
  } else {
    console.log(`\n⚠️  Cleanup completed with ${totalErrors} errors.`);
  }
}

// Create minimal demo data if tables are completely empty
async function createMinimalDemoData() {
  console.log('\n🔧 Creating minimal demo data...');
  
  try {
    // Create one department if none exists
    const { data: deptData, count: deptCount } = await supabase
      .from('departments')
      .select('*', { count: 'exact', head: true });

    if (deptCount === 0) {
      const { error: deptError } = await supabase
        .from('departments')
        .insert({
          id: 'dept-001',
          name: 'Executive Management',
          code: 'EXEC',
          type: 'department',
          active: true
        });

      if (deptError) {
        throw new Error(`Failed to create department: ${deptError.message}`);
      }
      console.log('✅ Created demo department');
    }

    // Create one employee if none exists
    const { count: empCount } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true });

    if (empCount === 0) {
      const { data: dept } = await supabase
        .from('departments')
        .select('id')
        .limit(1);

      const { error: empError } = await supabase
        .from('employees')
        .insert({
          employee_number: 'EMP-DEMO-001',
          first_name: 'Demo',
          last_name: 'Employee',
          email: 'demo@tibbna.com',
          job_title: 'Demo Position',
          department_id: dept[0]?.id || 'dept-001',
          employment_type: 'FULL_TIME',
          employment_status: 'ACTIVE',
          hire_date: new Date().toISOString().split('T')[0],
          base_salary: 50000,
          salary_grade: 'G-01',
          currency: 'IQD'
        });

      if (empError) {
        throw new Error(`Failed to create employee: ${empError.message}`);
      }
      console.log('✅ Created demo employee');
    }

    // Create one attendance record if none exists
    const { count: attCount } = await supabase
      .from('attendance_records')
      .select('*', { count: 'exact', head: true });

    if (attCount === 0) {
      const { data: emp } = await supabase
        .from('employees')
        .select('id')
        .limit(1);

      const { error: attError } = await supabase
        .from('attendance_records')
        .insert({
          employee_id: emp[0]?.id,
          attendance_date: new Date().toISOString().split('T')[0],
          check_in: '08:00',
          check_out: '17:00',
          total_hours: 8.0,
          status: 'PRESENT'
        });

      if (attError) {
        throw new Error(`Failed to create attendance record: ${attError.message}`);
      }
      console.log('✅ Created demo attendance record');
    }

    console.log('🎉 Minimal demo data created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating minimal demo data:', error.message);
  }
}

// Main execution
async function main() {
  try {
    await cleanupHRData();
    await createMinimalDemoData();
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { cleanupHRData, createMinimalDemoData };
