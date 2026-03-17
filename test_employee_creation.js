const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function testEmployeeCreation() {
  try {
    console.log('🧪 Testing Employee Creation...');
    
    // Test data
    const testData = {
      first_name: 'Test',
      last_name: 'Employee',
      email: 'test@example.com',
      date_of_hire: '2026-03-14',
      basic_salary: 5000000,
      payment_frequency: 'MONTHLY'
    };
    
    console.log('📝 Test Data:', testData);
    
    // Start transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Create employee record - simplified version
      const employeeQuery = `
        INSERT INTO staff (
          workspaceid,
          firstname, 
          middlename, 
          lastname, 
          email,
          role,
          unit,
          createdat,
          updatedat
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING staffid, custom_staff_id
      `;
      
      const employeeResult = await client.query(employeeQuery, [
        'b227528d-ca34-4850-9b72-94a220365d7f', // Baghdad health center workspace ID
        testData.first_name,
        null, // middle_name
        testData.last_name,
        testData.email,
        'Staff', // role
        'General' // unit
      ]);
      
      const newEmployee = employeeResult.rows[0];
      const employeeId = newEmployee.staffid;
      
      console.log('✅ Employee created:', {
        staffid: employeeId,
        custom_staff_id: newEmployee.custom_staff_id
      });
      
      // 2. Create compensation record
      if (testData.basic_salary) {
        const compensationQuery = `
          INSERT INTO employee_compensation (
            employee_id,
            basic_salary,
            housing_allowance,
            transport_allowance,
            meal_allowance,
            payment_frequency,
            currency,
            effective_from,
            is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
          RETURNING *
        `;
        
        const compensationResult = await client.query(compensationQuery, [
          employeeId,
          testData.basic_salary,
          0, // housing_allowance
          0, // transport_allowance
          0, // meal_allowance
          testData.payment_frequency,
          'USD',
          testData.date_of_hire
        ]);
        
        console.log('✅ Compensation created:', compensationResult.rows[0]);
      }
      
      await client.query('COMMIT');
      
      console.log('\n🎉 Employee and compensation created successfully!');
      console.log('📊 Check the database for the new records.');
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error:', error.message);
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testEmployeeCreation();
