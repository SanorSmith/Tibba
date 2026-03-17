const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function testAllPerformanceModules() {
  console.log('🧪 TESTING ALL PERFORMANCE MANAGEMENT MODULES');
  console.log('='.repeat(60));

  try {
    
    // Test 1: Staff API
    console.log('\n1️⃣ Testing Staff API...');
    try {
      const staffResponse = await fetch('http://localhost:3000/api/staff');
      const staffData = await staffResponse.json();
      
      if (staffData.success && staffData.staff) {
        console.log('✅ Staff API: Working');
        console.log(`   Found ${staffData.staff.length} staff members`);
        console.log(`   Sample: ${staffData.staff[0]?.firstName} ${staffData.staff[0]?.lastName}`);
      } else {
        console.log('❌ Staff API: Failed');
      }
    } catch (error) {
      console.log('❌ Staff API: Error -', error.message);
    }

    // Test 2: Reviews List API
    console.log('\n2️⃣ Testing Reviews List API...');
    try {
      const reviewsResponse = await fetch('http://localhost:3000/api/hr/performance/reviews?limit=50');
      const reviewsData = await reviewsResponse.json();
      
      if (reviewsData.success && reviewsData.data) {
        console.log('✅ Reviews List API: Working');
        console.log(`   Found ${reviewsData.data.length} reviews`);
        console.log(`   Sample: ${reviewsData.data[0]?.employee_name || 'No name'} - ${reviewsData.data[0]?.status}`);
      } else {
        console.log('❌ Reviews List API: Failed');
      }
    } catch (error) {
      console.log('❌ Reviews List API: Error -', error.message);
    }

    // Test 3: Individual Review API
    console.log('\n3️⃣ Testing Individual Review API...');
    try {
      // Get a review ID first
      const reviewsResponse = await fetch('http://localhost:3000/api/hr/performance/reviews?limit=1');
      const reviewsData = await reviewsResponse.json();
      
      if (reviewsData.success && reviewsData.data.length > 0) {
        const reviewId = reviewsData.data[0].id;
        const individualResponse = await fetch(`http://localhost:3000/api/hr/performance/reviews/${reviewId}`);
        const individualData = await individualResponse.json();
        
        if (individualData.success) {
          console.log('✅ Individual Review API: Working');
          console.log(`   Review ID: ${reviewId.substring(0, 8)}...`);
          console.log(`   Employee: ${individualData.data.employee_name}`);
        } else {
          console.log('❌ Individual Review API: Failed');
        }
      } else {
        console.log('⚠️ Individual Review API: No reviews to test');
      }
    } catch (error) {
      console.log('❌ Individual Review API: Error -', error.message);
    }

    // Test 4: Recognitions API
    console.log('\n4️⃣ Testing Recognitions API...');
    try {
      const recognitionsResponse = await fetch('http://localhost:3000/api/hr/performance/recognitions');
      const recognitionsData = await recognitionsResponse.json();
      
      if (recognitionsData.success && recognitionsData.data) {
        console.log('✅ Recognitions API: Working');
        console.log(`   Found ${recognitionsData.data.length} recognitions`);
        console.log(`   Sample: ${recognitionsData.data[0]?.employee_name || 'No name'} - ${recognitionsData.data[0]?.type}`);
      } else {
        console.log('❌ Recognitions API: Failed');
      }
    } catch (error) {
      console.log('❌ Recognitions API: Error -', error.message);
    }

    // Test 5: Performance Score API
    console.log('\n5️⃣ Testing Performance Score API...');
    try {
      // Get a staff member ID first
      const staffResponse = await fetch('http://localhost:3000/api/staff');
      const staffData = await staffResponse.json();
      
      if (staffData.success && staffData.staff.length > 0) {
        const staffId = staffData.staff[0].id;
        const scoreResponse = await fetch('http://localhost:3000/api/hr/performance/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: staffId,
            clinical_competence: 4.5,
            patient_care: 4.2,
            professionalism: 4.3,
            teamwork: 4.4,
            quality_safety: 4.1
          })
        });
        const scoreData = await scoreResponse.json();
        
        if (scoreData.success) {
          console.log('✅ Performance Score API: Working');
          console.log(`   Score: ${scoreData.data.score}`);
          console.log(`   Level: ${scoreData.data.level}`);
        } else {
          console.log('❌ Performance Score API: Failed');
        }
      } else {
        console.log('⚠️ Performance Score API: No staff to test');
      }
    } catch (error) {
      console.log('❌ Performance Score API: Error -', error.message);
    }

    // Test 6: Database Connection
    console.log('\n6️⃣ Testing Database Connection...');
    try {
      const result = await pool.query('SELECT COUNT(*) as staff_count FROM staff');
      console.log('✅ Database Connection: Working');
      console.log(`   Staff count: ${result.rows[0].staff_count}`);
      
      const reviewsResult = await pool.query('SELECT COUNT(*) as reviews_count FROM performance_reviews');
      console.log(`   Reviews count: ${reviewsResult.rows[0].reviews_count}`);
      
      const recognitionsResult = await pool.query('SELECT COUNT(*) as recognitions_count FROM performance_recognitions');
      console.log(`   Recognitions count: ${recognitionsResult.rows[0].recognitions_count}`);
    } catch (error) {
      console.log('❌ Database Connection: Error -', error.message);
    }

    // Test 7: Review Creation/Update
    console.log('\n7️⃣ Testing Review Creation/Update...');
    try {
      const staffResponse = await fetch('http://localhost:3000/api/staff');
      const staffData = await staffResponse.json();
      
      if (staffData.success && staffData.staff.length > 0) {
        const staffId = staffData.staff[0].id;
        const testReview = {
          employee_id: staffId,
          cycle_id: 'PC-2025',
          cycle_name: 'Test Review',
          clinical_competence: 4.0,
          patient_care: 3.5,
          professionalism: 4.2,
          teamwork: 3.8,
          quality_safety: 4.1,
          strengths: 'Test strengths',
          improvements: 'Test improvements',
          achievements: 'Test achievements',
          goals_next_period: 'Test goals',
          recommendation: 'Standard Increase',
          status: 'IN_PROGRESS',
          review_period_start: '2025-01-01',
          review_period_end: '2025-12-31'
        };

        const createResponse = await fetch('http://localhost:3000/api/hr/performance/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testReview)
        });
        const createData = await createResponse.json();
        
        if (createData.success) {
          console.log('✅ Review Creation: Working');
          console.log(`   Created review ID: ${createData.data.id.substring(0, 8)}...`);
          
          // Clean up - delete the test review
          await pool.query('DELETE FROM performance_reviews WHERE id = $1', [createData.data.id]);
          console.log('   ✅ Test review cleaned up');
        } else {
          console.log('❌ Review Creation: Failed');
          console.log(`   Error: ${createData.error}`);
        }
      } else {
        console.log('⚠️ Review Creation: No staff to test');
      }
    } catch (error) {
      console.log('❌ Review Creation: Error -', error.message);
    }

    console.log('\n🎯 MODULE TEST SUMMARY');
    console.log('='.repeat(30));
    console.log('✅ All performance modules tested');
    console.log('📝 Check individual results above for any issues');
    console.log('🚀 Ready for full system testing!');

  } catch (error) {
    console.error('❌ Test Suite Error:', error);
  } finally {
    await pool.end();
  }
}

// Run the tests
testAllPerformanceModules().catch(console.error);
