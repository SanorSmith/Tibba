import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// =====================================================
// TYPES
// =====================================================

export interface ApprovalLevel {
  id: string;
  approval_level: number;
  level_name: string;
  approver_role: string;
  approver_id?: string;
  approver_name?: string;
  is_required: boolean;
  can_delegate: boolean;
  sequence_order: number;
  max_approval_hours: number;
}

export interface ApprovalRequest {
  id: string;
  leave_request_id: string;
  approval_level: number;
  level_name: string;
  approver_id: string;
  approver_name: string;
  approver_role: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELEGATED';
  assigned_at: string;
  due_date: string;
}

export interface WorkflowResult {
  success: boolean;
  current_level: number;
  next_level?: number;
  is_complete: boolean;
  final_status?: 'APPROVED' | 'REJECTED';
  message: string;
}

// =====================================================
// INITIALIZE APPROVAL WORKFLOW
// =====================================================

export async function initializeApprovalWorkflow(
  leaveRequestId: string,
  employeeId: string,
  leaveTypeId: string,
  daysRequested: number
): Promise<WorkflowResult> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get employee's department
    const empResult = await client.query(
      `SELECT unit as department, role FROM staff WHERE staffid = $1`,
      [employeeId]
    );
    
    if (empResult.rows.length === 0) {
      throw new Error('Employee not found');
    }
    
    const { department } = empResult.rows[0];
    
    // Get approval workflow levels for this leave type
    const workflowResult = await client.query(
      `SELECT 
        id,
        approval_level,
        level_name,
        approver_role,
        approver_id,
        approver_name,
        is_required,
        can_delegate,
        sequence_order,
        max_approval_hours,
        escalation_hours
       FROM leave_approval_workflow
       WHERE (leave_type_id = $1 OR leave_type_id IS NULL)
       AND (department_id = $2 OR department_id IS NULL)
       AND (days_threshold <= $3 OR days_threshold IS NULL)
       AND is_active = true
       ORDER BY sequence_order, approval_level`,
      [leaveTypeId, department, daysRequested]
    );
    
    // If no workflow defined, use default (Manager → HR)
    let levels = workflowResult.rows;
    if (levels.length === 0) {
      levels = [
        {
          approval_level: 1,
          level_name: 'Manager Approval',
          approver_role: 'MANAGER',
          is_required: true,
          can_delegate: true,
          max_approval_hours: 48,
        },
        {
          approval_level: 2,
          level_name: 'HR Approval',
          approver_role: 'HR_ADMIN',
          is_required: true,
          can_delegate: false,
          max_approval_hours: 24,
        },
      ];
    }
    
    // Create approval records for each level
    for (const level of levels) {
      const dueDate = new Date();
      dueDate.setHours(dueDate.getHours() + level.max_approval_hours);
      
      // Find approver based on role
      let approverId = level.approver_id;
      let approverName = level.approver_name;
      
      if (!approverId) {
        const approverResult = await findApproverByRole(
          client,
          level.approver_role,
          department
        );
        approverId = approverResult.id;
        approverName = approverResult.name;
      }
      
      await client.query(
        `INSERT INTO leave_request_approvals (
          leave_request_id,
          approval_level,
          level_name,
          approver_id,
          approver_name,
          approver_role,
          status,
          due_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          leaveRequestId,
          level.approval_level,
          level.level_name,
          approverId,
          approverName,
          level.approver_role,
          level.approval_level === 1 ? 'PENDING' : 'WAITING',
          dueDate.toISOString(),
        ]
      );
    }
    
    await client.query('COMMIT');
    
    return {
      success: true,
      current_level: 1,
      next_level: levels.length > 1 ? 2 : undefined,
      is_complete: false,
      message: `Approval workflow initialized with ${levels.length} level(s)`,
    };
    
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Error initializing approval workflow:', error);
    throw error;
  } finally {
    client.release();
  }
}

// =====================================================
// APPROVE LEAVE REQUEST
// =====================================================

export async function approveLeaveRequest(
  leaveRequestId: string,
  approverId: string,
  approverName: string,
  comments?: string
): Promise<WorkflowResult> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get current pending approval for this approver
    const approvalResult = await client.query(
      `SELECT 
        id,
        approval_level,
        level_name,
        status
       FROM leave_request_approvals
       WHERE leave_request_id = $1
       AND approver_id = $2
       AND status = 'PENDING'
       LIMIT 1`,
      [leaveRequestId, approverId]
    );
    
    if (approvalResult.rows.length === 0) {
      throw new Error('No pending approval found for this approver');
    }
    
    const approval = approvalResult.rows[0];
    
    // Update approval status
    await client.query(
      `UPDATE leave_request_approvals
       SET status = 'APPROVED',
           decision_date = NOW(),
           comments = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [comments, approval.id]
    );
    
    // Check if there are more approval levels
    const nextLevelResult = await client.query(
      `SELECT 
        id,
        approval_level,
        level_name
       FROM leave_request_approvals
       WHERE leave_request_id = $1
       AND approval_level > $2
       AND status = 'WAITING'
       ORDER BY approval_level
       LIMIT 1`,
      [leaveRequestId, approval.approval_level]
    );
    
    if (nextLevelResult.rows.length > 0) {
      // Move to next level
      const nextLevel = nextLevelResult.rows[0];
      
      await client.query(
        `UPDATE leave_request_approvals
         SET status = 'PENDING',
             assigned_at = NOW()
         WHERE id = $1`,
        [nextLevel.id]
      );
      
      await client.query('COMMIT');
      
      return {
        success: true,
        current_level: nextLevel.approval_level,
        is_complete: false,
        message: `Approved at level ${approval.approval_level}. Moved to ${nextLevel.level_name}`,
      };
      
    } else {
      // All approvals complete - approve the leave request
      await client.query(
        `UPDATE leave_requests
         SET status = 'APPROVED',
             approved_by = $1,
             approved_by_name = $2,
             approved_at = NOW(),
             updated_at = NOW()
         WHERE id = $3`,
        [approverId, approverName, leaveRequestId]
      );
      
      await client.query('COMMIT');
      
      return {
        success: true,
        current_level: approval.approval_level,
        is_complete: true,
        final_status: 'APPROVED',
        message: 'All approvals complete. Leave request approved.',
      };
    }
    
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Error approving leave request:', error);
    throw error;
  } finally {
    client.release();
  }
}

// =====================================================
// REJECT LEAVE REQUEST
// =====================================================

export async function rejectLeaveRequest(
  leaveRequestId: string,
  approverId: string,
  approverName: string,
  rejectionReason: string
): Promise<WorkflowResult> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get current pending approval
    const approvalResult = await client.query(
      `SELECT id, approval_level, level_name
       FROM leave_request_approvals
       WHERE leave_request_id = $1
       AND approver_id = $2
       AND status = 'PENDING'
       LIMIT 1`,
      [leaveRequestId, approverId]
    );
    
    if (approvalResult.rows.length === 0) {
      throw new Error('No pending approval found for this approver');
    }
    
    const approval = approvalResult.rows[0];
    
    // Update approval status
    await client.query(
      `UPDATE leave_request_approvals
       SET status = 'REJECTED',
           decision_date = NOW(),
           rejection_reason = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [rejectionReason, approval.id]
    );
    
    // Reject all pending/waiting approvals
    await client.query(
      `UPDATE leave_request_approvals
       SET status = 'CANCELLED'
       WHERE leave_request_id = $1
       AND status IN ('PENDING', 'WAITING')
       AND id != $2`,
      [leaveRequestId, approval.id]
    );
    
    // Reject the leave request
    await client.query(
      `UPDATE leave_requests
       SET status = 'REJECTED',
           approved_by = $1,
           approved_by_name = $2,
           approved_at = NOW(),
           rejection_reason = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [approverId, approverName, rejectionReason, leaveRequestId]
    );
    
    await client.query('COMMIT');
    
    return {
      success: true,
      current_level: approval.approval_level,
      is_complete: true,
      final_status: 'REJECTED',
      message: `Leave request rejected at ${approval.level_name}`,
    };
    
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Error rejecting leave request:', error);
    throw error;
  } finally {
    client.release();
  }
}

// =====================================================
// DELEGATE APPROVAL
// =====================================================

export async function delegateApproval(
  leaveRequestId: string,
  currentApproverId: string,
  delegateToId: string,
  delegateToName: string,
  reason?: string
): Promise<WorkflowResult> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get current approval
    const approvalResult = await client.query(
      `SELECT id, approval_level, can_delegate
       FROM leave_request_approvals lra
       LEFT JOIN leave_approval_workflow law 
         ON lra.approval_level = law.approval_level
       WHERE lra.leave_request_id = $1
       AND lra.approver_id = $2
       AND lra.status = 'PENDING'
       LIMIT 1`,
      [leaveRequestId, currentApproverId]
    );
    
    if (approvalResult.rows.length === 0) {
      throw new Error('No pending approval found');
    }
    
    const approval = approvalResult.rows[0];
    
    if (!approval.can_delegate) {
      throw new Error('This approval level cannot be delegated');
    }
    
    // Update approval with delegation
    await client.query(
      `UPDATE leave_request_approvals
       SET delegated_to = $1,
           delegated_to_name = $2,
           delegated_at = NOW(),
           approver_id = $1,
           approver_name = $2,
           comments = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [delegateToId, delegateToName, reason, approval.id]
    );
    
    await client.query('COMMIT');
    
    return {
      success: true,
      current_level: approval.approval_level,
      is_complete: false,
      message: `Approval delegated to ${delegateToName}`,
    };
    
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Error delegating approval:', error);
    throw error;
  } finally {
    client.release();
  }
}

// =====================================================
// GET PENDING APPROVALS FOR USER
// =====================================================

export async function getPendingApprovals(
  approverId: string
): Promise<any[]> {
  try {
    const result = await pool.query(
      `SELECT 
        lra.id as approval_id,
        lra.leave_request_id,
        lra.approval_level,
        lra.level_name,
        lra.assigned_at,
        lra.due_date,
        lr.employee_id,
        lr.employee_name,
        lr.employee_number,
        lr.leave_type_code,
        lt.name as leave_type_name,
        lr.start_date,
        lr.end_date,
        lr.working_days_count,
        lr.reason,
        lr.created_at
       FROM leave_request_approvals lra
       LEFT JOIN leave_requests lr ON lra.leave_request_id = lr.id
       LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
       WHERE lra.approver_id = $1
       AND lra.status = 'PENDING'
       ORDER BY lra.due_date, lra.assigned_at`,
      [approverId]
    );
    
    return result.rows;
    
  } catch (error: any) {
    console.error('❌ Error getting pending approvals:', error);
    return [];
  }
}

// =====================================================
// GET APPROVAL HISTORY FOR LEAVE REQUEST
// =====================================================

export async function getApprovalHistory(
  leaveRequestId: string
): Promise<any[]> {
  try {
    const result = await pool.query(
      `SELECT 
        id,
        approval_level,
        level_name,
        approver_id,
        approver_name,
        approver_role,
        status,
        decision_date,
        comments,
        rejection_reason,
        delegated_to,
        delegated_to_name,
        assigned_at,
        due_date
       FROM leave_request_approvals
       WHERE leave_request_id = $1
       ORDER BY approval_level`,
      [leaveRequestId]
    );
    
    return result.rows;
    
  } catch (error: any) {
    console.error('❌ Error getting approval history:', error);
    return [];
  }
}

// =====================================================
// HELPER: Find Approver by Role
// =====================================================

async function findApproverByRole(
  client: any,
  role: string,
  department?: string
): Promise<{ id: string; name: string }> {
  // Map workflow roles to staff roles
  const roleMapping: { [key: string]: string[] } = {
    MANAGER: ['Manager', 'Department Head', 'Supervisor'],
    HR_ADMIN: ['HR_ADMIN', 'Administrator'],
    DIRECTOR: ['Director', 'Medical Director', 'Administrator'],
    DEPARTMENT_HEAD: ['Department Head', 'Manager'],
  };
  
  const staffRoles = roleMapping[role] || [role];
  
  let query = `
    SELECT staffid as id, CONCAT(firstname, ' ', lastname) as name
    FROM staff
    WHERE role = ANY($1)
    AND status = 'ACTIVE'
  `;
  
  const params: any[] = [staffRoles];
  
  if (department) {
    query += ` AND unit = $2`;
    params.push(department);
  }
  
  query += ` LIMIT 1`;
  
  const result = await client.query(query, params);
  
  if (result.rows.length === 0) {
    // Fallback to any HR admin
    const fallback = await client.query(
      `SELECT staffid as id, CONCAT(firstname, ' ', lastname) as name
       FROM staff
       WHERE role = 'HR_ADMIN'
       AND status = 'ACTIVE'
       LIMIT 1`
    );
    
    if (fallback.rows.length === 0) {
      throw new Error(`No approver found for role: ${role}`);
    }
    
    return fallback.rows[0];
  }
  
  return result.rows[0];
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  initializeApprovalWorkflow,
  approveLeaveRequest,
  rejectLeaveRequest,
  delegateApproval,
  getPendingApprovals,
  getApprovalHistory,
};
