#!/usr/bin/env node

/**
 * TIBBNA HOSPITAL - PROJECT REORGANIZATION VERIFICATION SCRIPT
 * 
 * This script verifies that the project reorganization was successful
 * and that all connections between files are preserved.
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

let errors = 0;
let warnings = 0;
let passed = 0;

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath, description) {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    log(`  ✓ ${description}`, 'green');
    passed++;
    return true;
  } else {
    log(`  ✗ ${description} - NOT FOUND: ${filePath}`, 'red');
    errors++;
    return false;
  }
}

function checkDirectoryExists(dirPath, description) {
  const fullPath = path.join(process.cwd(), dirPath);
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    log(`  ✓ ${description}`, 'green');
    passed++;
    return true;
  } else {
    log(`  ✗ ${description} - NOT FOUND: ${dirPath}`, 'red');
    errors++;
    return false;
  }
}

function checkFileNotExists(filePath, description) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    log(`  ✓ ${description}`, 'green');
    passed++;
    return true;
  } else {
    log(`  ⚠ ${description} - STILL EXISTS: ${filePath}`, 'yellow');
    warnings++;
    return false;
  }
}

console.log('');
log('🏥 TIBBNA HOSPITAL - REORGANIZATION VERIFICATION', 'blue');
log('='.repeat(50), 'blue');
console.log('');

// ============================================================================
// 1. CHECK CRITICAL FILES REMAIN IN ROOT
// ============================================================================

log('📋 1. Checking Critical Files in Root', 'blue');
checkFileExists('.env.example', 'Environment template exists');
checkFileExists('package.json', 'Package.json exists');
checkFileExists('next.config.js', 'Next.js config exists');
checkFileExists('tsconfig.json', 'TypeScript config exists');
checkFileExists('tailwind.config.ts', 'Tailwind config exists');
checkFileExists('README.md', 'README exists');
console.log('');

// ============================================================================
// 2. CHECK NEW DIRECTORY STRUCTURE
// ============================================================================

log('📋 2. Checking New Directory Structure', 'blue');

// Documentation directories
checkDirectoryExists('docs', 'docs/ directory created');
checkDirectoryExists('docs/architecture', 'docs/architecture/ created');
checkDirectoryExists('docs/modules/finance', 'docs/modules/finance/ created');
checkDirectoryExists('docs/modules/hr', 'docs/modules/hr/ created');
checkDirectoryExists('docs/modules/ui', 'docs/modules/ui/ created');
checkDirectoryExists('docs/database', 'docs/database/ created');
checkDirectoryExists('docs/sql', 'docs/sql/ created');

// Script directories
checkDirectoryExists('scripts', 'scripts/ directory created');
checkDirectoryExists('scripts/database/check', 'scripts/database/check/ created');
checkDirectoryExists('scripts/database/verify', 'scripts/database/verify/ created');
checkDirectoryExists('scripts/database/find', 'scripts/database/find/ created');
checkDirectoryExists('scripts/database/compare', 'scripts/database/compare/ created');
checkDirectoryExists('scripts/database/investigate', 'scripts/database/investigate/ created');
checkDirectoryExists('scripts/database/tools', 'scripts/database/tools/ created');
checkDirectoryExists('scripts/testing/api', 'scripts/testing/api/ created');
checkDirectoryExists('scripts/testing/appointments', 'scripts/testing/appointments/ created');
checkDirectoryExists('scripts/testing/staff', 'scripts/testing/staff/ created');
checkDirectoryExists('scripts/testing/finance', 'scripts/testing/finance/ created');

// Database directories
checkDirectoryExists('database', 'database/ directory created');
checkDirectoryExists('database/migrations', 'database/migrations/ created');
checkDirectoryExists('database/seeds', 'database/seeds/ created');
checkDirectoryExists('database/queries', 'database/queries/ created');

console.log('');

// ============================================================================
// 3. CHECK DOCUMENTATION FILES MOVED
// ============================================================================

log('📋 3. Checking Documentation Files Moved', 'blue');

// Architecture docs
checkFileExists('docs/architecture/BLUEPRINT.md', 'BLUEPRINT.md moved');
checkFileExists('docs/architecture/DATABASE_CONNECTIONS_REPORT.md', 'DATABASE_CONNECTIONS_REPORT.md moved');
checkFileExists('docs/architecture/DEVELOPMENT_ROADMAP.md', 'DEVELOPMENT_ROADMAP.md moved');

// Finance docs
checkFileExists('docs/modules/finance/FINANCE_API_ANALYSIS.md', 'FINANCE_API_ANALYSIS.md moved');
checkFileExists('docs/modules/finance/INSURANCE_MODULE_STATUS.md', 'INSURANCE_MODULE_STATUS.md moved');

// HR docs
checkFileExists('docs/modules/hr/hr-module-completion-report.md', 'hr-module-completion-report.md moved');
checkFileExists('docs/modules/hr/hr-module-verification-report.md', 'hr-module-verification-report.md moved');

console.log('');

// ============================================================================
// 4. CHECK SCRIPTS MOVED
// ============================================================================

log('📋 4. Checking Scripts Moved', 'blue');

// Database check scripts
checkFileExists('scripts/database/check/check-database-host.js', 'check-database-host.js moved');
checkFileExists('scripts/database/check/check-patient-table.js', 'check-patient-table.js moved');
checkFileExists('scripts/database/check/check-doctors-table.js', 'check-doctors-table.js moved');

// Test scripts
checkFileExists('scripts/testing/api/test-doctors-api.js', 'test-doctors-api.js moved');
checkFileExists('scripts/testing/api/test-patient-api-debug.js', 'test-patient-api-debug.js moved');

// Database tools
checkFileExists('scripts/database/tools/database-explorer.js', 'database-explorer.js moved');

console.log('');

// ============================================================================
// 5. CHECK DATABASE FILES MOVED
// ============================================================================

log('📋 5. Checking Database Files Moved', 'blue');

checkFileExists('database/seeds/INSERT_INSURANCE_DATA.sql', 'INSERT_INSURANCE_DATA.sql moved');
checkFileExists('database/seeds/insert-services.sql', 'insert-services.sql moved');

console.log('');

// ============================================================================
// 6. CHECK README FILES CREATED
// ============================================================================

log('📋 6. Checking README Files Created', 'blue');

checkFileExists('docs/README.md', 'docs/README.md created');
checkFileExists('scripts/README.md', 'scripts/README.md created');
checkFileExists('database/README.md', 'database/README.md created');

console.log('');

// ============================================================================
// 7. CHECK SOURCE CODE UNCHANGED
// ============================================================================

log('📋 7. Checking Source Code Structure Unchanged', 'blue');

checkDirectoryExists('src', 'src/ directory intact');
checkDirectoryExists('src/app', 'src/app/ directory intact');
checkDirectoryExists('src/components', 'src/components/ directory intact');
checkDirectoryExists('src/lib', 'src/lib/ directory intact');
checkDirectoryExists('src/types', 'src/types/ directory intact');
checkDirectoryExists('src/data', 'src/data/ directory intact');

// Check key files
checkFileExists('src/lib/supabase/server.ts', 'Supabase server lib intact');
checkFileExists('src/lib/supabase/client.ts', 'Supabase client lib intact');
checkFileExists('src/lib/dataStore.ts', 'HR dataStore intact');
checkFileExists('src/lib/financeStore.ts', 'Finance store intact');
checkFileExists('src/types/hr.ts', 'HR types intact');
checkFileExists('src/types/finance.ts', 'Finance types intact');

console.log('');

// ============================================================================
// 8. CHECK OLD FILES REMOVED FROM ROOT
// ============================================================================

log('📋 8. Checking Old Files Removed from Root', 'blue');

// These should no longer be in root
checkFileNotExists('BLUEPRINT.md', 'BLUEPRINT.md removed from root');
checkFileNotExists('check-database-host.js', 'check-database-host.js removed from root');
checkFileNotExists('test-doctors-api.js', 'test-doctors-api.js removed from root');
checkFileNotExists('INSERT_INSURANCE_DATA.sql', 'INSERT_INSURANCE_DATA.sql removed from root');

console.log('');

// ============================================================================
// 9. CHECK SUPABASE DIRECTORY UNCHANGED
// ============================================================================

log('📋 9. Checking Supabase Directory Unchanged', 'blue');

checkDirectoryExists('supabase', 'supabase/ directory intact');
checkFileExists('supabase/schema.sql', 'supabase/schema.sql intact');

console.log('');

// ============================================================================
// SUMMARY
// ============================================================================

console.log('');
log('='.repeat(50), 'blue');
log('📊 VERIFICATION SUMMARY', 'blue');
log('='.repeat(50), 'blue');
console.log('');

log(`✅ Passed: ${passed}`, 'green');
if (warnings > 0) {
  log(`⚠️  Warnings: ${warnings}`, 'yellow');
}
if (errors > 0) {
  log(`❌ Errors: ${errors}`, 'red');
}

console.log('');

if (errors === 0 && warnings === 0) {
  log('🎉 SUCCESS! Project reorganization completed successfully!', 'green');
  log('All files are in their correct locations.', 'green');
  console.log('');
  log('Next steps:', 'blue');
  log('  1. Run: npm run dev', 'reset');
  log('  2. Run: npm run build', 'reset');
  log('  3. Test a few scripts to verify they work', 'reset');
  console.log('');
  process.exit(0);
} else if (errors === 0) {
  log('⚠️  WARNINGS DETECTED', 'yellow');
  log('Some old files still exist in root. Consider removing them.', 'yellow');
  console.log('');
  process.exit(0);
} else {
  log('❌ ERRORS DETECTED', 'red');
  log('Some files are missing or in wrong locations.', 'red');
  log('Please review the errors above and fix them.', 'red');
  console.log('');
  process.exit(1);
}
