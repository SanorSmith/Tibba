/**
 * Check column names for tables
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

async function checkColumns() {
  console.log('🔍 Checking column names for key tables...\n');
  
  const tables = ['departments', 'staff', 'patients', 'appointments', 'users', 'todos', 'workspaces', 'workspaceusers'];
  
  for (const tableName of tables) {
    try {
      console.log(`📊 Table: ${tableName}`);
      
      const columns = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = ${tableName} 
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `;
      
      columns.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
      
      console.log('');
      
    } catch (error) {
      console.error(`❌ Error checking ${tableName}:`, error.message);
    }
  }
  
  await sql.end();
}

checkColumns();
