const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkReviewIds() {
  try {
    console.log('📋 Recent Review IDs in Database:');
    console.log('='.repeat(60));

    const result = await pool.query(`
      SELECT id, employee_id, status, created_at
      FROM performance_reviews 
      ORDER BY created_at DESC 
      LIMIT 10
    `);

    result.rows.forEach((review, index) => {
      console.log(`${index + 1}. ${review.id}`);
      console.log(`   Employee: ${review.employee_id}`);
      console.log(`   Status: ${review.status}`);
      console.log(`   Created: ${review.created_at}`);
      console.log('');
    });

    console.log('='.repeat(60));
    console.log(`Total reviews: ${result.rows.length} shown`);

    // Check if the problematic ID exists
    const problematicId = '0179e29e-cb91-4d90-a99a-81db3b4795c8';
    const checkResult = await pool.query(
      'SELECT * FROM performance_reviews WHERE id = $1',
      [problematicId]
    );

    if (checkResult.rows.length === 0) {
      console.log(`\n❌ Review ID ${problematicId} does NOT exist in database`);
    } else {
      console.log(`\n✅ Review ID ${problematicId} exists`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkReviewIds();
