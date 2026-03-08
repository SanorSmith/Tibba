const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function createTestApproval() {
  try {
    console.log('🔄 Creating test leave request and approval...');
    
    // First, get a real employee and leave type
    const employeeResult = await pool.query(`
      SELECT staffid, firstname, lastname, custom_staff_id, unit 
      FROM staff 
      WHERE status = 'ACTIVE' 
      LIMIT 1
    `);
    
    if (employeeResult.rows.length === 0) {
      console.log('❌ No active employees found');
      return;
    }
    
    const employee = employeeResult.rows[0];
    console.log(`✅ Using employee: ${employee.firstname} ${employee.lastname}`);
    
    // Get a leave type
    const leaveTypeResult = await pool.query(`
      SELECT id, name, code 
      FROM leave_types 
      WHERE is_active = true 
      LIMIT 1
    `);
    
    if (leaveTypeResult.rows.length === 0) {
      console.log('❌ No active leave types found');
      return;
    }
    
    const leaveType = leaveTypeResult.rows[0];
    console.log(`✅ Using leave type: ${leaveType.name}`);
    
    // Create a test leave request
    const leaveRequestResult = await pool.query(`
      INSERT INTO leave_requests (
        employee_id,
        employee_name,
        employee_number,
        leave_type_id,
        leave_type_code,
        start_date,
        end_date,
        return_date,
        days_count,
        working_days_count,
        reason,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *
    `, [
      employee.staffid,
      `${employee.firstname} ${employee.lastname}`,
      employee.custom_staff_id || 'EMP001',
      leaveType.id,
      leaveType.code,
      '2026-03-15',
      '2026-03-17',
      '2026-03-18',
      3,
      3,
      'Test leave request for approval system',
      'PENDING'
    ]);
    
    const leaveRequest = leaveRequestResult.rows[0];
    console.log(`✅ Created leave request: ${leaveRequest.id}`);
    
    // Create approval workflow for this request
    await pool.query(`
      INSERT INTO leave_request_approvals (
        leave_request_id,
        approval_level,
        level_name,
        approver_id,
        approver_name,
        approver_role,
        status,
        assigned_at,
        due_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW() + INTERVAL '48 hours')
    `, [
      leaveRequest.id,
      1,
      'Manager Approval',
      'test-user-123',
      'Test Manager',
      'HR_ADMIN',
      'PENDING'
    ]);
    
    console.log('✅ Created approval workflow');
    
    // Verify the approval exists
    const approvalCheck = await pool.query(`
      SELECT 
        lra.*,
        lr.employee_name,
        lr.leave_type_code,
        lt.name as leave_type_name,
        lr.start_date,
        lr.end_date,
        lr.working_days_count,
        lr.reason
      FROM leave_request_approvals lra
      LEFT JOIN leave_requests lr ON lra.leave_request_id = lr.id
      LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
      WHERE lra.approver_id = $1
      AND lra.status = 'PENDING'
    `, ['test-user-123']);
    
    if (approvalCheck.rows.length > 0) {
      console.log('✅ Test approval created successfully!');
      console.log('\n📋 Approval Details:');
      console.log(`   Employee: ${approvalCheck.rows[0].employee_name}`);
      console.log(`   Leave Type: ${approvalCheck.rows[0].leave_type_name}`);
      console.log(`   Dates: ${approvalCheck.rows[0].start_date} to ${approvalCheck.rows[0].end_date}`);
      console.log(`   Days: ${approvalCheck.rows[0].working_days_count}`);
      console.log(`   Status: ${approvalCheck.rows[0].status}`);
      console.log(`   Level: ${approvalCheck.rows[0].level_name}`);
      
      console.log('\n🎯 Now refresh the approvals page to see this request!');
    } else {
      console.log('❌ Approval not found in database');
    }
    
  } catch (error) {
    console.error('❌ Error creating test approval:', error.message);
  } finally {
    await pool.end();
  }
}

createTestApproval();
