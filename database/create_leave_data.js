const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function createLeaveData() {
  try {
    console.log('🔨 Creating leave data...');
    
    // Check if leave types exist
    const leaveTypeResult = await pool.query('SELECT id, name, code FROM leave_types LIMIT 5');
    
    if (leaveTypeResult.rows.length === 0) {
      console.log('❌ No leave types found. Creating sample leave types...');
      await createSampleLeaveTypes();
      // Try again
      const leaveTypeResult2 = await pool.query('SELECT id, name, code FROM leave_types LIMIT 5');
      if (leaveTypeResult2.rows.length === 0) {
        console.log('❌ Still no leave types. Please check leave_types table.');
        return;
      }
      leaveTypeResult.rows = leaveTypeResult2.rows;
    }
    
    // Get staff records
    const staffResult = await pool.query('SELECT staffid, firstname, lastname FROM staff LIMIT 3');
    
    if (staffResult.rows.length === 0) {
      console.log('❌ No staff records found.');
      return;
    }
    
    console.log(`✅ Found ${staffResult.rows.length} staff and ${leaveTypeResult.rows.length} leave types`);
    
    // Create sample leave requests
    const today = new Date();
    const leaveRequests = [
      {
        employee_id: staffResult.rows[0].staffid,
        employee_name: `${staffResult.rows[0].firstname} ${staffResult.rows[0].lastname}`,
        employee_number: 'STAFF-001',
        leave_type_id: leaveTypeResult.rows[0].id,
        leave_type_code: leaveTypeResult.rows[0].code,
        start_date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
        end_date: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 4 days from now
        return_date: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days from now
        days_count: 3,
        working_days_count: 3,
        reason: 'Family vacation',
        emergency_contact: '123-456-7890',
        emergency_reason: 'Family emergency',
        status: 'APPROVED',
        approved_by: '00000000-0000-0000-0000-000000000001',
        approved_by_name: 'John Manager',
        replacement_employee: staffResult.rows[1].staffid,
        replacement_name: `${staffResult.rows[1].firstname} ${staffResult.rows[1].lastname}`
      },
      {
        employee_id: staffResult.rows[1].staffid,
        employee_name: `${staffResult.rows[1].firstname} ${staffResult.rows[1].lastname}`,
        employee_number: 'STAFF-002',
        leave_type_id: leaveTypeResult.rows[1].id,
        leave_type_code: leaveTypeResult.rows[1].code,
        start_date: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 day from now
        end_date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
        return_date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days from now
        days_count: 2,
        working_days_count: 2,
        reason: 'Medical appointment',
        emergency_contact: '123-456-7891',
        emergency_reason: 'Doctor appointment',
        status: 'APPROVED',
        approved_by: '00000000-0000-0000-0000-000000000002',
        approved_by_name: 'Jane Manager',
        replacement_employee: staffResult.rows[2].staffid,
        replacement_name: `${staffResult.rows[2].firstname} ${staffResult.rows[2].lastname}`
      },
      {
        employee_id: staffResult.rows[2].staffid,
        employee_name: `${staffResult.rows[2].firstname} ${staffResult.rows[2].lastname}`,
        employee_number: 'STAFF-003',
        leave_type_id: leaveTypeResult.rows[2]?.id || leaveTypeResult.rows[0].id,
        leave_type_code: leaveTypeResult.rows[2]?.code || leaveTypeResult.rows[0].code,
        start_date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 day ago
        end_date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 day ago
        return_date: new Date(today.getTime()).toISOString().split('T')[0], // today
        days_count: 1,
        working_days_count: 1,
        reason: 'Personal day',
        emergency_contact: '123-456-7892',
        emergency_reason: 'Personal matter',
        status: 'APPROVED',
        approved_by: '00000000-0000-0000-0000-000000000003',
        approved_by_name: 'Bob Manager'
      }
    ];
    
    for (const leave of leaveRequests) {
      await pool.query(`
        INSERT INTO leave_requests (
          employee_id, employee_name, employee_number, leave_type_id, leave_type_code,
          start_date, end_date, return_date, days_count, working_days_count,
          reason, emergency_contact, emergency_reason, status,
          approved_by, approved_by_name, replacement_employee, replacement_name
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      `, [
        leave.employee_id,
        leave.employee_name,
        leave.employee_number,
        leave.leave_type_id,
        leave.leave_type_code,
        leave.start_date,
        leave.end_date,
        leave.return_date,
        leave.days_count,
        leave.working_days_count,
        leave.reason,
        leave.emergency_contact,
        leave.emergency_reason,
        leave.status,
        leave.approved_by,
        leave.approved_by_name,
        leave.replacement_employee,
        leave.replacement_name
      ]);
      
      console.log(`✅ Created leave request for ${leave.employee_name} - ${leave.start_date} to ${leave.end_date} - ${leave.status}`);
    }
    
    console.log('✅ Leave data created successfully!');
    
    // Verify created records
    const finalCount = await pool.query('SELECT COUNT(*) as count FROM leave_requests');
    console.log(`📊 Total leave requests: ${finalCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error creating leave data:', error.message);
  } finally {
    await pool.end();
  }
}

async function createSampleLeaveTypes() {
  try {
    console.log('📋 Creating sample leave types...');
    
    const leaveTypes = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Annual Leave',
        code: 'ANNUAL',
        color: '#3B82F6',
        description: 'Annual paid leave',
        max_days_per_year: 21,
        requires_approval: true
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        name: 'Sick Leave',
        code: 'SICK',
        color: '#EF4444',
        description: 'Medical sick leave',
        max_days_per_year: 10,
        requires_approval: true
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        name: 'Personal Leave',
        code: 'PERSONAL',
        color: '#F59E0B',
        description: 'Personal day off',
        max_days_per_year: 5,
        requires_approval: false
      }
    ];
    
    for (const leaveType of leaveTypes) {
      await pool.query(`
        INSERT INTO leave_types (
          id, name, code, color, description, max_days_per_year, requires_approval
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        leaveType.id,
        leaveType.name,
        leaveType.code,
        leaveType.color,
        leaveType.description,
        leaveType.max_days_per_year,
        leaveType.requires_approval
      ]);
    }
    
    console.log('✅ Created 3 sample leave types');
  } catch (error) {
    console.error('❌ Error creating leave types:', error.message);
  }
}

createLeaveData();
