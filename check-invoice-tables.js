const postgres = require('postgres');

async function checkInvoiceTables() {
  try {
    console.log('🔍 CHECKING INVOICE TABLES IN NEON DATABASE');
    console.log('==========================================\n');

    const sql = postgres('postgresql://neondb_owner:npg_8FjAiWwJlhz7@ep-red-cherry-ag82jhqf-pooler.c-2.eu-central-1.aws.neon.tech/neondb', { 
      ssl: 'require',
      max: 1
    });

    // Check all tables
    const tables = await sql`
      SELECT 
        table_name,
        table_schema,
        table_type
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY table_name
    `;
    
    console.log('📋 All Tables in Database:');
    console.log('===========================');
    tables.forEach(table => {
      console.log(`• ${table.table_name} (${table.table_schema})`);
    });
    console.log('');

    // Check for invoice-related tables
    const invoiceTables = tables.filter(table => 
      table.table_name.toLowerCase().includes('invoice')
    );
    
    console.log('🧾 Invoice-Related Tables:');
    console.log('===========================');
    if (invoiceTables.length > 0) {
      invoiceTables.forEach(table => {
        console.log(`• ${table.table_name} (${table.table_schema})`);
      });
    } else {
      console.log('❌ No invoice tables found');
    }
    console.log('');

    // If invoice tables exist, check their structure
    if (invoiceTables.length > 0) {
      for (const table of invoiceTables) {
        console.log(`📊 Structure of ${table.table_name}:`);
        console.log('=====================================');
        
        const columns = await sql`
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns 
          WHERE table_name = ${table.table_name}
          AND table_schema = 'public'
          ORDER BY ordinal_position
        `;
        
        columns.forEach(col => {
          console.log(`• ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}${col.column_default ? ` DEFAULT ${col.column_default}` : ''}`);
        });
        console.log('');

        // Check if table has data
        const count = await sql`SELECT COUNT(*) as count FROM ${sql(table.table_name)}`;
        console.log(`📈 Records in ${table.table_name}: ${count[0].count}`);
        console.log('');
      }
    }

    await sql.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkInvoiceTables();
