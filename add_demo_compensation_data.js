const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function addDemoCompensationData() {
  try {
    console.log('🎯 Adding Demo Compensation Data...');

    // Get first 4 staff members
    const staffResult = await pool.query('SELECT staffid, firstname, lastname FROM staff LIMIT 4');
    
    if (staffResult.rows.length === 0) {
      console.log('❌ No staff members found');
      return;
    }

    const demoData = [
      {
        frequency: 'WEEKLY',
        basic_salary: 1500000,      // 1.5M IQD/week
        housing: 300000,            // 300K IQD/week
        transport: 100000,          // 100K IQD/week
        meal: 75000,                // 75K IQD/week
        description: 'Weekly paid staff'
      },
      {
        frequency: 'BI-WEEKLY',
        basic_salary: 3000000,      // 3M IQD/bi-weekly
        housing: 600000,            // 600K IQD/bi-weekly
        transport: 200000,          // 200K IQD/bi-weekly
        meal: 150000,               // 150K IQD/bi-weekly
        description: 'Bi-weekly paid staff'
      },
      {
        frequency: 'MONTHLY',
        basic_salary: 5000000,      // 5M IQD/month
        housing: 1000000,           // 1M IQD/month
        transport: 300000,          // 300K IQD/month
        meal: 200000,               // 200K IQD/month
        description: 'Monthly paid staff'
      },
      {
        frequency: 'QUARTERLY',
        basic_salary: 15000000,     // 15M IQD/quarter
        housing: 3000000,           // 3M IQD/quarter
        transport: 900000,          // 900K IQD/quarter
        meal: 600000,               // 600K IQD/quarter
        description: 'Quarterly paid staff'
      }
    ];

    console.log('\n📝 Creating demo compensation records...');

    for (let i = 0; i < Math.min(staffResult.rows.length, demoData.length); i++) {
      const staff = staffResult.rows[i];
      const demo = demoData[i];
      
      // Check if compensation already exists
      const existing = await pool.query(
        'SELECT * FROM employee_compensation WHERE employee_id = $1', 
        [staff.staffid]
      );

      if (existing.rows.length === 0) {
        const totalPackage = demo.basic_salary + demo.housing + demo.transport + demo.meal;
        
        await pool.query(`
          INSERT INTO employee_compensation (
            employee_id,
            basic_salary,
            housing_allowance,
            transport_allowance,
            meal_allowance,
            payment_frequency,
            currency,
            total_package,
            effective_from,
            is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
        `, [
          staff.staffid,
          demo.basic_salary,
          demo.housing,
          demo.transport,
          demo.meal,
          demo.frequency,
          'IQD',
          totalPackage,
          '2026-01-01'
        ]);

        console.log(`✅ Created ${demo.frequency} compensation for ${staff.firstname} ${staff.lastname}`);
        console.log(`   Basic Salary: ${demo.basic_salary.toLocaleString()} IQD`);
        console.log(`   Total Package: ${totalPackage.toLocaleString()} IQD`);
        console.log(`   Payment Frequency: ${demo.frequency}`);
      } else {
        console.log(`ℹ️ ${staff.firstname} ${staff.lastname} already has compensation`);
      }
    }

    // Show summary
    console.log('\n📊 Summary of Demo Data:');
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

    console.log('\nPayment Frequency Distribution:');
    summary.rows.forEach(row => {
      console.log(`${row.payment_frequency}: ${row.count} employees`);
      console.log(`   Avg Salary: ${Math.round(row.avg_salary).toLocaleString()} IQD`);
      console.log(`   Avg Total: ${Math.round(row.avg_total).toLocaleString()} IQD`);
    });

    // Get staff IDs for testing
    console.log('\n🔄 Staff IDs you can use for testing:');
    const testStaff = await pool.query(`
      SELECT ec.employee_id, ec.payment_frequency, s.firstname, s.lastname
      FROM employee_compensation ec
      JOIN staff s ON ec.employee_id = s.staffid
      ORDER BY ec.payment_frequency
    `);
    
    testStaff.rows.forEach((row, i) => {
      console.log(`${i+1}. ${row.firstname} ${row.lastname} - ${row.payment_frequency}`);
      console.log(`   const testUserId = '${row.employee_id}';`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addDemoCompensationData();
