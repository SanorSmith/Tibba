/**
 * Check available tables and their record counts - Fixed version
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

async function checkTables() {
  console.log('🔍 Checking available tables...\n');
  
  try {
    // Get all tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;

    console.log(`📊 Found ${tables.length} tables:\n`);

    for (const table of tables) {
      try {
        const tableName = table.table_name;
        const count = await sql`SELECT COUNT(*) as count FROM ${sql.unsafe(tableName)}`;
        console.log(`✅ ${tableName.padEnd(30)}: ${count[0].count} records`);
      } catch (error) {
        console.log(`❌ ${table.table_name.padEnd(30)}: Error - ${error.message}`);
      }
    }

    // Check for HR-related tables specifically
    console.log('\n🔍 Looking for HR-related tables...\n');
    
    const hrKeywords = ['employee', 'department', 'attendance', 'payroll', 'leave', 'shift', 'alert', 'workflow'];
    
    for (const table of tables) {
      const tableName = table.table_name.toLowerCase();
      const isHRTable = hrKeywords.some(keyword => tableName.includes(keyword));
      
      if (isHRTable) {
        try {
          const count = await sql`SELECT COUNT(*) as count FROM ${sql.unsafe(table.table_name)}`;
          console.log(`👥 ${table.table_name.padEnd(30)}: ${count[0].count} records (HR-related)`);
        } catch (error) {
          console.log(`❌ ${table.table_name.padEnd(30)}: Error - ${error.message}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
  } finally {
    await sql.end();
  }
}

checkTables();
