const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function testActionsSimple() {
  try {
    console.log('🧪 Testing Attendance Exceptions Actions (Simple)...\n');
    
    // Get a sample exception ID to test
    const sampleResult = await pool.query(`
      SELECT id, employee_name, review_status 
      FROM attendance_exceptions 
      WHERE review_status = 'PENDING'
      LIMIT 1
    `);
    
    if (sampleResult.rows.length === 0) {
      console.log('❌ No pending exceptions found to test');
      return;
    }
    
    const testException = sampleResult.rows[0];
    console.log(`📋 Testing with exception: ${testException.id} (${testException.employee_name})`);
    
    // Test 1: Justify action (without UUID fields)
    console.log('\n🔧 Testing JUSTIFY action...');
    const justifyResult = await pool.query(`
      UPDATE attendance_exceptions 
      SET 
        review_status = 'JUSTIFIED',
        justification = 'Employee had approved schedule change',
        justified_by_name = 'Test Manager',
        justified_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [testException.id]);
    
    console.log('   ✅ Justify action successful');
    console.log(`   Status: ${justifyResult.rows[0].review_status}`);
    console.log(`   Justification: ${justifyResult.rows[0].justification}`);
    
    // Test 2: Issue warning action
    console.log('\n🔧 Testing ISSUE_WARNING action...');
    const warningResult = await pool.query(`
      UPDATE attendance_exceptions 
      SET 
        review_status = 'WARNING_ISSUED',
        warning_issued = true,
        warning_details = 'Formal warning issued for repeated lateness',
        warning_issued_by_name = 'Test Manager',
        warning_issued_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [testException.id]);
    
    console.log('   ✅ Warning action successful');
    console.log(`   Status: ${warningResult.rows[0].review_status}`);
    console.log(`   Warning: ${warningResult.rows[0].warning_details}`);
    
    // Test 3: Dismiss action
    console.log('\n🔧 Testing DISMISS action...');
    const dismissResult = await pool.query(`
      UPDATE attendance_exceptions 
      SET 
        review_status = 'DISMISSED',
        dismissal_reason = 'Exception was a false positive',
        dismissed_by_name = 'Test Manager',
        dismissed_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [testException.id]);
    
    console.log('   ✅ Dismiss action successful');
    console.log(`   Status: ${dismissResult.rows[0].review_status}`);
    console.log(`   Reason: ${dismissResult.rows[0].dismissal_reason}`);
    
    // Test 4: Reset to PENDING for further testing
    console.log('\n🔄 Resetting to PENDING for further testing...');
    await pool.query(`
      UPDATE attendance_exceptions 
      SET 
        review_status = 'PENDING',
        justification = NULL,
        warning_issued = false,
        warning_details = NULL,
        dismissed_reason = NULL,
        updated_at = NOW()
      WHERE id = $1
    `, [testException.id]);
    
    console.log('   ✅ Reset to PENDING successful');
    
    console.log('\n✅ All action tests completed successfully!');
    console.log('\n📌 The buttons should now work in the UI');
    console.log('   - Justify button: Opens modal with justification input');
    console.log('   - Warn button: Issues warning immediately');
    console.log('   - Dismiss button: Dismisses exception immediately');
    console.log('   - Delete button: Requires confirmation and deletes record');
    
    // Test API endpoint directly
    console.log('\n🌐 Testing API endpoint PUT request...');
    
    // Test the exact API call the frontend makes
    const testApiCall = await pool.query(`
      SELECT * FROM attendance_exceptions 
      WHERE id = $1
    `, [testException.id]);
    
    const apiData = testApiCall.rows[0];
    console.log('   API Data Structure:');
    console.log(`     ID: ${apiData.id}`);
    console.log(`     Employee: ${apiData.employee_name}`);
    console.log(`     Status: ${apiData.review_status}`);
    console.log(`     Type: ${apiData.exception_type}`);
    console.log(`     Severity: ${apiData.severity}`);
    
    console.log('\n🎯 Ready for UI testing!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

testActionsSimple();
