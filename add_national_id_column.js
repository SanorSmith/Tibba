const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function addNationalIdColumn() {
  try {
    console.log('🔧 Adding national_id column to staff table...');
    
    // Check if column already exists
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'staff' 
      AND table_schema = 'public'
      AND column_name = 'national_id'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ national_id column already exists');
      return;
    }
    
    // Add the national_id column
    await pool.query(`
      ALTER TABLE staff 
      ADD COLUMN national_id VARCHAR(50)
    `);
    
    console.log('✅ national_id column added successfully');
    
    // Add index for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_staff_national_id 
      ON staff(national_id)
    `);
    
    console.log('✅ Index created for national_id column');
    
    // Show updated table structure
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'staff' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Updated staff table columns:');
    result.rows.forEach((col, i) => {
      console.log(`${i+1}. ${col.column_name} (${col.data_type}) - ${col.is_nullable}`);
    });
    
    console.log('\n🎉 national_id column is now ready for use!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addNationalIdColumn();
