/**
 * Alert Service
 * Automated alerts for license expiry, attendance anomalies, and leave balance
 */

import { createClient } from '@supabase/supabase-js';
import cron from 'node-cron';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export type AlertType =
  | 'license_expiry'
  | 'attendance_anomaly'
  | 'leave_balance'
  | 'late_arrival'
  | 'missing_checkout'
  | 'high_overtime'
  | 'consecutive_absence';

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'urgent';

interface AlertData {
  alert_type: AlertType;
  severity: AlertSeverity;
  employee_id: string;
  title: string;
  message: string;
  data?: any;
  action_required?: boolean;
  action_url?: string;
}

export class AlertService {
  private supabase;
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();

  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Initialize all scheduled alert checks
   */
  initializeSchedules(): void {
    console.log('Initializing alert schedules...');

    // License expiry check - Daily at 6:00 AM
    this.scheduleLicenseExpiryCheck();

    // Attendance anomaly check - Daily at 10:00 AM
    this.scheduleAttendanceAnomalyCheck();

    // Leave balance check - Weekly on Monday at 9:00 AM
    this.scheduleLeaveBalanceCheck();

    console.log(`Initialized ${this.scheduledTasks.size} alert schedules`);
  }

  /**
   * Schedule license expiry check - Daily at 6:00 AM
   */
  private scheduleLicenseExpiryCheck(): void {
    const task = cron.schedule('0 6 * * *', async () => {
      try {
        console.log('Running license expiry check...');
        await this.checkLicenseExpiry();
      } catch (error: any) {
        console.error('Error in license expiry check:', error);
      }
    });

    this.scheduledTasks.set('license-expiry', task);
  }

  /**
   * Schedule attendance anomaly check - Daily at 10:00 AM
   */
  private scheduleAttendanceAnomalyCheck(): void {
    const task = cron.schedule('0 10 * * *', async () => {
      try {
        console.log('Running attendance anomaly check...');
        await this.checkAttendanceAnomalies();
      } catch (error: any) {
        console.error('Error in attendance anomaly check:', error);
      }
    });

    this.scheduledTasks.set('attendance-anomaly', task);
  }

  /**
   * Schedule leave balance check - Weekly on Monday at 9:00 AM
   */
  private scheduleLeaveBalanceCheck(): void {
    const task = cron.schedule('0 9 * * 1', async () => {
      try {
        console.log('Running leave balance check...');
        await this.checkLeaveBalances();
      } catch (error: any) {
        console.error('Error in leave balance check:', error);
      }
    });

    this.scheduledTasks.set('leave-balance', task);
  }

  /**
   * Check for expiring licenses
   */
  async checkLicenseExpiry(): Promise<void> {
    const today = new Date();
    const thresholds = [
      { days: 90, severity: 'warning' as AlertSeverity },
      { days: 60, severity: 'warning' as AlertSeverity },
      { days: 30, severity: 'critical' as AlertSeverity },
      { days: 7, severity: 'urgent' as AlertSeverity },
    ];

    // Fetch all active employees
    const { data: employees, error } = await this.supabase
      .from('employees')
      .select('id, employee_number, first_name, last_name, email, metadata')
      .eq('status', 'active');

    if (error || !employees) {
      console.error('Error fetching employees:', error);
      return;
    }

    for (const employee of employees) {
      const licenses = employee.metadata?.licenses || [];

      for (const license of licenses) {
        if (!license.expiry_date) continue;

        const expiryDate = new Date(license.expiry_date);
        const daysUntilExpiry = Math.ceil(
          (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Check against thresholds
        for (const threshold of thresholds) {
          if (daysUntilExpiry === threshold.days) {
            await this.createAlert({
              alert_type: 'license_expiry',
              severity: threshold.severity,
              employee_id: employee.id,
              title: `License Expiring in ${threshold.days} Days`,
              message: `Your ${license.type} (${license.number}) will expire on ${license.expiry_date}. Please renew it before expiration.`,
              data: {
                license_type: license.type,
                license_number: license.number,
                expiry_date: license.expiry_date,
                days_until_expiry: daysUntilExpiry,
              },
              action_required: true,
              action_url: '/hr/licenses/renew',
            });

            // Send email notification
            await this.sendEmailNotification(
              employee.email,
              `License Expiring Soon - ${license.type}`,
              `Dear ${employee.first_name},\n\nYour ${license.type} (${license.number}) will expire in ${threshold.days} days on ${license.expiry_date}.\n\nPlease renew it as soon as possible to avoid any disruptions.\n\nBest regards,\nHR Department`
            );

            // Notify HR manager
            await this.notifyHRManager(
              `License Expiry Alert`,
              `${employee.first_name} ${employee.last_name} (${employee.employee_number}) has a ${license.type} expiring in ${threshold.days} days.`
            );
          }
        }
      }
    }
  }

  /**
   * Check for attendance anomalies
   */
  async checkAttendanceAnomalies(): Promise<void> {
    await this.checkLateArrivals();
    await this.checkMissingCheckouts();
    await this.checkHighOvertime();
    await this.checkConsecutiveAbsences();
  }

  /**
   * Check for employees consistently late
   */
  private async checkLateArrivals(): Promise<void> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data: lateRecords, error } = await this.supabase
      .from('attendance_records')
      .select(`
        employee_id,
        employees(id, employee_number, first_name, last_name, email, departments(name))
      `)
      .eq('status', 'LATE')
      .gte('attendance_date', oneWeekAgo.toISOString().split('T')[0]);

    if (error || !lateRecords) return;

    // Group by employee
    const employeeLateCount = new Map<string, any>();
    lateRecords.forEach((record: any) => {
      const empId = record.employee_id;
      if (!employeeLateCount.has(empId)) {
        employeeLateCount.set(empId, {
          employee: record.employees,
          count: 0,
        });
      }
      employeeLateCount.get(empId).count += 1;
    });

    // Alert for employees late > 3 times
    for (const [empId, data] of employeeLateCount) {
      if (data.count >= 3) {
        const emp = data.employee;
        await this.createAlert({
          alert_type: 'late_arrival',
          severity: data.count >= 5 ? 'critical' : 'warning',
          employee_id: empId,
          title: 'Frequent Late Arrivals',
          message: `You have been late ${data.count} times in the past week. Please ensure punctuality.`,
          data: {
            late_count: data.count,
            period: 'last_7_days',
          },
        });

        // Notify supervisor
        await this.notifySupervisor(
          empId,
          'Late Arrival Pattern Detected',
          `${emp.first_name} ${emp.last_name} has been late ${data.count} times in the past week.`
        );
      }
    }
  }

  /**
   * Check for missing check-outs
   */
  private async checkMissingCheckouts(): Promise<void> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: missingCheckouts, error } = await this.supabase
      .from('attendance_records')
      .select(`
        employee_id,
        attendance_date,
        check_in,
        employees(id, employee_number, first_name, last_name, email)
      `)
      .eq('attendance_date', yesterday.toISOString().split('T')[0])
      .is('check_out', null);

    if (error || !missingCheckouts) return;

    for (const record of missingCheckouts) {
      const emp = record.employees;
      await this.createAlert({
        alert_type: 'missing_checkout',
        severity: 'warning',
        employee_id: record.employee_id,
        title: 'Missing Check-Out',
        message: `You forgot to check out on ${record.attendance_date}. Please update your attendance record.`,
        data: {
          date: record.attendance_date,
          check_in: record.check_in,
        },
        action_required: true,
        action_url: '/hr/attendance/update',
      });
    }
  }

  /**
   * Check for abnormally high overtime
   */
  private async checkHighOvertime(): Promise<void> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data: overtimeRecords, error } = await this.supabase
      .from('attendance_records')
      .select(`
        employee_id,
        overtime_hours,
        employees(id, employee_number, first_name, last_name, email)
      `)
      .gte('attendance_date', oneWeekAgo.toISOString().split('T')[0])
      .gt('overtime_hours', 0);

    if (error || !overtimeRecords) return;

    // Group by employee
    const employeeOT = new Map<string, any>();
    overtimeRecords.forEach((record: any) => {
      const empId = record.employee_id;
      if (!employeeOT.has(empId)) {
        employeeOT.set(empId, {
          employee: record.employees,
          total_ot: 0,
        });
      }
      employeeOT.get(empId).total_ot += record.overtime_hours;
    });

    // Alert for OT > 20 hours per week
    for (const [empId, data] of employeeOT) {
      if (data.total_ot > 20) {
        const emp = data.employee;
        await this.createAlert({
          alert_type: 'high_overtime',
          severity: 'warning',
          employee_id: empId,
          title: 'High Overtime Hours',
          message: `You have worked ${data.total_ot.toFixed(1)} overtime hours this week. Please ensure work-life balance.`,
          data: {
            overtime_hours: data.total_ot,
            period: 'last_7_days',
          },
        });

        // Notify HR
        await this.notifyHRManager(
          'High Overtime Alert',
          `${emp.first_name} ${emp.last_name} has ${data.total_ot.toFixed(1)} overtime hours this week.`
        );
      }
    }
  }

  /**
   * Check for consecutive absences without leave
   */
  private async checkConsecutiveAbsences(): Promise<void> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: absences, error } = await this.supabase
      .from('attendance_records')
      .select(`
        employee_id,
        attendance_date,
        employees(id, employee_number, first_name, last_name, email)
      `)
      .eq('status', 'ABSENT')
      .gte('attendance_date', sevenDaysAgo.toISOString().split('T')[0])
      .order('attendance_date', { ascending: true });

    if (error || !absences) return;

    // Group by employee and check for consecutive days
    const employeeAbsences = new Map<string, any[]>();
    absences.forEach((record: any) => {
      const empId = record.employee_id;
      if (!employeeAbsences.has(empId)) {
        employeeAbsences.set(empId, []);
      }
      employeeAbsences.get(empId)!.push(record);
    });

    for (const [empId, records] of employeeAbsences) {
      let consecutiveCount = 1;
      let maxConsecutive = 1;

      for (let i = 1; i < records.length; i++) {
        const prevDate = new Date(records[i - 1].attendance_date);
        const currDate = new Date(records[i].attendance_date);
        const daysDiff = Math.floor(
          (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff === 1) {
          consecutiveCount++;
          maxConsecutive = Math.max(maxConsecutive, consecutiveCount);
        } else {
          consecutiveCount = 1;
        }
      }

      if (maxConsecutive >= 3) {
        const emp = records[0].employees;
        await this.createAlert({
          alert_type: 'consecutive_absence',
          severity: 'critical',
          employee_id: empId,
          title: 'Consecutive Absences Detected',
          message: `You have been absent for ${maxConsecutive} consecutive days. Please contact HR if you need assistance.`,
          data: {
            consecutive_days: maxConsecutive,
            period: 'last_7_days',
          },
          action_required: true,
        });

        // Notify HR and supervisor
        await this.notifyHRManager(
          'Consecutive Absences Alert',
          `${emp.first_name} ${emp.last_name} has been absent for ${maxConsecutive} consecutive days without approved leave.`
        );

        await this.notifySupervisor(
          empId,
          'Employee Absence Alert',
          `${emp.first_name} ${emp.last_name} has been absent for ${maxConsecutive} consecutive days.`
        );
      }
    }
  }

  /**
   * Check leave balances
   */
  async checkLeaveBalances(): Promise<void> {
    const { data: employees, error } = await this.supabase
      .from('employees')
      .select('id, employee_number, first_name, last_name, email, metadata')
      .eq('status', 'active');

    if (error || !employees) return;

    for (const employee of employees) {
      const annualLeaveEntitlement = employee.metadata?.annual_leave_days || 30;

      // Fetch used leave
      const { data: leaves } = await this.supabase
        .from('leave_requests')
        .select('total_days, leave_type')
        .eq('employee_id', employee.id)
        .eq('status', 'APPROVED')
        .eq('leave_type', 'annual');

      const usedLeave = leaves?.reduce((sum, l) => sum + (l.total_days || 0), 0) || 0;
      const remainingLeave = annualLeaveEntitlement - usedLeave;

      // Alert if balance < 5 days
      if (remainingLeave < 5 && remainingLeave > 0) {
        await this.createAlert({
          alert_type: 'leave_balance',
          severity: 'warning',
          employee_id: employee.id,
          title: 'Low Leave Balance',
          message: `You have only ${remainingLeave} days of annual leave remaining. Plan your leave accordingly.`,
          data: {
            remaining_days: remainingLeave,
            total_entitlement: annualLeaveEntitlement,
            used_days: usedLeave,
          },
        });
      }

      // Check for expiring leave (end of year)
      const today = new Date();
      const endOfYear = new Date(today.getFullYear(), 11, 31);
      const daysUntilYearEnd = Math.ceil(
        (endOfYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilYearEnd <= 60 && remainingLeave > 5) {
        await this.createAlert({
          alert_type: 'leave_balance',
          severity: 'info',
          employee_id: employee.id,
          title: 'Annual Leave Expiring Soon',
          message: `You have ${remainingLeave} days of annual leave that will expire on December 31. Consider planning your leave.`,
          data: {
            remaining_days: remainingLeave,
            days_until_expiry: daysUntilYearEnd,
          },
        });
      }
    }
  }

  /**
   * Create alert in database
   */
  private async createAlert(alertData: AlertData): Promise<void> {
    const { data: org } = await this.supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .single();

    if (!org) return;

    const { error } = await this.supabase.from('alerts').insert({
      organization_id: org.id,
      alert_type: alertData.alert_type,
      severity: alertData.severity,
      employee_id: alertData.employee_id,
      title: alertData.title,
      message: alertData.message,
      data: alertData.data || {},
      action_required: alertData.action_required || false,
      action_url: alertData.action_url || null,
    });

    if (error) {
      console.error('Error creating alert:', error);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    email: string,
    subject: string,
    body: string
  ): Promise<void> {
    // Queue email notification
    const { data: org } = await this.supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .single();

    if (!org) return;

    await this.supabase.from('notification_queue').insert({
      organization_id: org.id,
      notification_type: 'email',
      recipient_email: email,
      subject,
      body,
      priority: 5,
    });
  }

  /**
   * Notify HR manager
   */
  private async notifyHRManager(subject: string, message: string): Promise<void> {
    // Find HR manager
    const { data: hrManager } = await this.supabase
      .from('employees')
      .select('id, email')
      .eq('position', 'HR Manager')
      .eq('status', 'active')
      .limit(1)
      .single();

    if (hrManager) {
      await this.sendEmailNotification(hrManager.email, subject, message);
    }
  }

  /**
   * Notify supervisor
   */
  private async notifySupervisor(
    employeeId: string,
    subject: string,
    message: string
  ): Promise<void> {
    // Get employee's supervisor
    const { data: employee } = await this.supabase
      .from('employees')
      .select('metadata')
      .eq('id', employeeId)
      .single();

    const supervisorId = employee?.metadata?.supervisor_id;
    if (supervisorId) {
      const { data: supervisor } = await this.supabase
        .from('employees')
        .select('email')
        .eq('id', supervisorId)
        .single();

      if (supervisor) {
        await this.sendEmailNotification(supervisor.email, subject, message);
      }
    }
  }

  /**
   * Stop all scheduled tasks
   */
  stopAll(): void {
    this.scheduledTasks.forEach((task, name) => {
      task.stop();
      console.log(`Stopped alert task: ${name}`);
    });
    this.scheduledTasks.clear();
  }

  /**
   * Get status of all scheduled tasks
   */
  getStatus(): { name: string; running: boolean }[] {
    const status: { name: string; running: boolean }[] = [];
    this.scheduledTasks.forEach((task, name) => {
      status.push({
        name,
        running: task ? true : false,
      });
    });
    return status;
  }
}

export const alertService = new AlertService();

// Initialize schedules in production
if (process.env.NODE_ENV === 'production') {
  alertService.initializeSchedules();
}
