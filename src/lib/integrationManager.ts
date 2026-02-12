'use client';

import { dataStore } from './dataStore';
import type { DailyAttendanceSummary } from '@/types/hr';

/**
 * Integration Manager - Handles cross-module data flows
 * Makes the demo system feel like a real connected hospital
 */

class IntegrationManager {
  // =========================================================================
  // FLOW 1: NEW EMPLOYEE AUTO-SETUP
  // =========================================================================

  async onEmployeeCreated(employeeId: string) {
    console.log('🔄 Integration: New employee created -', employeeId);

    try {
      // 1. Create leave balances
      this.createInitialLeaveBalances(employeeId);

      // 2. Create attendance record for today
      this.createInitialAttendanceRecord(employeeId);

      console.log('✅ Employee auto-setup complete');
      return { success: true };
    } catch (error) {
      console.error('❌ Employee auto-setup failed:', error);
      return { success: false, error };
    }
  }

  private createInitialLeaveBalances(employeeId: string) {
    const employee = dataStore.getEmployee(employeeId);
    if (!employee) return;

    // Check if balance already exists
    const existing = dataStore.getLeaveBalances().find((b: any) => b.employee_id === employeeId);
    if (existing) {
      console.log('  ⏭ Leave balances already exist');
      return;
    }

    // Calculate entitlements based on employee category and grade
    const isDoctor = employee.employee_category === 'MEDICAL_STAFF';
    const gradeNum = employee.grade_id ? parseInt(employee.grade_id.replace('G', '')) : 1;
    const isSenior = gradeNum >= 7;

    const annualDays = isDoctor ? 30 : isSenior ? 25 : 21;

    const balance: any = {
      employee_id: employeeId,
      year: new Date().getFullYear(),
      annual: { total: annualDays, used: 0, pending: 0, available: annualDays },
      sick: { total: 14, used: 0, pending: 0, available: 14 },
      emergency: { total: 3, used: 0, pending: 0, available: 3 },
      maternity: {
        total: (employee as any).gender === 'FEMALE' ? 90 : 0,
        used: 0, pending: 0,
        available: (employee as any).gender === 'FEMALE' ? 90 : 0,
      },
      paternity: {
        total: (employee as any).gender === 'MALE' ? 3 : 0,
        used: 0, pending: 0,
        available: (employee as any).gender === 'MALE' ? 3 : 0,
      },
      compensatory: { total: 5, used: 0, pending: 0, available: 5 },
      study: { total: 0, used: 0, pending: 0, available: 0 },
      unpaid: { total: 0, used: 0, pending: 0, available: 0 },
    };

    // Add to dataStore via direct localStorage manipulation
    // (dataStore.getLeaveBalances returns the array; we push and persist)
    try {
      const STORAGE_KEY = 'tibbna_hr_data';
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const store = JSON.parse(raw);
      if (!store.leaves) return;
      if (!store.leaves.leave_balances) store.leaves.leave_balances = [];
      store.leaves.leave_balances.push(balance);
      store.lastUpdated = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      console.log(`  ✓ Leave balances created (${annualDays} annual days)`);
    } catch (err) {
      console.error('  ❌ Failed to create leave balances:', err);
    }
  }

  private createInitialAttendanceRecord(employeeId: string) {
    const employee = dataStore.getEmployee(employeeId);
    if (!employee || employee.employment_status !== 'ACTIVE') {
      console.log('  ⏭ Employee not active, skipping attendance record');
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    // Check if already has a record for today
    const existing = dataStore.getProcessedSummaries().find(
      (s: any) => s.employee_id === employeeId && s.date === today
    );
    if (existing) {
      console.log('  ⏭ Attendance record already exists for today');
      return;
    }

    const summary: any = {
      id: `SUM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      employee_id: employeeId,
      employee_name: `${employee.first_name} ${employee.last_name}`,
      date: today,
      status: 'PRESENT',
      first_in: null,
      last_out: null,
      total_hours: 0,
      overtime_hours: 0,
      late_minutes: 0,
      processed_at: new Date().toISOString(),
      processed_by: 'System (Auto-created)',
    };

    dataStore.batchAddProcessedSummaries([summary as DailyAttendanceSummary]);
    console.log('  ✓ Initial attendance record created for today');
  }

  // =========================================================================
  // FLOW 2: ATTENDANCE → PAYROLL
  // =========================================================================

  async onAttendanceProcessed(dateProcessed: string, employeeIds: string[]) {
    console.log('🔄 Integration: Attendance processed -', dateProcessed, `(${employeeIds.length} employees)`);

    // Mark that payroll needs recalculation
    const metadata = this.getMetadata();
    metadata.pendingPayrollUpdates = metadata.pendingPayrollUpdates || [];

    const existing = metadata.pendingPayrollUpdates.find((p: any) => p.date === dateProcessed);
    if (!existing) {
      metadata.pendingPayrollUpdates.push({
        date: dateProcessed,
        employeeIds,
        processedAt: new Date().toISOString(),
      });
      this.saveMetadata(metadata);
      console.log(`  ✓ Payroll update queued for ${employeeIds.length} employees`);
    } else {
      console.log('  ⏭ Payroll update already queued for this date');
    }

    return { success: true };
  }

  // =========================================================================
  // FLOW 3: LEAVE APPROVAL → ATTENDANCE
  // =========================================================================

  async onLeaveApproved(leaveRequestId: string) {
    console.log('🔄 Integration: Leave approved -', leaveRequestId);

    try {
      const request = dataStore.getLeaveRequest(leaveRequestId);
      if (!request) {
        console.error('  ❌ Leave request not found');
        return { success: false, error: 'Request not found', recordsCreated: 0 };
      }

      // Create attendance records for each day of leave
      const summaries: any[] = [];
      const start = new Date(request.start_date);
      const end = new Date(request.end_date);
      const employee = dataStore.getEmployee(request.employee_id);

      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        const dayOfWeek = date.getDay();

        // Skip Iraqi weekends (Friday=5, Saturday=6)
        if (dayOfWeek === 5 || dayOfWeek === 6) continue;

        // Check if record already exists
        const existing = dataStore.getProcessedSummaries().find(
          (s: any) => s.employee_id === request.employee_id && s.date === dateStr
        );
        if (existing) continue;

        summaries.push({
          id: `SUM-LEAVE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          employee_id: request.employee_id,
          employee_name: employee ? `${employee.first_name} ${employee.last_name}` : request.employee_id,
          date: dateStr,
          status: 'LEAVE',
          leave_type: request.leave_type,
          leave_request_id: (request as any).id || leaveRequestId,
          first_in: null,
          last_out: null,
          total_hours: 0,
          overtime_hours: 0,
          late_minutes: 0,
          processed_at: new Date().toISOString(),
          processed_by: 'System (Leave Integration)',
        });
      }

      if (summaries.length > 0) {
        dataStore.batchAddProcessedSummaries(summaries as DailyAttendanceSummary[]);
        console.log(`  ✓ Created ${summaries.length} attendance records for leave period`);
      } else {
        console.log('  ⏭ No new attendance records needed');
      }

      return { success: true, recordsCreated: summaries.length };
    } catch (error) {
      console.error('❌ Leave approval integration failed:', error);
      return { success: false, error, recordsCreated: 0 };
    }
  }

  // =========================================================================
  // FLOW 4: PAYROLL → FINANCE
  // =========================================================================

  async onPayrollProcessed(period: { month: number; year: number }, totalAmount: number, employeeCount: number) {
    console.log('🔄 Integration: Payroll processed -', `${period.month}/${period.year}`, `IQD ${totalAmount.toLocaleString()}`);

    const metadata = this.getMetadata();
    metadata.payrollToFinance = metadata.payrollToFinance || [];

    metadata.payrollToFinance.push({
      period,
      totalAmount,
      employeeCount,
      processedAt: new Date().toISOString(),
      status: 'pending_journal_entry',
    });
    this.saveMetadata(metadata);

    console.log(`  ✓ Finance journal entry queued: IQD ${totalAmount.toLocaleString()} for ${employeeCount} employees`);
    return { success: true };
  }

  // =========================================================================
  // METADATA MANAGEMENT (stores integration state)
  // =========================================================================

  private getMetadata(): any {
    if (typeof window === 'undefined') return {};
    try {
      const stored = localStorage.getItem('tibbna_integrations');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private saveMetadata(metadata: any) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('tibbna_integrations', JSON.stringify(metadata));
    } catch (error) {
      console.error('Failed to save integration metadata:', error);
    }
  }

  // =========================================================================
  // UTILITY: GET PENDING INTEGRATIONS
  // =========================================================================

  getPendingIntegrations() {
    const metadata = this.getMetadata();
    return {
      pendingPayrollUpdates: metadata.pendingPayrollUpdates || [],
      payrollToFinance: metadata.payrollToFinance || [],
      inventoryExpenses: metadata.inventoryExpenses || [],
      pendingInvoices: metadata.pendingInvoices || [],
      receivedPurchases: metadata.receivedPurchases || [],
    };
  }

  getPendingCount() {
    const pending = this.getPendingIntegrations();
    return (
      pending.pendingPayrollUpdates.length +
      pending.payrollToFinance.length +
      pending.inventoryExpenses.length +
      pending.pendingInvoices.length +
      pending.receivedPurchases.length
    );
  }

  clearPendingIntegrations() {
    this.saveMetadata({});
    console.log('✅ All pending integrations cleared');
  }
}

// Export singleton instance
export const integrationManager = new IntegrationManager();
