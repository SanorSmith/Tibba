/**
 * Clean HR Demo Data - Working Version with Raw SQL
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

async function cleanupTable(tableName) {
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
    const firstRecord = await sql.unsafe(`SELECT id FROM ${tableName} LIMIT 1`);
    
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

    const firstId = firstRecord[0].id;
    
    // Delete all records except the first one
    await sql.unsafe(`DELETE FROM ${tableName} WHERE id != '${firstId}'`);

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

async function cleanupHRData() {
  console.log('🧹 Starting HR Demo Data Cleanup (Working Version)...\n');

  const results = [];
  
  // Tables to clean
  const tablesToClean = [
    'departments',     // 7 records
    'staff',           // 9 records  
    'patients',        // 64 records
    'appointments',    // 13 records
    'users',           // 13 records
    'todos',           // 6 records
    'workspaces',      // 6 records
    'workspaceusers',  // 16 records
  ];

  for (const tableName of tablesToClean) {
    const result = await cleanupTable(tableName);
    results.push(result);
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
