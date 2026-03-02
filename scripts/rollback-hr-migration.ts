#!/usr/bin/env ts-node

/**
 * HR DATA MIGRATION ROLLBACK SCRIPT
 * Safely removes all migrated HR data from Supabase database
 * 
 * Usage: npm run migrate:hr:rollback
 */

import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

// ============================================================================
// CONFIGURATION
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warn: '\x1b[33m',
  };
  const icons = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warn: '⚠️',
  };
  console.log(`${colors[type]}${icons[type]} ${message}\x1b[0m`);
}

async function confirmRollback(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('\n⚠️  Are you sure you want to rollback the HR migration? This will DELETE all HR data! (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

// ============================================================================
// ROLLBACK FUNCTIONS
// ============================================================================

async function getRecordCounts(): Promise<Record<string, number>> {
  const tables = [
    'payroll_transactions',
    'leave_requests',
    'attendance_records',
    'employees',
    'departments',
  ];

  const counts: Record<string, number> = {};

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      log(`Failed to count ${table}: ${error.message}`, 'error');
      counts[table] = 0;
    } else {
      counts[table] = count || 0;
    }
  }

  return counts;
}

async function deleteFromTable(table: string): Promise<{ deleted: number; error?: string }> {
  try {
    log(`Deleting all records from ${table}...`, 'info');

    // Get count first
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (!count || count === 0) {
      log(`No records found in ${table}`, 'info');
      return { deleted: 0 };
    }

    // Delete all records
    const { error } = await supabase
      .from(table)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using impossible condition)

    if (error) {
      log(`Failed to delete from ${table}: ${error.message}`, 'error');
      return { deleted: 0, error: error.message };
    }

    log(`Deleted ${count} records from ${table}`, 'success');
    return { deleted: count };

  } catch (err: any) {
    log(`Exception deleting from ${table}: ${err.message}`, 'error');
    return { deleted: 0, error: err.message };
  }
}

async function rollbackMigration(): Promise<void> {
  log('\n🔄 Starting HR Migration Rollback...', 'info');

  // Get current counts
  log('\n📊 Current Record Counts:', 'info');
  const beforeCounts = await getRecordCounts();
  Object.entries(beforeCounts).forEach(([table, count]) => {
    console.log(`   ${table}: ${count} records`);
  });

  // Delete in reverse order to respect foreign key constraints
  const tables = [
    'payroll_transactions',
    'leave_requests',
    'leave_balances',
    'attendance_records',
    'employees',
    'departments',
  ];

  let totalDeleted = 0;
  const errors: string[] = [];

  for (const table of tables) {
    const result = await deleteFromTable(table);
    totalDeleted += result.deleted;
    if (result.error) {
      errors.push(`${table}: ${result.error}`);
    }
  }

  // Verify deletion
  log('\n🔍 Verifying Deletion...', 'info');
  const afterCounts = await getRecordCounts();
  Object.entries(afterCounts).forEach(([table, count]) => {
    if (count > 0) {
      log(`⚠️  ${table} still has ${count} records`, 'warn');
    } else {
      log(`✅ ${table} is empty`, 'success');
    }
  });

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 ROLLBACK SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Records Deleted: ${totalDeleted}`);
  console.log(`Errors: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\nErrors encountered:');
    errors.forEach(err => console.log(`  - ${err}`));
  }

  console.log('='.repeat(80));
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔄 HR DATA MIGRATION ROLLBACK');
  console.log('='.repeat(80));

  // Confirm rollback
  const confirmed = await confirmRollback();
  
  if (!confirmed) {
    log('\n❌ Rollback cancelled by user', 'warn');
    process.exit(0);
  }

  try {
    await rollbackMigration();
    log('\n✅ Rollback completed successfully!', 'success');
    process.exit(0);
  } catch (error: any) {
    log(`\n💥 Rollback failed: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

main();
