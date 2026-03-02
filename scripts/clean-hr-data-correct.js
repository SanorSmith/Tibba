/**
 * Clean HR Demo Data - Final Correct Version
 * Uses correct primary key column names
 */

require('dotenv').config({ path: '.env.local' });

const postgres = require('postgres');

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

async function cleanupTable(tableName, primaryKey) {
  try {
    console.log(`📊 Processing table: ${tableName}`);
    
    // Get count before cleanup
    const countResult = await sql`SELECT COUNT(*) as count FROM ${sql.unsafe(tableName)}`;
    const recordsBefore = parseInt(countResult[0].count);

    // Skip if table is already empty or has only 1 record
    if (recordsBefore <= 1) {
      console.log(`✅ Table ${tableName} already has ${recordsBefore} record(s), skipping...`);
      return {
        table: tableName,
        recordsBefore,
        recordsAfter: recordsBefore,
        recordsDeleted: 0,
        status: 'success'
      };
    }

    // Get the first record ID to keep
    const firstRecord = await sql.unsafe(`SELECT ${primaryKey} FROM ${tableName} LIMIT 1`);
    
    if (firstRecord.length === 0) {
      console.log(`⚠️  No records found in ${tableName}`);
      return {
        table: tableName,
        recordsBefore: 0,
        recordsAfter: 0,
        recordsDeleted: 0,
        status: 'success'
      };
    }

    const firstId = firstRecord[0][primaryKey];
    
    // Delete all records except the first one
    await sql.unsafe(`DELETE FROM ${tableName} WHERE ${primaryKey} != '${firstId}'`);

    // Get count after cleanup
    const countAfterResult = await sql`SELECT COUNT(*) as count FROM ${sql.unsafe(tableName)}`;
    const recordsAfter = parseInt(countAfterResult[0].count);
    const recordsDeleted = recordsBefore - recordsAfter;

    console.log(`✅ ${tableName}: ${recordsBefore} → ${recordsAfter} (deleted ${recordsDeleted})`);
    
    return {
      table: tableName,
      recordsBefore,
      recordsAfter,
      recordsDeleted,
      status: 'success'
    };

  } catch (error) {
    console.error(`❌ Error cleaning ${tableName}:`, error.message);
    return {
      table: tableName,
      recordsBefore: 0,
      recordsAfter: 0,
      recordsDeleted: 0,
      status: 'error',
      error: error.message
    };
  }
}

async function cleanupWorkspaceUsers() {
  try {
    console.log(`📊 Processing table: workspaceusers (composite key)`);
    
    // Get count before cleanup
    const countResult = await sql`SELECT COUNT(*) as count FROM workspaceusers`;
    const recordsBefore = parseInt(countResult[0].count);

    // Skip if table is already empty or has only 1 record
    if (recordsBefore <= 1) {
      console.log(`✅ Table workspaceusers already has ${recordsBefore} record(s), skipping...`);
      return {
        table: 'workspaceusers',
        recordsBefore,
        recordsAfter: recordsBefore,
        recordsDeleted: 0,
        status: 'success'
      };
    }

    // Get the first record to keep (composite key: workspaceid + userid)
    const firstRecord = await sql`SELECT workspaceid, userid FROM workspaceusers LIMIT 1`;
    
    if (firstRecord.length === 0) {
      console.log(`⚠️  No records found in workspaceusers`);
      return {
        table: 'workspaceusers',
        recordsBefore: 0,
        recordsAfter: 0,
        recordsDeleted: 0,
        status: 'success'
      };
    }

    const firstWorkspaceId = firstRecord[0].workspaceid;
    const firstUserId = firstRecord[0].userid;
    
    // Delete all records except the first one
    await sql`DELETE FROM workspaceusers WHERE NOT (workspaceid = ${firstWorkspaceId} AND userid = ${firstUserId})`;

    // Get count after cleanup
    const countAfterResult = await sql`SELECT COUNT(*) as count FROM workspaceusers`;
    const recordsAfter = parseInt(countAfterResult[0].count);
    const recordsDeleted = recordsBefore - recordsAfter;

    console.log(`✅ workspaceusers: ${recordsBefore} → ${recordsAfter} (deleted ${recordsDeleted})`);
    
    return {
      table: 'workspaceusers',
      recordsBefore,
      recordsAfter,
      recordsDeleted,
      status: 'success'
    };

  } catch (error) {
    console.error(`❌ Error cleaning workspaceusers:`, error.message);
    return {
      table: 'workspaceusers',
      recordsBefore: 0,
      recordsAfter: 0,
      recordsDeleted: 0,
      status: 'error',
      error: error.message
    };
  }
}

async function cleanupHRData() {
  console.log('🧹 Starting HR Demo Data Cleanup (Correct Version)...\n');

  const results = [];
  
  // Tables to clean with their correct primary keys
  const tablesToClean = [
    { name: 'departments', pk: 'departmentid' },     // 7 records
    { name: 'staff', pk: 'staffid' },               // 9 records  
    { name: 'patients', pk: 'patientid' },          // 64 records
    { name: 'appointments', pk: 'appointmentid' },  // 13 records
    { name: 'users', pk: 'userid' },               // 13 records
    { name: 'todos', pk: 'todoid' },               // 6 records
    { name: 'workspaces', pk: 'workspaceid' },      // 6 records
  ];

  for (const table of tablesToClean) {
    const result = await cleanupTable(table.name, table.pk);
    results.push(result);
  }

  // Handle workspaceusers separately (composite key)
  const workspaceUsersResult = await cleanupWorkspaceUsers();
  results.push(workspaceUsersResult);

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

  return results;
}

// Show final state
async function showFinalState() {
  console.log('\n📊 Final Database State:\n');
  
  const tables = [
    'departments', 'staff', 'patients', 'appointments', 
    'users', 'todos', 'workspaces', 'workspaceusers',
    'labs', 'operations', 'pharmacies'
  ];

  for (const tableName of tables) {
    try {
      const count = await sql`SELECT COUNT(*) as count FROM ${sql.unsafe(tableName)}`;
      console.log(`✅ ${tableName.padEnd(20)}: ${count[0].count} records`);
    } catch (error) {
      console.log(`❌ ${tableName.padEnd(20)}: Error - ${error.message}`);
    }
  }
}

// Main execution
async function main() {
  try {
    await cleanupHRData();
    await showFinalState();
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { cleanupHRData, showFinalState };
