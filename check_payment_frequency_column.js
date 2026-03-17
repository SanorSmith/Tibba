const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkPaymentFrequencyColumn() {
  try {
    console.log('🔍 Checking payment_frequency column in employee_compensation table...');
    
    // Check if payment_frequency column exists
    const columnCheck = await pool.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'employee_compensation' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Current employee_compensation table columns:');
    columnCheck.rows.forEach((col, i) => {
      console.log(`${i+1}. ${col.column_name} (${col.data_type}) - ${col.is_nullable}`);
      if (col.column_default) {
        console.log(`   Default: ${col.column_default}`);
      }
    });
    
    // Check if payment_frequency exists
    const paymentFreqColumn = columnCheck.rows.find(col => col.column_name === 'payment_frequency');
    
    if (!paymentFreqColumn) {
      console.log('\n❌ payment_frequency column is MISSING!');
      console.log('🔧 Adding payment_frequency column...');
      
      // Add the payment_frequency column
      await pool.query(`
        ALTER TABLE employee_compensation 
        ADD COLUMN payment_frequency VARCHAR(20) DEFAULT 'MONTHLY'
      `);
      
      // Add check constraint
      await pool.query(`
        ALTER TABLE employee_compensation 
        ADD CONSTRAINT payment_frequency_check 
        CHECK (payment_frequency IN ('WEEKLY', 'BI-WEEKLY', 'MONTHLY', 'QUARTERLY'))
      `);
      
      // Add index
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_employee_compensation_payment_frequency 
        ON employee_compensation(payment_frequency)
      `);
      
      console.log('✅ payment_frequency column added successfully!');
      
      // Update existing records to have default value
      const updateResult = await pool.query(`
        UPDATE employee_compensation 
        SET payment_frequency = 'MONTHLY' 
        WHERE payment_frequency IS NULL
      `);
      
      console.log(`✅ Updated ${updateResult.rowCount} existing records with default value`);
      
    } else {
      console.log('\n✅ payment_frequency column already exists');
      console.log(`   Type: ${paymentFreqColumn.data_type}`);
      console.log(`   Default: ${paymentFreqColumn.column_default}`);
      console.log(`   Nullable: ${paymentFreqColumn.is_nullable}`);
    }
    
    // Check what data we actually have
    console.log('\n📊 Sample compensation records:');
    const sampleData = await pool.query(`
      SELECT 
        ec.employee_id,
        s.firstname || ' ' || s.lastname as staff_name,
        ec.basic_salary,
        ec.housing_allowance,
        ec.transport_allowance,
        ec.meal_allowance,
        ec.total_package,
        ec.currency,
        ec.payment_frequency,
        ec.effective_from,
        ec.is_active
      FROM employee_compensation ec
      JOIN staff s ON ec.employee_id = s.staffid
      WHERE ec.is_active = true
      ORDER BY ec.created_at DESC
      LIMIT 3
    `);
    
    if (sampleData.rows.length > 0) {
      console.log('\nReal data from database:');
      sampleData.rows.forEach((row, i) => {
        console.log(`\n${i+1}. ${row.staff_name}`);
        console.log(`   Employee ID: ${row.employee_id}`);
        console.log(`   Basic Salary: ${row.basic_salary} ${row.currency}`);
        console.log(`   Housing: ${row.housing_allowance} ${row.currency}`);
        console.log(`   Transport: ${row.transport_allowance} ${row.currency}`);
        console.log(`   Meal: ${row.meal_allowance} ${row.currency}`);
        console.log(`   Total: ${row.total_package} ${row.currency}`);
        console.log(`   Payment Frequency: ${row.payment_frequency || 'NOT SET'}`);
        console.log(`   Effective: ${row.effective_from}`);
        console.log(`   Active: ${row.is_active}`);
      });
    } else {
      console.log('❌ No active compensation records found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkPaymentFrequencyColumn();
