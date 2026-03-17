const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkStaffTableStructure() {
  try {
    console.log('🔍 Checking staff table structure...');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'staff' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Staff table columns:');
    result.rows.forEach((col, i) => {
      console.log(`${i+1}. ${col.column_name} (${col.data_type}) - ${col.is_nullable}`);
      if (col.column_default) {
        console.log(`   Default: ${col.column_default}`);
      }
    });
    
    // Check which columns we're trying to use that don't exist
    const columnsWeUse = [
      'firstname', 'middlename', 'lastname', 'dateofbirth', 'gender',
      'marital_status', 'nationality', 'national_id', 'email', 'phone',
      'address', 'role', 'unit', 'createdat', 'updatedat'
    ];
    
    const existingColumns = result.rows.map(col => col.column_name.toLowerCase());
    const missingColumns = columnsWeUse.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('\n❌ Missing columns:', missingColumns);
      
      // Find the actual column names
      const actualColumns = result.rows.map(col => col.column_name.toLowerCase());
      console.log('\n✅ Actual column names available:');
      console.log(actualColumns);
    } else {
      console.log('\n✅ All required columns exist');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkStaffTableStructure();
