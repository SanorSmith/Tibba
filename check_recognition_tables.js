const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkRecognitionTables() {
  try {
    console.log('🔍 Checking Recognition-related Tables:');
    console.log('='.repeat(40));

    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%recognition%' 
      ORDER BY table_name
    `);

    if (result.rows.length > 0) {
      result.rows.forEach(row => {
        console.log(`   ✅ ${row.table_name}`);
      });
    } else {
      console.log('   ❌ No recognition tables found');
      console.log('   💡 Checking if recognitions are stored in performance_reviews table...');
      
      const checkPerformanceReviews = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'performance_reviews' 
        AND column_name LIKE '%recognition%'
      `);
      
      if (checkPerformanceReviews.rows.length > 0) {
        console.log('   ✅ Found recognition columns in performance_reviews:');
        checkPerformanceReviews.rows.forEach(row => {
          console.log(`      - ${row.column_name}`);
        });
      } else {
        console.log('   ❌ No recognition columns found');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkRecognitionTables();
