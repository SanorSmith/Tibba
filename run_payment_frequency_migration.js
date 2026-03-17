const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function runMigration() {
  try {
    console.log('🔧 Adding payment_frequency column to employee_compensation table...');
    
    // Add payment_frequency column
    await pool.query(`
      ALTER TABLE employee_compensation 
      ADD COLUMN IF NOT EXISTS payment_frequency VARCHAR(20) DEFAULT 'MONTHLY' 
      CHECK (payment_frequency IN ('WEEKLY', 'BI-WEEKLY', 'MONTHLY', 'QUARTERLY'))
    `);
    console.log('✅ Column added successfully');

    // Add index
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_compensation_payment_frequency 
      ON employee_compensation(payment_frequency)
    `);
    console.log('✅ Index created successfully');

    // Update existing records
    const updateResult = await pool.query(`
      UPDATE employee_compensation 
      SET payment_frequency = 'MONTHLY' 
      WHERE payment_frequency IS NULL
    `);
    console.log(`✅ Updated ${updateResult.rowCount} existing records`);

    // Verify the column
    const verifyResult = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'employee_compensation' 
      AND column_name = 'payment_frequency'
    `);
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ Verification successful:');
      console.log(`   Column: ${verifyResult.rows[0].column_name}`);
      console.log(`   Type: ${verifyResult.rows[0].data_type}`);
      console.log(`   Default: ${verifyResult.rows[0].column_default}`);
    }

    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await pool.end();
  }
}

runMigration();
