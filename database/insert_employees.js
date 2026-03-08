const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function insertEmployees() {
  try {
    console.log('👥 Inserting employees into database...');
    
    // Read employees JSON
    const employeesData = JSON.parse(fs.readFileSync('G:\\Windsurf Workspace\\Tibbna_openEhr\\tibbna-hospital\\src\\data\\hr\\employees.json', 'utf8'));
    
    // Take first 10 employees
    const employees = employeesData.employees.slice(0, 10);
    
    for (const emp of employees) {
      const sql = `
        INSERT INTO employees (
          employee_id, employee_number, first_name, last_name, full_name_arabic,
          date_of_birth, gender, marital_status, nationality, national_id,
          email_work, phone_mobile, blood_type, employment_type, employee_category,
          job_title, department_id, department_name, reporting_to, grade_id,
          date_of_hire, employment_status, basic_salary, photo_url
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24
        )
      `;
      
      await pool.query(sql, [
        emp.id, emp.employee_number, emp.first_name, emp.last_name, emp.full_name_arabic,
        emp.date_of_birth, emp.gender, emp.marital_status, emp.nationality, emp.national_id,
        emp.email_work, emp.phone_mobile, emp.blood_type, emp.employment_type, emp.employee_category,
        emp.job_title, emp.department_id, emp.department_name, emp.reporting_to, emp.grade_id,
        emp.date_of_hire, emp.employment_status, emp.basic_salary, emp.photo_url
      ]);
      
      console.log(`✅ Inserted: ${emp.first_name} ${emp.last_name} (${emp.employee_id})`);
    }
    
    // Verify count
    const result = await pool.query('SELECT COUNT(*) as count FROM employees');
    console.log(`📊 Total employees in database: ${result.rows[0].count}`);
    
  } catch(err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

insertEmployees();
