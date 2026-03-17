const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function checkAdminUser() {
  try {
    console.log('🔍 Checking admin user permissions...\n');
    
    // Check if the admin user exists in staff table
    const adminUser = await pool.query(`
      SELECT 
        staffid,
        firstname,
        lastname,
        role,
        status,
        email
      FROM staff
      WHERE staffid = $1
    `, ['00000000-0000-0000-0000-000000000001']);
    
    if (adminUser.rows.length === 0) {
      console.log('❌ Admin user not found in staff table');
      
      // Create the admin user
      console.log('🔧 Creating admin user...');
      await pool.query(`
        INSERT INTO staff (
          staffid,
          firstname,
          lastname,
          role,
          status,
          email,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, NOW(), NOW()
        )
      `, [
        '00000000-0000-0000-0000-000000000001',
        'System',
        'Administrator',
        'Administrator',
        'ACTIVE',
        'admin@tibbna.com'
      ]);
      
      console.log('✅ Admin user created successfully');
    } else {
      const user = adminUser.rows[0];
      console.log(`✅ Admin user found: ${user.firstname} ${user.lastname}`);
      console.log(`Role: ${user.role}`);
      console.log(`Status: ${user.status}`);
      
      if (user.role !== 'Administrator' && user.role !== 'HR_ADMIN') {
        console.log('🔧 Updating admin user role...');
        await pool.query(`
          UPDATE staff
          SET role = 'Administrator',
              updated_at = NOW()
          WHERE staffid = $1
        `, [user.staffid]);
        
        console.log('✅ Admin user role updated to Administrator');
      }
    }
    
    // Test the admin approve again
    console.log('\n🧪 Testing admin approve again...');
    
    // Get a pending request
    const pendingRequest = await pool.query(`
      SELECT 
        lr.id as leave_request_id,
        lr.employee_name,
        lr.status,
        lra.id as approval_id,
        lra.approver_id,
        lra.status as approval_status
      FROM leave_requests lr
      LEFT JOIN leave_request_approvals lra ON lr.id = lra.leave_request_id AND lra.approval_level = 1
      WHERE lr.status = 'PENDING'
      AND lra.status = 'PENDING'
      LIMIT 1
    `);
    
    if (pendingRequest.rows.length === 0) {
      console.log('❌ No pending requests found for admin approval test');
      return;
    }
    
    const request = pendingRequest.rows[0];
    console.log(`Testing with: ${request.employee_name}`);
    
    try {
      const adminApproveResponse = await fetch(`http://localhost:3000/api/hr/leaves/approvals/${request.leave_request_id}/admin-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approver_id: '00000000-0000-0000-0000-000000000001',
          approver_name: 'System Administrator',
          comments: 'Admin approval test'
        })
      });
      
      if (adminApproveResponse.ok) {
        const result = await adminApproveResponse.json();
        console.log('✅ Admin approve API call successful');
        console.log(`Response: ${result.message}`);
      } else {
        const error = await adminApproveResponse.text();
        console.log('❌ Admin approve API call failed');
        console.log(`Status: ${adminApproveResponse.status}`);
        console.log(`Error: ${error}`);
      }
    } catch (error) {
      console.log('❌ Admin approve API call error:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error checking admin user:', error);
  } finally {
    await pool.end();
  }
}

checkAdminUser();
