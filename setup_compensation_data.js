const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function setupCompensationData() {
  try {
    console.log('🔧 Setting up compensation data...');

    // 1. Get staff members
    const staffResult = await pool.query('SELECT staffid, firstname, lastname FROM staff LIMIT 5');
    console.log('Available staff:');
    staffResult.rows.forEach((row, i) => {
      console.log(`${i+1}. ${row.staffid} - ${row.firstname} ${row.lastname}`);
    });

    // 2. Check existing compensation
    const compResult = await pool.query('SELECT employee_id, payment_frequency, basic_salary FROM employee_compensation LIMIT 5');
    console.log('\nExisting compensation records:');
    if (compResult.rows.length > 0) {
      compResult.rows.forEach((row, i) => {
        console.log(`${i+1}. Employee: ${row.employee_id.substring(0, 8)}..., Freq: ${row.payment_frequency}, Salary: ${row.basic_salary}`);
      });
    } else {
      console.log('No compensation records found');
    }

    // 3. Create compensation for first staff member if not exists
    const firstStaff = staffResult.rows[0];
    if (firstStaff) {
      const existingComp = await pool.query('SELECT * FROM employee_compensation WHERE employee_id = $1', [firstStaff.staffid]);
      
      if (existingComp.rows.length === 0) {
        console.log(`\n📝 Creating compensation for ${firstStaff.firstname} ${firstStaff.lastname}...`);
        
        const insertResult = await pool.query(`
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
          RETURNING *
        `, [
          firstStaff.staffid,
          5000000,  // Basic salary: 5M IQD
          500000,   // Housing: 500K IQD
          200000,   // Transport: 200K IQD
          150000,   // Meal: 150K IQD
          'MONTHLY', // Payment frequency
          'IQD',
          5850000,   // Total package
          '2026-01-01'
        ]);

        console.log('✅ Compensation created:');
        console.log(`   Employee: ${firstStaff.firstname} ${firstStaff.lastname}`);
        console.log(`   Payment Frequency: ${insertResult.rows[0].payment_frequency}`);
        console.log(`   Total Package: ${insertResult.rows[0].total_package} IQD`);

        // Update the test user ID in the compensation page
        console.log(`\n🔄 Update your compensation page to use this staff ID:`);
        console.log(`const testUserId = '${firstStaff.staffid}';`);

      } else {
        console.log(`\n✅ ${firstStaff.firstname} ${firstStaff.lastname} already has compensation:`);
        console.log(`   Payment Frequency: ${existingComp.rows[0].payment_frequency}`);
        console.log(`   Total Package: ${existingComp.rows[0].total_package} IQD`);
        console.log(`\n🔄 Update your compensation page to use this staff ID:`);
        console.log(`const testUserId = '${firstStaff.staffid}';`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

setupCompensationData();
