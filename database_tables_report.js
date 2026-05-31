const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function generateDatabaseReport() {
  console.log('🔍 Generating Database Tables Report...\n');
  
  try {
    const client = await pool.connect();
    
    try {
      // Get all tables
      const tablesQuery = `
        SELECT 
          table_name,
          table_type
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;
      
      const tablesResult = await client.query(tablesQuery);
      const tables = tablesResult.rows;
      
      console.log(`📊 Found ${tables.length} tables in the database:\n`);
      
      // For each table, get structure and sample data
      for (const table of tables) {
        console.log(`🗂️  TABLE: ${table.table_name.toUpperCase()}`);
        console.log('='.repeat(60));
        
        // Get table structure
        const structureQuery = `
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length,
            numeric_precision,
            numeric_scale
          FROM information_schema.columns 
          WHERE table_name = '${table.table_name}'
          AND table_schema = 'public'
          ORDER BY ordinal_position
        `;
        
        const structureResult = await client.query(structureQuery);
        const columns = structureResult.rows;
        
        console.log('\n📋 COLUMNS:');
        console.log('┌─────────────────────────────┬────────────────────┬──────────┬─────────────┐');
        console.log('│ Column Name                 │ Data Type          │ Nullable │ Default     │');
        console.log('├─────────────────────────────┼────────────────────┼──────────┼─────────────┤');
        
        columns.forEach(col => {
          const name = col.column_name.padEnd(27);
          const type = col.data_type.padEnd(18);
          const nullable = col.is_nullable.padEnd(8);
          const defaultValue = col.column_default || 'NULL';
          const def = (defaultValue || 'NULL').substring(0, 11).padEnd(11);
          console.log(`│ ${name} │ ${type} │ ${nullable} │ ${def} │`);
        });
        console.log('└─────────────────────────────┴────────────────────┴──────────┴─────────────┘');
        
        // Get row count
        const countQuery = `SELECT COUNT(*) as count FROM "${table.table_name}"`;
        const countResult = await client.query(countQuery);
        const rowCount = countResult.rows[0].count;
        
        console.log(`\n📈 ROWS: ${rowCount}`);
        
        // Get sample data (first 3 rows)
        if (rowCount > 0) {
          const sampleQuery = `SELECT * FROM "${table.table_name}" LIMIT 3`;
          const sampleResult = await client.query(sampleQuery);
          
          if (sampleResult.rows.length > 0) {
            console.log('\n🔍 SAMPLE DATA:');
            console.log('─'.repeat(60));
            
            sampleResult.rows.forEach((row, index) => {
              console.log(`\nRow ${index + 1}:`);
              Object.entries(row).forEach(([key, value]) => {
                const displayValue = value === null ? 'NULL' : 
                                  typeof value === 'object' ? JSON.stringify(value) :
                                  String(value).length > 50 ? String(value).substring(0, 47) + '...' :
                                  String(value);
                console.log(`  ${key}: ${displayValue}`);
              });
            });
          }
        }
        
        // Get foreign key relationships
        const fkQuery = `
          SELECT 
            tc.constraint_name, 
            kcu.column_name, 
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name 
          FROM information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_name = '${table.table_name}'
        `;
        
        const fkResult = await client.query(fkQuery);
        
        if (fkResult.rows.length > 0) {
          console.log('\n🔗 FOREIGN KEY RELATIONSHIPS:');
          fkResult.rows.forEach(fk => {
            console.log(`  ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
          });
        }
        
        console.log('\n' + '='.repeat(60) + '\n');
      }
      
      // Summary statistics
      console.log('\n📊 DATABASE SUMMARY:');
      console.log('='.repeat(60));
      console.log(`Total Tables: ${tables.length}`);
      
      let totalRows = 0;
      for (const table of tables) {
        const countQuery = `SELECT COUNT(*) as count FROM "${table.table_name}"`;
        const countResult = await client.query(countQuery);
        totalRows += parseInt(countResult.rows[0].count);
      }
      console.log(`Total Rows Across All Tables: ${totalRows.toLocaleString()}`);
      
      // Table categories
      const patientTables = tables.filter(t => t.table_name.includes('patient'));
      const hrTables = tables.filter(t => t.table_name.includes('job_') || t.table_name.includes('employee') || t.table_name.includes('payroll'));
      const financeTables = tables.filter(t => t.table_name.includes('invoice') || t.table_name.includes('payment') || t.table_name.includes('financial'));
      const inventoryTables = tables.filter(t => t.table_name.includes('stock') || t.table_name.includes('inventory') || t.table_name.includes('pharmacy'));
      
      console.log(`\n📂 TABLE CATEGORIES:`);
      console.log(`  Patient Management: ${patientTables.length} tables`);
      console.log(`  HR & Recruitment: ${hrTables.length} tables`);
      console.log(`  Finance: ${financeTables.length} tables`);
      console.log(`  Inventory: ${inventoryTables.length} tables`);
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error generating database report:', error);
  } finally {
    await pool.end();
  }
}

// Run the report
generateDatabaseReport().then(() => {
  console.log('\n✅ Database report completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Report failed:', error);
  process.exit(1);
});
