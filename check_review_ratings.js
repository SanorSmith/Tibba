const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkReviewRatings() {
  try {
    console.log('📊 Review Ratings Analysis:');
    console.log('='.repeat(60));

    const result = await pool.query(`
      SELECT 
        id, 
        overall_rating, 
        clinical_competence, 
        patient_care, 
        professionalism, 
        teamwork, 
        quality_safety,
        status
      FROM performance_reviews 
      ORDER BY created_at DESC 
      LIMIT 10
    `);

    result.rows.forEach((review, index) => {
      console.log(`${index + 1}. Review: ${review.id.substring(0, 8)}...`);
      console.log(`   Overall Rating: ${review.overall_rating || 'NULL'}`);
      console.log(`   Status: ${review.status}`);
      console.log(`   Competencies: C=${review.clinical_competence || 'NULL'}, P=${review.patient_care || 'NULL'}, Pr=${review.professionalism || 'NULL'}, T=${review.teamwork || 'NULL'}, Q=${review.quality_safety || 'NULL'}`);
      console.log('');
    });

    // Count overall ratings
    const ratingStats = await pool.query(`
      SELECT 
        overall_rating,
        COUNT(*) as count
      FROM performance_reviews 
      WHERE overall_rating IS NOT NULL
      GROUP BY overall_rating
      ORDER BY overall_rating DESC
    `);

    console.log('📈 Overall Rating Distribution:');
    console.log('='.repeat(30));
    ratingStats.rows.forEach(stat => {
      console.log(`${stat.overall_rating}: ${stat.count} reviews`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkReviewRatings();
