const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function runMigration(filename) {
  try {
    console.log(`🔄 Running migration: ${filename}`);
    
    const filepath = path.join(__dirname, 'migrations', filename);
    const sql = fs.readFileSync(filepath, 'utf8');
    
    await pool.query(sql);
    
    console.log(`✅ Migration ${filename} completed successfully`);
    
  } catch (error) {
    console.error(`❌ Migration ${filename} failed:`, error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: node run_migration.js <migration_file>');
  console.error('Example: node run_migration.js 001_leave_balance_automation.sql');
  process.exit(1);
}

runMigration(migrationFile);
