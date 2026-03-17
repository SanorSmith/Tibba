const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function createSampleReviews() {
  try {
    console.log('🎯 Creating Sample Performance Reviews\n');
    console.log('='.repeat(50));

    // Get real staff members
    const staffResult = await pool.query(`
      SELECT staffid, firstname, lastname, role, unit 
      FROM staff 
      ORDER BY createdat DESC 
      LIMIT 10
    `);

    console.log(`Found ${staffResult.rows.length} staff members`);

    // Create sample reviews for first 5 staff members
    const sampleReviews = [];
    
    for (let i = 0; i < Math.min(5, staffResult.rows.length); i++) {
      const staff = staffResult.rows[i];
      const overallRating = 3.5 + (i * 0.3); // Ratings from 3.5 to 4.7
      
      const review = {
        employee_id: staff.staffid,
        cycle_id: 'PC-2025',
        cycle_name: 'Annual Review 2025',
        review_period_start: '2025-01-01',
        review_period_end: '2025-12-31',
        clinical_competence: overallRating + (Math.random() * 0.4 - 0.2),
        patient_care: overallRating + (Math.random() * 0.4 - 0.2),
        professionalism: overallRating + (Math.random() * 0.4 - 0.2),
        teamwork: overallRating + (Math.random() * 0.4 - 0.2),
        quality_safety: overallRating + (Math.random() * 0.4 - 0.2),
        strengths: generateStrengths(staff.role, overallRating),
        improvements: generateImprovements(overallRating),
        achievements: generateAchievements(staff.role),
        goals_next_period: generateGoals(staff.role),
        recommendation: getRecommendation(overallRating),
        status: i < 3 ? 'FINALIZED' : 'IN_PROGRESS'
      };

      // Round ratings to 1 decimal
      review.clinical_competence = Math.round(review.clinical_competence * 10) / 10;
      review.patient_care = Math.round(review.patient_care * 10) / 10;
      review.professionalism = Math.round(review.professionalism * 10) / 10;
      review.teamwork = Math.round(review.teamwork * 10) / 10;
      review.quality_safety = Math.round(review.quality_safety * 10) / 10;

      sampleReviews.push(review);
    }

    // Insert reviews into database
    console.log('\n📝 Inserting sample reviews...\n');
    
    for (const review of sampleReviews) {
      const result = await pool.query(`
        INSERT INTO performance_reviews (
          employee_id, cycle_id, cycle_name, review_period_start, review_period_end,
          clinical_competence, patient_care, professionalism, teamwork, quality_safety,
          strengths, improvements, achievements, goals_next_period, recommendation, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id
      `, [
        review.employee_id, review.cycle_id, review.cycle_name, review.review_period_start, review.review_period_end,
        review.clinical_competence, review.patient_care, review.professionalism, review.teamwork, review.quality_safety,
        review.strengths, review.improvements, review.achievements, review.goals_next_period, review.recommendation, review.status
      ]);

      const staff = staffResult.rows.find(s => s.staffid === review.employee_id);
      console.log(`✅ Created review for ${staff.firstname} ${staff.lastname} (ID: ${result.rows[0].id})`);
    }

    // Create some sample recognitions
    console.log('\n🏆 Creating sample recognitions...\n');
    
    for (let i = 0; i < 3; i++) {
      const staff = staffResult.rows[i];
      const recognition = {
        employee_id: staff.staffid,
        type: i === 0 ? 'EXCELLENCE_AWARD' : i === 1 ? 'SPOT_AWARD' : 'TEAM_PLAYER',
        title: `${staff.firstname} ${staff.lastname} Recognition`,
        reason: `Outstanding performance in ${staff.role} role`,
        monetary_reward: 300 + (i * 100),
        status: 'APPROVED'
      };

      await pool.query(`
        INSERT INTO employee_recognitions (
          employee_id, type, title, reason, monetary_reward, status
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        recognition.employee_id, recognition.type, recognition.title, recognition.reason, recognition.monetary_reward, recognition.status
      ]);

      console.log(`✅ Created ${recognition.type} for ${staff.firstname} ${staff.lastname}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Sample data created successfully!');
    console.log(`📊 Reviews: ${sampleReviews.length}`);
    console.log('🏆 Recognitions: 3');
    console.log('\n📱 Visit http://localhost:3000/hr/performance to see the data!');

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  } finally {
    await pool.end();
  }
}

function generateStrengths(role, rating) {
  const strengths = {
    'Doctor': [
      'Excellent diagnostic skills and clinical expertise',
      'Strong patient communication and bedside manner',
      'Thorough documentation and record keeping',
      'Effective collaboration with nursing staff'
    ],
    'Nurse': [
      'Exceptional patient care and monitoring',
      'Strong attention to detail and safety protocols',
      'Excellent teamwork and communication',
      'Compassionate patient interaction'
    ],
    'default': [
      'Consistent high-quality work',
      'Strong problem-solving abilities',
      'Excellent time management',
      'Positive attitude and teamwork'
    ]
  };

  const roleStrengths = strengths[role] || strengths.default;
  return roleStrengths[Math.floor(Math.random() * roleStrengths.length)];
}

function generateImprovements(rating) {
  if (rating >= 4.5) return 'Continue current excellent performance';
  if (rating >= 4.0) return 'Minor areas for professional development';
  if (rating >= 3.5) return 'Focus on clinical skill enhancement';
  return 'Significant improvement needed in core competencies';
}

function generateAchievements(role) {
  const achievements = {
    'Doctor': [
      'Successfully managed 50+ complex cases this quarter',
      'Led quality improvement initiative in department',
      'Mentored 2 junior physicians'
    ],
    'Nurse': [
      'Maintained 100% patient satisfaction scores',
      'Led training program for new hires',
      'Implemented new patient care protocols'
    ],
    'default': [
      'Exceeded all performance targets',
      'Received positive feedback from colleagues',
      'Completed all required certifications'
    ]
  };

  const roleAchievements = achievements[role] || achievements.default;
  return roleAchievements[Math.floor(Math.random() * roleAchievements.length)];
}

function generateGoals(role) {
  const goals = {
    'Doctor': [
      'Complete advanced clinical certification',
      'Improve patient wait times by 15%',
      'Lead research project in specialty area'
    ],
    'Nurse': [
      'Obtain specialized nursing certification',
      'Mentor 3 new nursing staff members',
      'Implement evidence-based practice improvements'
    ],
    'default': [
      'Complete professional development courses',
      'Improve cross-department collaboration',
      'Take on additional responsibilities'
    ]
  };

  const roleGoals = goals[role] || goals.default;
  return roleGoals[Math.floor(Math.random() * roleGoals.length)];
}

function getRecommendation(rating) {
  if (rating >= 4.5) return 'Promotion';
  if (rating >= 4.0) return 'Merit Increase';
  if (rating >= 3.5) return 'Standard Increase';
  return 'Performance Improvement Plan';
}

createSampleReviews();
