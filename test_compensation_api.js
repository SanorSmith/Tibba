const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function testCompensationAPI() {
  try {
    console.log('🧪 Testing Compensation API Logic...');
    
    const testUserId = 'eb892974-5624-42e5-a0de-6a1e80cd182a';
    
    console.log('\n1️⃣ Testing database query directly:');
    const result = await pool.query(`
      SELECT 
        id,
        employee_id,
        basic_salary,
        housing_allowance,
        transport_allowance,
        meal_allowance,
        payment_frequency,
        currency,
        salary_grade_id,
        effective_from,
        effective_to,
        is_active
      FROM employee_compensation 
      WHERE employee_id = $1 AND is_active = true
      ORDER BY effective_from DESC
      LIMIT 1
    `, [testUserId]);
    
    console.log('Query result:', result.rows);
    
    if (result.rows.length > 0) {
      const compensation = result.rows[0];
      const total_package = 
        (parseFloat(compensation.basic_salary) || 0) +
        (parseFloat(compensation.housing_allowance) || 0) +
        (parseFloat(compensation.transport_allowance) || 0) +
        (parseFloat(compensation.meal_allowance) || 0);
      
      console.log('\n✅ Found compensation data:');
      console.log(`   Employee ID: ${compensation.employee_id}`);
      console.log(`   Basic Salary: ${compensation.basic_salary}`);
      console.log(`   Housing: ${compensation.housing_allowance}`);
      console.log(`   Transport: ${compensation.transport_allowance}`);
      console.log(`   Meal: ${compensation.meal_allowance}`);
      console.log(`   Payment Frequency: ${compensation.payment_frequency}`);
      console.log(`   Total Package: ${total_package}`);
      console.log(`   Is Active: ${compensation.is_active}`);
      
      console.log('\n📊 API Response format should be:');
      console.log({
        success: true,
        data: {
          ...compensation,
          total_package
        }
      });
      
    } else {
      console.log('❌ No compensation data found for this staff ID');
      
      // Let's check what staff IDs exist
      console.log('\n🔍 Checking available staff with compensation:');
      const staffCheck = await pool.query(`
        SELECT DISTINCT ec.employee_id, s.firstname, s.lastname, ec.payment_frequency
        FROM employee_compensation ec
        JOIN staff s ON ec.employee_id = s.staffid
        LIMIT 5
      `);
      
      console.log('Available staff with compensation:');
      staffCheck.rows.forEach((row, i) => {
        console.log(`${i+1}. ${row.firstname} ${row.lastname} - ${row.payment_frequency}`);
        console.log(`   ID: ${row.employee_id}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testCompensationAPI();
