const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function fixCompensationActive() {
  try {
    console.log('🔧 Fixing compensation is_active flag...');

    // Update all compensation records to be active
    const updateResult = await pool.query(`
      UPDATE employee_compensation 
      SET is_active = true 
      WHERE is_active = false OR is_active IS NULL
    `);
    
    console.log(`✅ Updated ${updateResult.rowCount} compensation records to active`);

    // Now test our specific staff ID
    const testUserId = 'eb892974-5624-42e5-a0de-6a1e80cd182a';
    
    console.log('\n🧪 Testing staff ID:', testUserId);
    const result = await pool.query(`
      SELECT 
        employee_id,
        basic_salary,
        housing_allowance,
        transport_allowance,
        meal_allowance,
        payment_frequency,
        currency,
        is_active
      FROM employee_compensation 
      WHERE employee_id = $1 AND is_active = true
      ORDER BY effective_from DESC
      LIMIT 1
    `, [testUserId]);
    
    if (result.rows.length > 0) {
      const compensation = result.rows[0];
      const total_package = 
        (parseFloat(compensation.basic_salary) || 0) +
        (parseFloat(compensation.housing_allowance) || 0) +
        (parseFloat(compensation.transport_allowance) || 0) +
        (parseFloat(compensation.meal_allowance) || 0);
      
      console.log('✅ Found active compensation:');
      console.log(`   Employee ID: ${compensation.employee_id}`);
      console.log(`   Basic Salary: ${compensation.basic_salary} IQD`);
      console.log(`   Housing: ${compensation.housing_allowance} IQD`);
      console.log(`   Transport: ${compensation.transport_allowance} IQD`);
      console.log(`   Meal: ${compensation.meal_allowance} IQD`);
      console.log(`   Payment Frequency: ${compensation.payment_frequency}`);
      console.log(`   Total Package: ${total_package} IQD`);
      console.log(`   Is Active: ${compensation.is_active}`);
      
      console.log('\n🎉 The compensation page should now work!');
      console.log('Refresh http://localhost:3000/staff/compensation');
      
    } else {
      console.log('❌ Still no data found. Let me check all active records...');
      
      const activeCheck = await pool.query(`
        SELECT ec.employee_id, s.firstname, s.lastname, ec.payment_frequency, ec.is_active
        FROM employee_compensation ec
        JOIN staff s ON ec.employee_id = s.staffid
        WHERE ec.payment_frequency IN ('WEEKLY', 'BI-WEEKLY', 'MONTHLY', 'QUARTERLY')
        ORDER BY ec.payment_frequency
        LIMIT 4
      `);
      
      console.log('Active compensation records:');
      activeCheck.rows.forEach((row, i) => {
        console.log(`${i+1}. ${row.firstname} ${row.lastname} - ${row.payment_frequency} (Active: ${row.is_active})`);
        console.log(`   const testUserId = '${row.employee_id}';`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixCompensationActive();
