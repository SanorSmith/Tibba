/**
 * Workflow Service
 * Multi-level approval workflows for leave requests and other entities
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export type EntityType = 'leave_request' | 'overtime_request' | 'expense_claim' | 'loan_request' | 'advance_request';
export type WorkflowStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled';
export type StepStatus = 'pending' | 'approved' | 'rejected' | 'skipped';

interface ApprovalRule {
  levels: number;
  approvers: Array<{ level: number; role: string }>;
}

interface WorkflowStep {
  level: number;
  approver_id: string;
  approver_role: string;
  status: StepStatus;
}

export class WorkflowService {
  private supabase;

  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Submit entity for approval
   */
  async submitForApproval(
    entityType: EntityType,
    entityId: string,
    submittedBy: string
  ): Promise<{ workflow_id: string; total_levels: number }> {
    // Get approval rules based on entity
    const approvalRules = await this.getApprovalRules(entityType, entityId);

    if (approvalRules.levels === 0) {
      // Auto-approve
      await this.autoApprove(entityType, entityId);
      return { workflow_id: '', total_levels: 0 };
    }

    // Get organization ID
    const { data: org } = await this.supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .single();

    if (!org) {
      throw new Error('Organization not found');
    }

    // Create workflow
    const { data: workflow, error: workflowError } = await this.supabase
      .from('approval_workflows')
      .insert({
        organization_id: org.id,
        entity_type: entityType,
        entity_id: entityId,
        current_level: 1,
        total_levels: approvalRules.levels,
        status: 'in_progress',
        submitted_by: submittedBy,
      })
      .select()
      .single();

    if (workflowError || !workflow) {
      throw new Error(`Failed to create workflow: ${workflowError?.message}`);
    }

    // Create approval steps
    for (const approver of approvalRules.approvers) {
      const { error: stepError } = await this.supabase
        .from('approval_steps')
        .insert({
          workflow_id: workflow.id,
          level: approver.level,
          approver_id: approver.approver_id,
          approver_role: approver.role,
          status: approver.level === 1 ? 'pending' : 'pending',
        });

      if (stepError) {
        console.error('Error creating approval step:', stepError);
      }
    }

    // Notify first approver
    await this.notifyApprover(workflow.id, 1);

    return {
      workflow_id: workflow.id,
      total_levels: approvalRules.levels,
    };
  }

  /**
   * Approve workflow step
   */
  async approveStep(
    workflowId: string,
    approverId: string,
    comments?: string
  ): Promise<{ status: WorkflowStatus; next_level?: number }> {
    // Get workflow
    const { data: workflow, error: workflowError } = await this.supabase
      .from('approval_workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (workflowError || !workflow) {
      throw new Error('Workflow not found');
    }

    if (workflow.status !== 'in_progress') {
      throw new Error(`Workflow is ${workflow.status}, cannot approve`);
    }

    // Get current step
    const { data: step, error: stepError } = await this.supabase
      .from('approval_steps')
      .select('*')
      .eq('workflow_id', workflowId)
      .eq('level', workflow.current_level)
      .eq('approver_id', approverId)
      .single();

    if (stepError || !step) {
      throw new Error('You are not authorized to approve this step');
    }

    if (step.status !== 'pending') {
      throw new Error('This step has already been processed');
    }

    // Update step status
    const { error: updateStepError } = await this.supabase
      .from('approval_steps')
      .update({
        status: 'approved',
        action_date: new Date().toISOString(),
        comments: comments || null,
      })
      .eq('id', step.id);

    if (updateStepError) {
      throw new Error('Failed to update approval step');
    }

    // Check if this was the last level
    if (workflow.current_level >= workflow.total_levels) {
      // Complete workflow
      await this.completeWorkflow(workflowId, 'approved');
      
      // Update entity status
      await this.updateEntityStatus(workflow.entity_type, workflow.entity_id, 'APPROVED');

      return { status: 'approved' };
    } else {
      // Move to next level
      const nextLevel = workflow.current_level + 1;
      
      const { error: updateWorkflowError } = await this.supabase
        .from('approval_workflows')
        .update({
          current_level: nextLevel,
        })
        .eq('id', workflowId);

      if (updateWorkflowError) {
        throw new Error('Failed to update workflow level');
      }

      // Notify next approver
      await this.notifyApprover(workflowId, nextLevel);

      return { status: 'in_progress', next_level: nextLevel };
    }
  }

  /**
   * Reject workflow step
   */
  async rejectStep(
    workflowId: string,
    approverId: string,
    reason: string
  ): Promise<{ status: WorkflowStatus }> {
    // Get workflow
    const { data: workflow, error: workflowError } = await this.supabase
      .from('approval_workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (workflowError || !workflow) {
      throw new Error('Workflow not found');
    }

    if (workflow.status !== 'in_progress') {
      throw new Error(`Workflow is ${workflow.status}, cannot reject`);
    }

    // Get current step
    const { data: step, error: stepError } = await this.supabase
      .from('approval_steps')
      .select('*')
      .eq('workflow_id', workflowId)
      .eq('level', workflow.current_level)
      .eq('approver_id', approverId)
      .single();

    if (stepError || !step) {
      throw new Error('You are not authorized to reject this step');
    }

    // Update step status
    await this.supabase
      .from('approval_steps')
      .update({
        status: 'rejected',
        action_date: new Date().toISOString(),
        comments: reason,
      })
      .eq('id', step.id);

    // Complete workflow as rejected
    await this.completeWorkflow(workflowId, 'rejected');

    // Update entity status
    await this.updateEntityStatus(workflow.entity_type, workflow.entity_id, 'REJECTED');

    // Notify submitter
    await this.notifySubmitter(workflow.submitted_by, workflow.entity_type, 'rejected', reason);

    return { status: 'rejected' };
  }

  /**
   * Get approval status
   */
  async getApprovalStatus(entityType: EntityType, entityId: string): Promise<any> {
    const { data: workflow, error } = await this.supabase
      .from('approval_workflows')
      .select(`
        *,
        approval_steps(
          level,
          approver_id,
          approver_role,
          status,
          action_date,
          comments,
          employees(employee_number, first_name, last_name)
        )
      `)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .single();

    if (error || !workflow) {
      return null;
    }

    return {
      workflow_id: workflow.id,
      status: workflow.status,
      current_level: workflow.current_level,
      total_levels: workflow.total_levels,
      submitted_at: workflow.submitted_at,
      completed_at: workflow.completed_at,
      steps: workflow.approval_steps,
    };
  }

  /**
   * Get pending approvals for an employee
   */
  async getPendingApprovals(approverId: string): Promise<any[]> {
    const { data: steps, error } = await this.supabase
      .from('approval_steps')
      .select(`
        *,
        approval_workflows(
          id,
          entity_type,
          entity_id,
          current_level,
          total_levels,
          submitted_by,
          submitted_at,
          employees(employee_number, first_name, last_name)
        )
      `)
      .eq('approver_id', approverId)
      .eq('status', 'pending');

    if (error || !steps) {
      return [];
    }

    // Filter to only current level steps
    return steps.filter((step: any) => {
      const workflow = step.approval_workflows;
      return workflow.status === 'in_progress' && step.level === workflow.current_level;
    });
  }

  /**
   * Determine approval rules based on entity type and data
   */
  private async getApprovalRules(
    entityType: EntityType,
    entityId: string
  ): Promise<{ levels: number; approvers: any[] }> {
    if (entityType === 'leave_request') {
      return await this.getLeaveApprovalRules(entityId);
    }

    // Default: 1 level (supervisor)
    return {
      levels: 1,
      approvers: [
        { level: 1, role: 'supervisor', approver_id: await this.getSupervisorId(entityId) },
      ],
    };
  }

  /**
   * Get leave approval rules based on leave type and duration
   */
  private async getLeaveApprovalRules(leaveRequestId: string): Promise<{ levels: number; approvers: any[] }> {
    const { data: leave, error } = await this.supabase
      .from('leave_requests')
      .select('*, employees(metadata)')
      .eq('id', leaveRequestId)
      .single();

    if (error || !leave) {
      throw new Error('Leave request not found');
    }

    const leaveType = leave.leave_type?.toLowerCase();
    const totalDays = leave.total_days || 0;
    const supervisorId = leave.employees?.metadata?.supervisor_id;

    // Emergency leave - Auto-approve
    if (leaveType === 'emergency') {
      return { levels: 0, approvers: [] };
    }

    // Sick leave with medical certificate - 1 level (supervisor)
    if (leaveType === 'sick' && leave.metadata?.has_medical_certificate) {
      return {
        levels: 1,
        approvers: [{ level: 1, role: 'supervisor', approver_id: supervisorId }],
      };
    }

    // Annual leave rules
    if (leaveType === 'annual') {
      if (totalDays <= 3) {
        // 1 level: Supervisor only
        return {
          levels: 1,
          approvers: [{ level: 1, role: 'supervisor', approver_id: supervisorId }],
        };
      } else if (totalDays <= 7) {
        // 2 levels: Supervisor → HR Manager
        const hrManagerId = await this.getHRManagerId();
        return {
          levels: 2,
          approvers: [
            { level: 1, role: 'supervisor', approver_id: supervisorId },
            { level: 2, role: 'hr_manager', approver_id: hrManagerId },
          ],
        };
      } else {
        // 3 levels: Supervisor → HR Manager → Director
        const hrManagerId = await this.getHRManagerId();
        const directorId = await this.getDirectorId();
        return {
          levels: 3,
          approvers: [
            { level: 1, role: 'supervisor', approver_id: supervisorId },
            { level: 2, role: 'hr_manager', approver_id: hrManagerId },
            { level: 3, role: 'director', approver_id: directorId },
          ],
        };
      }
    }

    // Default: 1 level
    return {
      levels: 1,
      approvers: [{ level: 1, role: 'supervisor', approver_id: supervisorId }],
    };
  }

  /**
   * Auto-approve entity (for emergency leave)
   */
  private async autoApprove(entityType: EntityType, entityId: string): Promise<void> {
    await this.updateEntityStatus(entityType, entityId, 'APPROVED');
    
    // Send notification
    if (entityType === 'leave_request') {
      const { data: leave } = await this.supabase
        .from('leave_requests')
        .select('employee_id')
        .eq('id', entityId)
        .single();

      if (leave) {
        await this.notifySubmitter(
          leave.employee_id,
          entityType,
          'approved',
          'Auto-approved (Emergency Leave)'
        );
      }
    }
  }

  /**
   * Complete workflow
   */
  private async completeWorkflow(workflowId: string, status: 'approved' | 'rejected'): Promise<void> {
    await this.supabase
      .from('approval_workflows')
      .update({
        status,
        completed_at: new Date().toISOString(),
      })
      .eq('id', workflowId);
  }

  /**
   * Update entity status
   */
  private async updateEntityStatus(
    entityType: EntityType,
    entityId: string,
    status: string
  ): Promise<void> {
    const tableName = entityType === 'leave_request' ? 'leave_requests' : entityType + 's';
    
    await this.supabase
      .from(tableName)
      .update({ status })
      .eq('id', entityId);
  }

  /**
   * Notify approver
   */
  private async notifyApprover(workflowId: string, level: number): Promise<void> {
    const { data: step } = await this.supabase
      .from('approval_steps')
      .select(`
        *,
        approval_workflows(entity_type, entity_id, submitted_by, employees(first_name, last_name)),
        employees(email, first_name, last_name)
      `)
      .eq('workflow_id', workflowId)
      .eq('level', level)
      .single();

    if (!step) return;

    const workflow = step.approval_workflows as any;
    const approver = step.employees as any;
    const submitter = workflow.employees as any;

    // Queue email notification
    const { data: org } = await this.supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .single();

    if (org) {
      await this.supabase.from('notification_queue').insert({
        organization_id: org.id,
        notification_type: 'email',
        recipient_id: step.approver_id,
        recipient_email: approver.email,
        subject: `Approval Required: ${workflow.entity_type}`,
        body: `Dear ${approver.first_name},\n\nYou have a pending approval request from ${submitter.first_name} ${submitter.last_name}.\n\nEntity Type: ${workflow.entity_type}\nLevel: ${level}\n\nPlease review and approve/reject this request.\n\nBest regards,\nHR System`,
        priority: 8,
      });
    }
  }

  /**
   * Notify submitter
   */
  private async notifySubmitter(
    employeeId: string,
    entityType: string,
    status: string,
    comments?: string
  ): Promise<void> {
    const { data: employee } = await this.supabase
      .from('employees')
      .select('email, first_name')
      .eq('id', employeeId)
      .single();

    if (!employee) return;

    const { data: org } = await this.supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .single();

    if (org) {
      await this.supabase.from('notification_queue').insert({
        organization_id: org.id,
        notification_type: 'email',
        recipient_id: employeeId,
        recipient_email: employee.email,
        subject: `${entityType} ${status}`,
        body: `Dear ${employee.first_name},\n\nYour ${entityType} has been ${status}.\n\n${comments ? `Comments: ${comments}\n\n` : ''}Best regards,\nHR Department`,
        priority: 7,
      });
    }
  }

  /**
   * Get supervisor ID
   */
  private async getSupervisorId(entityId: string): Promise<string> {
    // This would typically fetch from employee metadata
    // For now, return a placeholder
    return 'supervisor-uuid';
  }

  /**
   * Get HR Manager ID
   */
  private async getHRManagerId(): Promise<string> {
    const { data: hrManager } = await this.supabase
      .from('employees')
      .select('id')
      .eq('position', 'HR Manager')
      .eq('status', 'active')
      .limit(1)
      .single();

    return hrManager?.id || 'hr-manager-uuid';
  }

  /**
   * Get Director ID
   */
  private async getDirectorId(): Promise<string> {
    const { data: director } = await this.supabase
      .from('employees')
      .select('id')
      .eq('position', 'Director')
      .eq('status', 'active')
      .limit(1)
      .single();

    return director?.id || 'director-uuid';
  }
}

export const workflowService = new WorkflowService();
