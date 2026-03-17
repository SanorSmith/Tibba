const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkAllRelatedTables() {
  try {
    // Get all tables
    const allTablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const allTables = allTablesResult.rows.map(row => row.table_name);
    console.log(`📊 Found ${allTables.length} total tables`);
    
    // Check each table for attendance/employee related structure
    const relatedTables = [];
    
    for (const tableName of allTables) {
      try {
        const columnsResult = await pool.query(`
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = '${tableName}' 
          AND table_schema = 'public'
          ORDER BY ordinal_position
        `);
        
        const columns = columnsResult.rows;
        const columnNames = columns.map(c => c.column_name).join(', ');
        
        // Check if table might be attendance/employee related
        const keywords = ['attendance', 'employee', 'staff', 'schedule', 'shift', 'leave', 'absence', 'time', 'work', 'exception', 'violation', 'late', 'check', 'clock'];
        const isRelated = keywords.some(keyword => 
          tableName.toLowerCase().includes(keyword) || 
          columnNames.toLowerCase().includes(keyword)
        );
        
        if (isRelated) {
          relatedTables.push({
            name: tableName,
            columns: columns,
            columnCount: columns.length,
            sampleData: null
          });
          
          // Get sample data if table has records
          const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
          if (countResult.rows[0].count > 0) {
            const sampleResult = await pool.query(`SELECT * FROM ${tableName} LIMIT 1`);
            relatedTables[relatedTables.length - 1].sampleData = sampleResult.rows[0];
            relatedTables[relatedTables.length - 1].recordCount = countResult.rows[0].count;
          } else {
            relatedTables[relatedTables.length - 1].recordCount = 0;
          }
        }
        
      } catch (error) {
        console.error(`❌ Error checking ${tableName}:`, error.message);
      }
    }
    
    console.log('\n🎯 Attendance/Employee Related Tables:');
    relatedTables.forEach(table => {
      console.log(`\n📋 ${table.name} (${table.recordCount} records, ${table.columnCount} columns)`);
      console.log('   Columns:', table.columns.map(c => `${c.column_name}:${c.data_type}`).join(', '));
      
      if (table.sampleData) {
        console.log('   Sample data:', JSON.stringify(table.sampleData, null, 2));
      }
    });
    
    // Look for specific patterns
    console.log('\n🔍 Specific Pattern Analysis:');
    
    // Check for leave-related tables
    const leaveTables = relatedTables.filter(t => 
      t.name.toLowerCase().includes('leave') || 
      t.columns.some(c => c.column_name.toLowerCase().includes('leave'))
    );
    if (leaveTables.length > 0) {
      console.log('\n🏖️  Leave Management Tables:');
      leaveTables.forEach(t => console.log(`   - ${t.name}`));
    }
    
    // Check for time tracking tables
    const timeTables = relatedTables.filter(t => 
      t.name.toLowerCase().includes('time') || 
      t.columns.some(c => c.column_name.toLowerCase().includes('time') || c.column_name.toLowerCase().includes('clock'))
    );
    if (timeTables.length > 0) {
      console.log('\n⏰ Time Tracking Tables:');
      timeTables.forEach(t => console.log(`   - ${t.name}`));
    }
    
    // Check for violation/exception tables
    const violationTables = relatedTables.filter(t => 
      t.name.toLowerCase().includes('violation') || 
      t.name.toLowerCase().includes('exception') ||
      t.columns.some(c => c.column_name.toLowerCase().includes('violation') || c.column_name.toLowerCase().includes('exception'))
    );
    if (violationTables.length > 0) {
      console.log('\n⚠️  Violation/Exception Tables:');
      violationTables.forEach(t => console.log(`   - ${t.name}`));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkAllRelatedTables();
