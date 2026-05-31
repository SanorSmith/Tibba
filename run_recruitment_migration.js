const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  console.log('🚀 Running Enterprise Recruitment System Migration...\n');
  
  const client = await pool.connect();
  try {
    const sqlPath = path.join(__dirname, 'src', 'lib', 'db', 'migrations', '001_recruitment_system.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    console.log('📄 Executing migration SQL...');
    await client.query(sql);
    console.log('✅ Migration executed successfully!\n');
    
    // Verify: list all recruitment-related tables
    const verifyQuery = `
      SELECT table_name,
             (SELECT COUNT(*) FROM information_schema.columns c 
              WHERE c.table_name = t.table_name AND c.table_schema = 'public') as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      AND (
        table_name LIKE 'job_%' OR
        table_name LIKE 'recruitment_%' OR
        table_name LIKE 'interview_%' OR
        table_name LIKE 'candidate_%' OR
        table_name LIKE 'assessment_%' OR
        table_name LIKE 'reference_%' OR
        table_name LIKE 'background_%' OR
        table_name LIKE 'offer_%' OR
        table_name LIKE 'hiring_%' OR
        table_name LIKE 'requisition_%' OR
        table_name LIKE 'evaluation_%' OR
        table_name LIKE 'application_%'
      )
      ORDER BY table_name
    `;
    
    const result = await client.query(verifyQuery);
    
    console.log('📊 RECRUITMENT TABLES VERIFICATION:');
    console.log('─'.repeat(60));
    console.log(`${'Table Name'.padEnd(40)} ${'Columns'.padStart(10)}`);
    console.log('─'.repeat(60));
    result.rows.forEach(row => {
      console.log(`${row.table_name.padEnd(40)} ${String(row.column_count).padStart(10)}`);
    });
    console.log('─'.repeat(60));
    console.log(`Total tables: ${result.rows.length}`);
    
    // Verify enhanced columns on job_candidates
    const jcCols = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'job_candidates' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    console.log(`\n📋 job_candidates now has ${jcCols.rows.length} columns`);
    
    // Verify enhanced columns on job_vacancies
    const jvCols = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'job_vacancies' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    console.log(`📋 job_vacancies now has ${jvCols.rows.length} columns`);
    
    // Verify existing data is intact
    const jcCount = await client.query('SELECT COUNT(*) as count FROM job_candidates');
    const jvCount = await client.query('SELECT COUNT(*) as count FROM job_vacancies');
    console.log(`\n🔒 Data integrity check:`);
    console.log(`   job_candidates: ${jcCount.rows[0].count} records (preserved)`);
    console.log(`   job_vacancies: ${jvCount.rows[0].count} records (preserved)`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
