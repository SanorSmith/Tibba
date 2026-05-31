const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: { rejectUnauthorized: false }
});

async function testAllQueries() {
  const client = await pool.connect();
  
  try {
    console.log('=== TESTING ALL FINANCIAL QUERIES ===');
    
    const dateFilter = ` AND DATE(s.createdat) >= DATE_TRUNC('month', CURRENT_DATE)`;
    
    // 1. Services query
    console.log('\n1️⃣ Testing Services Query...');
    try {
      const serviceQuery = `
        SELECT 
          s.category,
          SUM(s.price_self_pay + s.price_insurance + s.price_government) as revenue,
          COUNT(*) as transaction_count,
          COALESCE(d.name, 'Uncategorized Department') as department_name
        FROM services s
        LEFT JOIN departments d ON d.departmentid::text = s.department_id
        WHERE s.active = true ${dateFilter}
        GROUP BY s.category, d.name
        ORDER BY revenue DESC
      `;
      const serviceResult = await client.query(serviceQuery);
      console.log(`✅ Services: ${serviceResult.rows.length} rows`);
    } catch (err) {
      console.log(`❌ Services failed: ${err.message}`);
    }
    
    // 2. Invoices query
    console.log('\n2️⃣ Testing Invoices Query...');
    try {
      const invoiceQuery = `
        SELECT 
          'PAID_INVOICES' as category,
          SUM(total_amount) as revenue,
          COUNT(*) as transaction_count,
          'All Departments' as department_name
        FROM invoices i
        WHERE i.status = 'PAID' ${dateFilter.replace('DATE(s.createdat)', 'DATE(i.invoice_date)')}
      `;
      const invoiceResult = await client.query(invoiceQuery);
      console.log(`✅ Invoices: ${invoiceResult.rows.length} rows`);
    } catch (err) {
      console.log(`❌ Invoices failed: ${err.message}`);
    }
    
    // 3. Insurance query
    console.log('\n3️⃣ Testing Insurance Query...');
    try {
      const insuranceQuery = `
        SELECT 
          'INSURANCE_PAYMENTS' as category,
          SUM(i.insurance_coverage_amount) as revenue,
          COUNT(*) as transaction_count,
          'Insurance Companies' as department_name
        FROM invoices i
        WHERE i.status = 'PAID' AND i.insurance_coverage_amount > 0 
          ${dateFilter.replace('DATE(s.createdat)', 'DATE(i.invoice_date)')}
      `;
      const insuranceResult = await client.query(insuranceQuery);
      console.log(`✅ Insurance: ${insuranceResult.rows.length} rows`);
    } catch (err) {
      console.log(`❌ Insurance failed: ${err.message}`);
    }
    
    // 4. Patient payments query
    console.log('\n4️⃣ Testing Patient Payments Query...');
    try {
      const patientQuery = `
        SELECT 
          'PATIENT_PAYMENTS' as category,
          SUM(i.patient_responsibility) as revenue,
          COUNT(*) as transaction_count,
          'Patient Payments' as department_name
        FROM invoices i
        WHERE i.status = 'PAID' AND i.patient_responsibility > 0 
          ${dateFilter.replace('DATE(s.createdat)', 'DATE(i.invoice_date)')}
      `;
      const patientResult = await client.query(patientQuery);
      console.log(`✅ Patient Payments: ${patientResult.rows.length} rows`);
    } catch (err) {
      console.log(`❌ Patient Payments failed: ${err.message}`);
    }
    
    // 5. Payroll query
    console.log('\n5️⃣ Testing Payroll Query...');
    try {
      const payrollQuery = `
        SELECT 
          'SALARIES_WAGES' as category,
          SUM(pt.gross_salary) as expenses,
          COUNT(DISTINCT pt.employee_id) as transaction_count,
          'HR Department' as department_name
        FROM payroll_transactions pt
        WHERE 1=1 ${dateFilter.replace('DATE(s.createdat)', 'DATE(pt.created_at)')}
      `;
      const payrollResult = await client.query(payrollQuery);
      console.log(`✅ Payroll: ${payrollResult.rows.length} rows`);
    } catch (err) {
      console.log(`❌ Payroll failed: ${err.message}`);
    }
    
    // 6. Departments query
    console.log('\n6️⃣ Testing Departments Query...');
    try {
      const departmentsQuery = `
        SELECT DISTINCT department_id, department_name 
        FROM services 
        WHERE department_id IS NOT NULL
        ORDER BY department_name
      `;
      const departmentsResult = await client.query(departmentsQuery);
      console.log(`✅ Departments: ${departmentsResult.rows.length} rows`);
    } catch (err) {
      console.log(`❌ Departments failed: ${err.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testAllQueries();
