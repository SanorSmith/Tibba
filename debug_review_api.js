const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function debugReviewAPI() {
  try {
    const reviewId = '0179e29e-cb91-4d90-a99a-81db3b4795c8';
    
    console.log('🔍 Debugging Review API Query');
    console.log('='.repeat(50));
    console.log(`Looking for review ID: ${reviewId}`);

    // Test the exact query from the API
    const result = await pool.query(
      `SELECT 
        pr.*,
        e.firstname || ' ' || e.lastname as employee_name,
        e.role as employee_role,
        e.unit as employee_department,
        r.firstname || ' ' || r.lastname as reviewer_name
      FROM performance_reviews pr
      LEFT JOIN staff e ON pr.employee_id = e.staffid
      LEFT JOIN staff r ON pr.reviewer_id = r.staffid
      WHERE pr.id = $1`,
      [reviewId]
    );

    console.log(`\n📊 Query Results: ${result.rows.length} rows found`);
    
    if (result.rows.length > 0) {
      console.log('✅ Review found:');
      console.log(`   Employee: ${result.rows[0].employee_name}`);
      console.log(`   Role: ${result.rows[0].employee_role}`);
      console.log(`   Status: ${result.rows[0].status}`);
    } else {
      console.log('❌ No review found with this query');
      
      // Let's check the review exists without joins
      const simpleResult = await pool.query(
        'SELECT * FROM performance_reviews WHERE id = $1',
        [reviewId]
      );
      
      console.log(`\n📋 Simple query results: ${simpleResult.rows.length} rows`);
      
      if (simpleResult.rows.length > 0) {
        console.log('✅ Review exists in performance_reviews table');
        console.log(`   Employee ID: ${simpleResult.rows[0].employee_id}`);
        
        // Check if employee exists in staff table
        const staffResult = await pool.query(
          'SELECT staffid, firstname, lastname FROM staff WHERE staffid = $1',
          [simpleResult.rows[0].employee_id]
        );
        
        console.log(`\n👥 Staff lookup results: ${staffResult.rows.length} rows`);
        
        if (staffResult.rows.length > 0) {
          console.log('✅ Employee found in staff table');
          console.log(`   Name: ${staffResult.rows[0].firstname} ${staffResult.rows[0].lastname}`);
        } else {
          console.log('❌ Employee NOT found in staff table');
        }
      } else {
        console.log('❌ Review does not exist in performance_reviews table');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

debugReviewAPI();
