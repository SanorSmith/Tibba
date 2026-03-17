const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkExistingVacancies() {
  try {
    console.log('🔍 Checking Existing Vacancies...');
    
    const client = await pool.connect();
    
    try {
      // Get all vacancies
      const result = await client.query('SELECT id, vacancy_number, position, status FROM job_vacancies ORDER BY vacancy_number');
      
      console.log('\n📋 All Vacancies in Database:');
      result.rows.forEach((row, i) => {
        console.log(`  ${i+1}. ${row.vacancy_number} | ${row.position} | ${row.status}`);
        console.log(`     ID: ${row.id}`);
        console.log('');
      });
      
      // Check if VAC-004 exists
      const vac004 = result.rows.find(row => row.vacancy_number === 'VAC-004');
      if (vac004) {
        console.log('✅ VAC-004 exists in database');
      } else {
        console.log('❌ VAC-004 does NOT exist in database');
        console.log('🔍 Available vacancy numbers:');
        result.rows.forEach(row => {
          console.log(`   - ${row.vacancy_number}`);
        });
      }
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkExistingVacancies();
