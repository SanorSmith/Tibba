const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function updateDemoFrequencies() {
  try {
    console.log('🎯 Updating Demo Payment Frequencies...');

    // Get staff members and update them with different frequencies
    const staffResult = await pool.query(`
      SELECT ec.employee_id, s.firstname, s.lastname 
      FROM employee_compensation ec
      JOIN staff s ON ec.employee_id = s.staffid
      LIMIT 4
    `);

    const frequencies = [
      { 
        frequency: 'WEEKLY',
        basic_salary: 1500000,      // 1.5M IQD/week
        housing: 300000,            // 300K IQD/week
        transport: 100000,          // 100K IQD/week
        meal: 75000,                // 75K IQD/week
        description: 'Weekly payment'
      },
      { 
        frequency: 'BI-WEEKLY',
        basic_salary: 3000000,      // 3M IQD/bi-weekly
        housing: 600000,            // 600K IQD/bi-weekly
        transport: 200000,          // 200K IQD/bi-weekly
        meal: 150000,               // 150K IQD/bi-weekly
        description: 'Bi-weekly payment'
      },
      { 
        frequency: 'MONTHLY',
        basic_salary: 5000000,      // 5M IQD/month
        housing: 1000000,           // 1M IQD/month
        transport: 300000,          // 300K IQD/month
        meal: 200000,               // 200K IQD/month
        description: 'Monthly payment'
      },
      { 
        frequency: 'QUARTERLY',
        basic_salary: 15000000,     // 15M IQD/quarter
        housing: 3000000,           // 3M IQD/quarter
        transport: 900000,          // 900K IQD/quarter
        meal: 600000,               // 600K IQD/quarter
        description: 'Quarterly payment'
      }
    ];

    console.log('\n📝 Updating compensation records with different frequencies...');

    for (let i = 0; i < Math.min(staffResult.rows.length, frequencies.length); i++) {
      const staff = staffResult.rows[i];
      const freqData = frequencies[i];
      
      await pool.query(`
        UPDATE employee_compensation 
        SET 
          payment_frequency = $1,
          basic_salary = $2,
          housing_allowance = $3,
          transport_allowance = $4,
          meal_allowance = $5
        WHERE employee_id = $6
      `, [
        freqData.frequency,
        freqData.basic_salary,
        freqData.housing,
        freqData.transport,
        freqData.meal,
        staff.employee_id
      ]);

      const totalPackage = freqData.basic_salary + freqData.housing + freqData.transport + freqData.meal;

      console.log(`✅ Updated ${staff.firstname} ${staff.lastname}:`);
      console.log(`   Payment Frequency: ${freqData.frequency}`);
      console.log(`   Basic Salary: ${freqData.basic_salary.toLocaleString()} IQD`);
      console.log(`   Total Package: ${totalPackage.toLocaleString()} IQD`);
      console.log(`   Staff ID: ${staff.employee_id}`);
    }

    // Show updated summary
    console.log('\n📊 Updated Payment Frequency Distribution:');
    const summary = await pool.query(`
      SELECT 
        ec.payment_frequency,
        COUNT(*) as count,
        AVG(ec.basic_salary) as avg_salary,
        AVG(ec.total_package) as avg_total
      FROM employee_compensation ec
      GROUP BY ec.payment_frequency
      ORDER BY ec.payment_frequency
    `);

    summary.rows.forEach(row => {
      console.log(`${row.payment_frequency}: ${row.count} employees`);
      console.log(`   Avg Salary: ${Math.round(row.avg_salary).toLocaleString()} IQD`);
      console.log(`   Avg Total: ${Math.round(row.avg_total).toLocaleString()} IQD`);
    });

    // Get specific staff IDs for testing different frequencies
    console.log('\n🔄 Test Staff IDs for Different Frequencies:');
    const testStaff = await pool.query(`
      SELECT ec.employee_id, ec.payment_frequency, s.firstname, s.lastname,
             ec.basic_salary, ec.total_package
      FROM employee_compensation ec
      JOIN staff s ON ec.employee_id = s.staffid
      WHERE ec.payment_frequency IN ('WEEKLY', 'BI-WEEKLY', 'MONTHLY', 'QUARTERLY')
      ORDER BY ec.payment_frequency
    `);
    
    testStaff.rows.forEach((row, i) => {
      console.log(`\n${i+1}. ${row.firstname} ${row.lastname} - ${row.payment_frequency}`);
      console.log(`   const testUserId = '${row.employee_id}';`);
      console.log(`   Salary: ${row.basic_salary.toLocaleString()} IQD`);
      console.log(`   Total: ${row.total_package.toLocaleString()} IQD`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

updateDemoFrequencies();
