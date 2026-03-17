const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function activateCompensation() {
  try {
    console.log('🔧 Activating Recent Compensation Records...');
    
    // Activate recent compensation records
    const activateQuery = `
      UPDATE employee_compensation 
      SET is_active = true 
      WHERE employee_id IN (
        SELECT staffid 
        FROM staff 
        WHERE createdat > NOW() - INTERVAL '2 hours'
      )
      AND is_active = false
    `;
    
    const result = await pool.query(activateQuery);
    
    console.log(`✅ Activated ${result.rowCount} compensation records`);
    
    // Check Sanor Smith's specific compensation
    const sanorQuery = `
      SELECT 
        s.firstname || ' ' || s.lastname as employee_name,
        s.email,
        ec.basic_salary,
        ec.payment_frequency,
        ec.currency,
        ec.total_package,
        ec.effective_from,
        ec.is_active
      FROM staff s
      JOIN employee_compensation ec ON s.staffid = ec.employee_id
      WHERE s.email = 'sanorsmith83@gmail.com'
    `;
    
    const sanorResult = await pool.query(sanorQuery);
    
    if (sanorResult.rows.length > 0) {
      const record = sanorResult.rows[0];
      console.log('\n📋 Sanor Smith Compensation:');
      console.log(`   Name: ${record.employee_name}`);
      console.log(`   Email: ${record.email}`);
      console.log(`   Basic Salary: ${record.basic_salary} ${record.currency}`);
      console.log(`   Payment Frequency: ${record.payment_frequency}`);
      console.log(`   Total Package: ${record.total_package} ${record.currency}`);
      console.log(`   Active: ${record.is_active}`);
      console.log(`   Effective From: ${record.effective_from}`);
      
      if (record.is_active) {
        console.log('\n✅ Sanor Smith compensation is ACTIVE and ready to view!');
        console.log('📱 Check: http://localhost:3000/staff/compensation');
        console.log('👥 HR View: http://localhost:3000/hr/payroll/compensation');
      } else {
        console.log('\n❌ Sanor Smith compensation is still INACTIVE');
      }
    } else {
      console.log('❌ Sanor Smith compensation record not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

activateCompensation();
