/**
 * Clean HR Demo Data - Targeted Version
 * Removes demo data from HR-related tables and leaves only 1 record per table
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

async function cleanupHRData() {
  console.log('🧹 Starting HR Demo Data Cleanup (Targeted)...\n');

  const results = [];
  
  // HR-related tables found in the database
  const hrTables = [
    'departments',  // 7 records - keep 1
    'staff',        // 9 records - keep 1 (this is likely the employees table)
  ];

  for (const tableName of hrTables) {
    try {
      console.log(`📊 Processing table: ${tableName}`);
      
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

  // Also clean up other tables with demo data
  const otherTablesToClean = [
    'patients',      // 64 records - keep 1
    'appointments',  // 13 records - keep 1
    'users',         // 13 records - keep 1
    'todos',         // 6 records - keep 1
    'workspaces',    // 6 records - keep 1
    'workspaceusers', // 16 records - keep 1
    'labs',          // 1 record - keep as is
    'operations',    // 1 record - keep as is
    'pharmacies',    // 1 record - keep as is
  ];

  for (const tableName of otherTablesToClean) {
    try {
      console.log(`📊 Processing table: ${tableName}`);
      
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

      // Get the first record to keep
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

  await sql.end();
  return results;
}

// Main execution
async function main() {
  try {
    await cleanupHRData();
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { cleanupHRData };
