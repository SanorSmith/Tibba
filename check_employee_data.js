const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkEmployeeData() {
  try {
    console.log('🔍 Checking Employee Data in Database...');
    
    // Check recent staff records
    const staffQuery = `
      SELECT 
        staffid,
        custom_staff_id,
        firstname,
        lastname,
        email,
        role,
        unit,
        createdat
      FROM staff 
      WHERE createdat > NOW() - INTERVAL '1 hour'
      ORDER BY createdat DESC
      LIMIT 5
    `;
    
    const staffResult = await pool.query(staffQuery);
    
    console.log('\n📋 Recent Staff Records (last hour):');
    if (staffResult.rows.length > 0) {
      staffResult.rows.forEach((row, i) => {
        console.log(`\n${i+1}. ${row.firstname} ${row.lastname}`);
        console.log(`   ID: ${row.staffid}`);
        console.log(`   Custom ID: ${row.custom_staff_id}`);
        console.log(`   Email: ${row.email}`);
        console.log(`   Role: ${row.role}`);
        console.log(`   Unit: ${row.unit}`);
        console.log(`   Created: ${row.createdat}`);
      });
    } else {
      console.log('❌ No recent staff records found');
    }
    
    // Check compensation records for recent employees
    if (staffResult.rows.length > 0) {
      const employeeIds = staffResult.rows.map(row => row.staffid);
      
      const compensationQuery = `
        SELECT 
          ec.id,
          ec.employee_id,
          s.firstname || ' ' || s.lastname as employee_name,
          ec.basic_salary,
          ec.payment_frequency,
          ec.currency,
          ec.total_package,
          ec.effective_from,
          ec.is_active,
          ec.created_at
        FROM employee_compensation ec
        JOIN staff s ON ec.employee_id = s.staffid
        WHERE ec.employee_id = ANY($1)
        ORDER BY ec.created_at DESC
      `;
      
      const compensationResult = await pool.query(compensationQuery, [employeeIds]);
      
      console.log('\n💰 Compensation Records for Recent Employees:');
      if (compensationResult.rows.length > 0) {
        compensationResult.rows.forEach((row, i) => {
          console.log(`\n${i+1}. ${row.employee_name}`);
          console.log(`   Employee ID: ${row.employee_id}`);
          console.log(`   Basic Salary: ${row.basic_salary} ${row.currency}`);
          console.log(`   Payment Frequency: ${row.payment_frequency}`);
          console.log(`   Total Package: ${row.total_package} ${row.currency}`);
          console.log(`   Effective From: ${row.effective_from}`);
          console.log(`   Active: ${row.is_active}`);
          console.log(`   Created: ${row.created_at}`);
        });
      } else {
        console.log('❌ No compensation records found for recent employees');
      }
    }
    
    // Check total staff count
    const totalStaffQuery = 'SELECT COUNT(*) as total FROM staff';
    const totalResult = await pool.query(totalStaffQuery);
    console.log(`\n📊 Total Staff Count: ${totalResult.rows[0].total}`);
    
    // Check total compensation count
    const totalCompQuery = 'SELECT COUNT(*) as total FROM employee_compensation WHERE is_active = true';
    const totalCompResult = await pool.query(totalCompQuery);
    console.log(`📊 Total Active Compensation Records: ${totalCompResult.rows[0].total}`);
    
    // Check if there are any employees with compensation
    const withCompQuery = `
      SELECT COUNT(*) as count
      FROM staff s
      JOIN employee_compensation ec ON s.staffid = ec.employee_id
      WHERE ec.is_active = true
    `;
    const withCompResult = await pool.query(withCompQuery);
    console.log(`📊 Employees with Active Compensation: ${withCompResult.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkEmployeeData();
