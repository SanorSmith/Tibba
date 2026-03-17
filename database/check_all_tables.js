const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkAllTables() {
  try {
    console.log('📊 Checking All Tables in Database\n');
    console.log('='.repeat(60));
    
    // Get all tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`\n✅ Found ${tablesResult.rows.length} tables:\n`);
    
    // Performance-related keywords to look for
    const performanceKeywords = [
      'performance', 'review', 'evaluation', 'competency', 'competence',
      'feedback', 'patient_feedback', 'recognition', 'award', 'promotion',
      'rating', 'score', 'goal', 'objective', 'kpi'
    ];
    
    const performanceTables = [];
    const otherTables = [];
    
    for (const row of tablesResult.rows) {
      const tableName = row.table_name;
      const isPerformanceRelated = performanceKeywords.some(keyword => 
        tableName.toLowerCase().includes(keyword)
      );
      
      if (isPerformanceRelated) {
        performanceTables.push(tableName);
      } else {
        otherTables.push(tableName);
      }
    }
    
    // Display performance-related tables
    if (performanceTables.length > 0) {
      console.log('🎯 PERFORMANCE-RELATED TABLES:');
      console.log('='.repeat(60));
      for (const table of performanceTables) {
        console.log(`  ✓ ${table}`);
        
        // Get column info
        const columnsResult = await pool.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position
        `, [table]);
        
        console.log(`    Columns (${columnsResult.rows.length}):`);
        columnsResult.rows.forEach(col => {
          console.log(`      - ${col.column_name} (${col.data_type})`);
        });
        
        // Get row count
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM "${table}"`);
        console.log(`    Rows: ${countResult.rows[0].count}\n`);
      }
    } else {
      console.log('⚠️  NO PERFORMANCE-RELATED TABLES FOUND\n');
    }
    
    // Display all other tables
    console.log('\n📋 OTHER TABLES:');
    console.log('='.repeat(60));
    for (const table of otherTables) {
      const countResult = await pool.query(`SELECT COUNT(*) as count FROM "${table}"`);
      console.log(`  - ${table} (${countResult.rows[0].count} rows)`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`\n📊 Summary:`);
    console.log(`   Performance-related tables: ${performanceTables.length}`);
    console.log(`   Other tables: ${otherTables.length}`);
    console.log(`   Total tables: ${tablesResult.rows.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkAllTables();
