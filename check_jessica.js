const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkJessica() {
  try {
    console.log('Searching for employees with first name containing "jessica"...');
    
    // Search for Jessica (case-insensitive)
    const result = await pool.query(`
      SELECT id, employee_id, employee_number, first_name, last_name, department_name, job_title
      FROM employees 
      WHERE LOWER(first_name) LIKE '%jessica%'
      ORDER BY first_name, last_name
    `);
    
    console.log(`Found ${result.rows.length} employees:`);
    
    if (result.rows.length === 0) {
      console.log('No employees found with "jessica" in first name');
      
      // Let's check a few sample employees to see what we have
      console.log('\nSample employees from database:');
      const sampleResult = await pool.query(`
        SELECT id, employee_id, employee_number, first_name, last_name, department_name, job_title
        FROM employees 
        ORDER BY first_name, last_name
        LIMIT 10
      `);
      
      sampleResult.rows.forEach(emp => {
        console.log(`- ${emp.first_name} ${emp.last_name} (${emp.employee_number}) - ${emp.department_name || 'N/A'}`);
      });
    } else {
      result.rows.forEach(emp => {
        console.log(`- ${emp.first_name} ${emp.last_name} (${emp.employee_number}) - ${emp.department_name || 'N/A'} - ${emp.job_title || 'N/A'}`);
      });
    }
    
    // Also test the API endpoint directly
    console.log('\nTesting API endpoint...');
    const response = await fetch('http://localhost:3001/api/hr/employees');
    const data = await response.json();
    
    if (data.success) {
      console.log(`API returned ${data.data.length} employees`);
      
      const jessicaInAPI = data.data.filter(emp => 
        emp.first_name && emp.first_name.toLowerCase().includes('jessica')
      );
      
      console.log(`API search found ${jessicaInAPI.length} employees with "jessica":`);
      jessicaInAPI.forEach(emp => {
        console.log(`- ${emp.first_name} ${emp.last_name} (${emp.employee_number}) - ${emp.department_name || 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkJessica();
