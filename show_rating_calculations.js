const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function showRatingCalculations() {
  try {
    console.log('📊 How Rating Categories Are Calculated');
    console.log('='.repeat(60));

    const result = await pool.query(`
      SELECT 
        id,
        employee_id,
        clinical_competence,
        patient_care,
        professionalism,
        teamwork,
        quality_safety,
        status
      FROM performance_reviews 
      ORDER BY created_at DESC
    `);

    console.log('\n🔍 Individual Review Calculations:');
    console.log('-'.repeat(60));

    result.rows.forEach((review, index) => {
      // Extract competency scores
      const competencies = [
        review.clinical_competence,
        review.patient_care,
        review.professionalism,
        review.teamwork,
        review.quality_safety
      ].filter(val => val != null && !isNaN(val));

      // Calculate average
      const average = competencies.length > 0 
        ? (competencies.reduce((a, b) => a + b, 0) / competencies.length).toFixed(2)
        : '0.00';

      // Categorize
      let category;
      if (average >= 5.0) category = '5.0 - Outstanding 🟢';
      else if (average >= 4.0) category = '4.0-4.9 - Exceeds 🔵';
      else if (average >= 3.0) category = '3.0-3.9 - Meets 🟡';
      else if (average >= 2.0) category = '2.0-2.9 - Below 🔴';
      else category = '1.0-1.9 - Unsatisfactory 🔴';

      console.log(`\n${index + 1}. Review ${review.id.substring(0, 8)}...`);
      console.log(`   Competencies: [${competencies.join(', ')}]`);
      console.log(`   Calculation: (${competencies.join(' + ')}) / ${competencies.length} = ${average}`);
      console.log(`   Category: ${category}`);
      console.log(`   Status: ${review.status}`);
    });

    // Show distribution summary
    console.log('\n📈 Distribution Summary:');
    console.log('-'.repeat(30));

    const categories = {
      '5.0 - Outstanding': 0,
      '4.0-4.9 - Exceeds': 0,
      '3.0-3.9 - Meets': 0,
      '2.0-2.9 - Below': 0,
      '1.0-1.9 - Unsatisfactory': 0
    };

    result.rows.forEach(review => {
      const competencies = [
        review.clinical_competence,
        review.patient_care,
        review.professionalism,
        review.teamwork,
        review.quality_safety
      ].filter(val => val != null && !isNaN(val));

      const average = competencies.length > 0 
        ? (competencies.reduce((a, b) => a + b, 0) / competencies.length)
        : 0;

      if (average >= 5.0) categories['5.0 - Outstanding']++;
      else if (average >= 4.0) categories['4.0-4.9 - Exceeds']++;
      else if (average >= 3.0) categories['3.0-3.9 - Meets']++;
      else if (average >= 2.0) categories['2.0-2.9 - Below']++;
      else categories['1.0-1.9 - Unsatisfactory']++;
    });

    Object.entries(categories).forEach(([category, count]) => {
      const percentage = result.rows.length > 0 ? Math.round((count / result.rows.length) * 100) : 0;
      console.log(`${category}: ${count} reviews (${percentage}%)`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

showRatingCalculations();
