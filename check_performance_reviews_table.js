const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkPerformanceReviewsTable() {
  try {
    console.log('📊 performance_reviews Table Structure:');
    console.log('='.repeat(60));

    // Get table structure
    const structureResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'performance_reviews'
      ORDER BY ordinal_position
    `);

    structureResult.rows.forEach(col => {
      console.log(`${col.column_name.padEnd(25)} | ${col.data_type.padEnd(15)} | ${col.is_nullable}`);
    });

    console.log('='.repeat(60));

    // Get recent reviews
    const reviewsResult = await pool.query(`
      SELECT 
        id, 
        employee_id, 
        cycle_id, 
        status, 
        clinical_competence, 
        patient_care, 
        professionalism, 
        teamwork, 
        quality_safety,
        created_at,
        reviewer_id
      FROM performance_reviews 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    console.log('\n📋 Recent Performance Reviews:');
    console.log('='.repeat(60));

    reviewsResult.rows.forEach((review, index) => {
      console.log(`\n${index + 1}. Review ID: ${review.id}`);
      console.log(`   Employee ID: ${review.employee_id}`);
      console.log(`   Cycle: ${review.cycle_id}`);
      console.log(`   Status: ${review.status}`);
      console.log(`   Reviewer ID: ${review.reviewer_id || 'System'}`);
      console.log(`   Created: ${review.created_at}`);
      console.log(`   Ratings: Clinical=${review.clinical_competence}, Patient=${review.patient_care}, Professional=${review.professionalism}, Teamwork=${review.teamwork}, Quality=${review.quality_safety}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log(`📈 Total Reviews: ${reviewsResult.rows.length} shown (most recent)`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkPerformanceReviewsTable();
