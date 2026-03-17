const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkPaymentFrequency() {
  try {
    console.log('🔍 Checking Payment Frequency Fields in Database');
    console.log('='.repeat(55));

    // Check for payment frequency fields
    const result = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%staff%' OR table_name LIKE '%employee%')
      AND (column_name LIKE '%frequency%' OR column_name LIKE '%pay%' OR column_name LIKE '%salary%' OR column_name LIKE '%payment%')
      ORDER BY table_name, column_name
    `);

    if (result.rows.length > 0) {
      console.log('✅ Found Payment/Frequency Fields:');
      result.rows.forEach(row => {
        console.log(`   Table: ${row.table_name}`);
        console.log(`   Column: ${row.column_name} (${row.data_type})`);
      });
    } else {
      console.log('❌ No payment frequency fields found');
      console.log('💡 Checking staff table structure...');
      
      // Check staff table structure
      const staffResult = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'staff' 
        ORDER BY ordinal_position
      `);
      
      console.log('\n📋 Staff Table Structure:');
      console.log('-'.repeat(30));
      staffResult.rows.forEach(row => {
        console.log(`  ${row.column_name}: ${row.data_type}`);
      });
    }

    // Check payroll_periods table for period_type
    console.log('\n🔍 Checking Payroll Periods Table:');
    console.log('-'.repeat(40));
    
    const payrollPeriodsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'payroll_periods' 
      ORDER BY ordinal_position
    `);
    
    payrollPeriodsResult.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });

    // Check if there's an employee_compensation table
    console.log('\n🔍 Checking Employee Compensation Table:');
    console.log('-'.repeat(45));
    
    const compTableCheck = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'employee_compensation'
    `);
    
    if (compTableCheck.rows[0].count > 0) {
      const compResult = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'employee_compensation' 
        ORDER BY ordinal_position
      `);
      
      console.log('✅ Employee Compensation Table Found:');
      compResult.rows.forEach(row => {
        console.log(`  ${row.column_name}: ${row.data_type}`);
      });
    } else {
      console.log('❌ Employee Compensation table not found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkPaymentFrequency();
