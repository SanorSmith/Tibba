/**
 * Workflow Service Unit Tests
 * Tests for multi-level approval workflows
 */

import { workflowService } from '../workflow-service';

describe('WorkflowService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('submitForApproval', () => {
    test('should submit leave request for 1-level approval (≤3 days)', async () => {
      const result = await workflowService.submitForApproval(
        'leave_request',
        'leave-uuid-123',
        'employee-uuid-456'
      );

      expect(result.workflow_id).toBeDefined();
      expect(result.total_levels).toBe(1);
    });

    test('should submit leave request for 2-level approval (4-7 days)', async () => {
      const result = await workflowService.submitForApproval(
        'leave_request',
        'leave-uuid-789',
        'employee-uuid-456'
      );

      expect(result.workflow_id).toBeDefined();
      expect(result.total_levels).toBe(2);
    });

    test('should submit leave request for 3-level approval (>7 days)', async () => {
      const result = await workflowService.submitForApproval(
        'leave_request',
        'leave-uuid-999',
        'employee-uuid-456'
      );

      expect(result.workflow_id).toBeDefined();
      expect(result.total_levels).toBe(3);
    });

    test('should auto-approve emergency leave', async () => {
      const result = await workflowService.submitForApproval(
        'leave_request',
        'emergency-leave-123',
        'employee-uuid-456'
      );

      expect(result.total_levels).toBe(0);
    });
  });

  describe('approveStep', () => {
    test('should approve step and move to next level', async () => {
      const result = await workflowService.approveStep(
        'workflow-uuid-123',
        'approver-uuid-456',
        'Approved'
      );

      expect(result.status).toBe('in_progress');
      expect(result.next_level).toBe(2);
    });

    test('should complete workflow on final approval', async () => {
      const result = await workflowService.approveStep(
        'workflow-uuid-789',
        'approver-uuid-456',
        'Approved'
      );

      expect(result.status).toBe('approved');
      expect(result.next_level).toBeUndefined();
    });

    test('should reject invalid workflow', async () => {
      await expect(
        workflowService.approveStep('invalid-workflow', 'approver-uuid-456')
      ).rejects.toThrow('Workflow not found');
    });

    test('should reject unauthorized approver', async () => {
      await expect(
        workflowService.approveStep('workflow-uuid-123', 'unauthorized-approver')
      ).rejects.toThrow('You are not authorized to approve this step');
    });
  });

  describe('rejectStep', () => {
    test('should reject workflow step', async () => {
      const result = await workflowService.rejectStep(
        'workflow-uuid-123',
        'approver-uuid-456',
        'Insufficient leave balance'
      );

      expect(result.status).toBe('rejected');
    });

    test('should require rejection reason', async () => {
      await expect(
        workflowService.rejectStep('workflow-uuid-123', 'approver-uuid-456', '')
      ).rejects.toThrow('Rejection reason is required');
    });
  });

  describe('getApprovalStatus', () => {
    test('should return workflow status', async () => {
      const status = await workflowService.getApprovalStatus(
        'leave_request',
        'leave-uuid-123'
      );

      expect(status).toBeDefined();
      expect(status.workflow_id).toBeDefined();
      expect(status.status).toBeDefined();
    });

    test('should return null for non-existent entity', async () => {
      const status = await workflowService.getApprovalStatus(
        'leave_request',
        'non-existent-uuid'
      );

      expect(status).toBeNull();
    });
  });

  describe('getPendingApprovals', () => {
    test('should return pending approvals for employee', async () => {
      const pending = await workflowService.getPendingApprovals('approver-uuid-456');

      expect(Array.isArray(pending)).toBe(true);
    });

    test('should return empty array for no pending approvals', async () => {
      const pending = await workflowService.getPendingApprovals('approver-uuid-789');

      expect(pending).toEqual([]);
    });
  });
});
