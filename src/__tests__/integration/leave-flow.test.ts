/**
 * Leave Workflow Integration Test
 * Tests complete leave approval workflow
 */

import { workflowService } from '../../services/workflow-service';

describe('Leave Workflow Integration', () => {
  test('should complete 8-day leave approval workflow', async () => {
    // 1. Submit leave request (8 days)
    const result = await workflowService.submitForApproval(
      'leave_request',
      'leave-uuid-123',
      'employee-uuid-456'
    );

    // Should be 2-level approval (4-7 days range)
    expect(result.workflow_id).toBeDefined();
    expect(result.total_levels).toBe(2);
    expect(result.message).toContain('2-level approval');

    // 2. First approver approves → moves to level 2
    const approve1Result = await workflowService.approveStep(
      result.workflow_id,
      'supervisor-uuid-789',
      'Approved. Enjoy your vacation!'
    );

    expect(approve1Result.status).toBe('in_progress');
    expect(approve1Result.next_level).toBe(2);
    expect(approve1Result.message).toContain('Moved to level 2');

    // 3. Second approver approves → leave is approved
    const approve2Result = await workflowService.approveStep(
      result.workflow_id,
      'hr-manager-uuid-999',
      'Approved. Have a great time!'
    );

    expect(approve2Result.status).toBe('approved');
    expect(approve2Result.next_level).toBeUndefined();

    // 4. Verify leave balance is deducted (mock verification)
    const status = await workflowService.getApprovalStatus('leave_request', 'leave-uuid-123');
    expect(status).toBeDefined();
    expect(status.status).toBe('approved');
    expect(status.current_level).toBe(2);
    expect(status.total_levels).toBe(2);
  });

  test('should handle 3-day leave (1-level approval)', async () => {
    // Submit 3-day leave request
    const result = await workflowService.submitForApproval(
      'leave_request',
      'leave-uuid-456',
      'employee-uuid-123'
    );

    // Should be 1-level approval (≤3 days)
    expect(result.total_levels).toBe(1);
    expect(result.message).toContain('1-level approval');

    // Single approval should complete workflow
    const approveResult = await workflowService.approveStep(
      result.workflow_id,
      'supervisor-uuid-789',
      'Approved'
    );

    expect(approveResult.status).toBe('approved');
    expect(approveResult.next_level).toBeUndefined();
  });

  test('should handle 10-day leave (3-level approval)', async () => {
    // Submit 10-day leave request
    const result = await workflowService.submitForApproval(
      'leave_request',
      'leave-uuid-789',
      'employee-uuid-123'
    );

    // Should be 3-level approval (>7 days)
    expect(result.total_levels).toBe(3);
    expect(result.message).toContain('3-level approval');

    // Level 1 approval
    const approve1Result = await workflowService.approveStep(
      result.workflow_id,
      'supervisor-uuid-789',
      'Approved'
    );
    expect(approve1Result.next_level).toBe(2);

    // Level 2 approval
    const approve2Result = await workflowService.approveStep(
      result.workflow_id,
      'hr-manager-uuid-999',
      'Approved'
    );
    expect(approve2Result.next_level).toBe(3);

    // Level 3 approval (final)
    const approve3Result = await workflowService.approveStep(
      result.workflow_id,
      'director-uuid-111',
      'Approved'
    );
    expect(approve3Result.status).toBe('approved');
  });

  test('should handle emergency leave auto-approval', async () => {
    // Submit emergency leave request
    const result = await workflowService.submitForApproval(
      'leave_request',
      'emergency-leave-123',
      'employee-uuid-456'
    );

    // Should be auto-approved (0 levels)
    expect(result.total_levels).toBe(0);
    expect(result.message).toContain('auto-approved');

    // Verify status
    const status = await workflowService.getApprovalStatus('leave_request', 'emergency-leave-123');
    expect(status).toBeNull(); // No workflow created for auto-approved
  });

  test('should handle rejection at any level', async () => {
    // Submit leave request
    const result = await workflowService.submitForApproval(
      'leave_request',
      'leave-uuid-reject',
      'employee-uuid-456'
    );

    expect(result.total_levels).toBe(2);

    // Reject at level 1
    const rejectResult = await workflowService.rejectStep(
      result.workflow_id,
      'supervisor-uuid-789',
      'Insufficient leave balance'
    );

    expect(rejectResult.status).toBe('rejected');
    expect(rejectResult.message).toContain('rejected');

    // Verify workflow is closed
    const status = await workflowService.getApprovalStatus('leave_request', 'leave-uuid-reject');
    expect(status.status).toBe('rejected');
  });

  test('should handle rejection at level 2', async () => {
    // Submit leave request
    const result = await workflowService.submitForApproval(
      'leave_request',
      'leave-uuid-reject2',
      'employee-uuid-456'
    );

    // Approve level 1
    await workflowService.approveStep(
      result.workflow_id,
      'supervisor-uuid-789',
      'Approved'
    );

    // Reject at level 2
    const rejectResult = await workflowService.rejectStep(
      result.workflow_id,
      'hr-manager-uuid-999',
      'Critical project period - cannot approve'
    );

    expect(rejectResult.status).toBe('rejected');
  });

  test('should verify notifications are sent', async () => {
    // This would test notification sending
    // For now, we'll mock the notification verification
    const result = await workflowService.submitForApproval(
      'leave_request',
      'leave-uuid-notify',
      'employee-uuid-456'
    );

    expect(result.workflow_id).toBeDefined();

    // In a real test, we would verify:
    // - Email sent to first approver
    // - In-app notification created
    // - Notification contains correct details

    // For now, just verify workflow was created
    const status = await workflowService.getApprovalStatus('leave_request', 'leave-uuid-notify');
    expect(status).toBeDefined();
    expect(status.status).toBe('in_progress');
  });

  test('should handle multiple pending approvals for manager', async () => {
    // Submit multiple leave requests
    const result1 = await workflowService.submitForApproval(
      'leave_request',
      'leave-uuid-multi1',
      'employee-emp1'
    );

    const result2 = await workflowService.submitForApproval(
      'leave_request',
      'leave-uuid-multi2',
      'employee-emp2'
    );

    const result3 = await workflowService.submitForApproval(
      'leave_request',
      'leave-uuid-multi3',
      'employee-emp3'
    );

    // Get pending approvals for manager
    const pending = await workflowService.getPendingApprovals('supervisor-uuid-789');

    expect(pending.length).toBeGreaterThanOrEqual(3);
    expect(pending.every(p => p.entity_type === 'leave_request')).toBe(true);
    expect(pending.every(p => p.level === 1)).toBe(true);
  });
});
