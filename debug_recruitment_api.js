const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function debugRecruitmentAPI() {
  try {
    console.log('🔍 Debugging Recruitment API...');
    
    // Check if tables exist and have data
    const client = await pool.connect();
    
    try {
      // Check job_vacancies table
      const vacancyCheck = await client.query('SELECT COUNT(*) as count FROM job_vacancies');
      console.log(`✅ job_vacancies table has ${vacancyCheck.rows[0].count} records`);
      
      // Get sample vacancy data with IDs
      const vacancySample = await client.query('SELECT id, vacancy_number, position FROM job_vacancies LIMIT 5');
      console.log('\n📋 Sample Vacancies:');
      vacancySample.rows.forEach((row, i) => {
        console.log(`  ${i+1}. ID: ${row.id} | ${row.vacancy_number} | ${row.position}`);
      });
      
      // Check job_candidates table
      const candidateCheck = await client.query('SELECT COUNT(*) as count FROM job_candidates');
      console.log(`\n✅ job_candidates table has ${candidateCheck.rows[0].count} records`);
      
      // Get sample candidate data
      const candidateSample = await client.query('SELECT id, candidate_number, first_name, last_name, vacancy_id FROM job_candidates LIMIT 5');
      console.log('\n👥 Sample Candidates:');
      candidateSample.rows.forEach((row, i) => {
        console.log(`  ${i+1}. ID: ${row.id} | ${row.candidate_number} | ${row.first_name} ${row.last_name} | Vacancy: ${row.vacancy_id}`);
      });
      
      // Check API endpoint format
      console.log('\n🔗 API URL Format:');
      console.log('   Main page: http://localhost:3000/hr/recruitment');
      console.log('   Vacancy detail: http://localhost:3000/hr/recruitment/vacancies/[id]');
      console.log('   Example: http://localhost:3000/hr/recruitment/vacancies/' + vacancySample.rows[0]?.id);
      
      // Test API endpoints
      console.log('\n🧪 Testing API Endpoints:');
      console.log('   GET /api/hr/recruitment?type=vacancies');
      console.log('   GET /api/hr/recruitment?type=candidates');
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugRecruitmentAPI();
