/**
 * Report Scheduler Service
 * Automatically generates and sends scheduled reports
 */

import cron from 'node-cron';
import { reportGenerator } from './report-generator';
import { reportExporter } from './report-exporter';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export class ReportScheduler {
  private supabase;
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();

  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Initialize all scheduled reports
   */
  initializeSchedules(): void {
    console.log('Initializing report schedules...');

    // Daily Attendance Report - Every day at 9:00 AM
    this.scheduleDailyAttendanceReport();

    // Monthly Payroll Report - 1st of every month at 8:00 AM
    this.scheduleMonthlyPayrollReport();

    // Weekly Overtime Analysis - Every Monday at 9:00 AM
    this.scheduleWeeklyOvertimeReport();

    // License Expiry Report - Every Monday at 10:00 AM
    this.scheduleLicenseExpiryReport();

    console.log(`Initialized ${this.scheduledTasks.size} scheduled reports`);
  }

  /**
   * Daily Attendance Report - 9:00 AM every day
   */
  private scheduleDailyAttendanceReport(): void {
    const task = cron.schedule('0 9 * * *', async () => {
      try {
        console.log('Generating daily attendance report...');
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];

        const reportData = await reportGenerator.generateReport('daily-attendance', {
          start_date: dateStr,
        });

        // Generate Excel file
        const excelBuffer = await reportExporter.exportToExcel(reportData, 'daily-attendance');

        // Save to database or send email
        await this.saveScheduledReport({
          report_type: 'daily-attendance',
          report_date: dateStr,
          file_data: excelBuffer,
          file_name: `daily-attendance-${dateStr}.xlsx`,
          status: 'completed',
        });

        // TODO: Send email to HR team
        console.log(`Daily attendance report generated for ${dateStr}`);
      } catch (error: any) {
        console.error('Error generating daily attendance report:', error);
        await this.logScheduledReportError('daily-attendance', error.message);
      }
    });

    this.scheduledTasks.set('daily-attendance', task);
  }

  /**
   * Monthly Payroll Report - 1st of month at 8:00 AM
   */
  private scheduleMonthlyPayrollReport(): void {
    const task = cron.schedule('0 8 1 * *', async () => {
      try {
        console.log('Generating monthly payroll report...');
        
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        
        const startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
        const endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);

        const reportData = await reportGenerator.generateReport('monthly-payroll', {
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
        });

        // Generate Excel file
        const excelBuffer = await reportExporter.exportToExcel(reportData, 'monthly-payroll');

        const fileName = `monthly-payroll-${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}.xlsx`;

        await this.saveScheduledReport({
          report_type: 'monthly-payroll',
          report_date: startDate.toISOString().split('T')[0],
          file_data: excelBuffer,
          file_name: fileName,
          status: 'completed',
        });

        console.log(`Monthly payroll report generated for ${lastMonth.getFullYear()}-${lastMonth.getMonth() + 1}`);
      } catch (error: any) {
        console.error('Error generating monthly payroll report:', error);
        await this.logScheduledReportError('monthly-payroll', error.message);
      }
    });

    this.scheduledTasks.set('monthly-payroll', task);
  }

  /**
   * Weekly Overtime Analysis - Every Monday at 9:00 AM
   */
  private scheduleWeeklyOvertimeReport(): void {
    const task = cron.schedule('0 9 * * 1', async () => {
      try {
        console.log('Generating weekly overtime report...');
        
        const today = new Date();
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - 7);
        const lastWeekEnd = new Date(today);
        lastWeekEnd.setDate(today.getDate() - 1);

        const reportData = await reportGenerator.generateReport('overtime-analysis', {
          start_date: lastWeekStart.toISOString().split('T')[0],
          end_date: lastWeekEnd.toISOString().split('T')[0],
        });

        const excelBuffer = await reportExporter.exportToExcel(reportData, 'overtime-analysis');

        await this.saveScheduledReport({
          report_type: 'overtime-analysis',
          report_date: lastWeekStart.toISOString().split('T')[0],
          file_data: excelBuffer,
          file_name: `overtime-analysis-week-${lastWeekStart.toISOString().split('T')[0]}.xlsx`,
          status: 'completed',
        });

        console.log('Weekly overtime report generated');
      } catch (error: any) {
        console.error('Error generating weekly overtime report:', error);
        await this.logScheduledReportError('overtime-analysis', error.message);
      }
    });

    this.scheduledTasks.set('weekly-overtime', task);
  }

  /**
   * License Expiry Report - Every Monday at 10:00 AM
   */
  private scheduleLicenseExpiryReport(): void {
    const task = cron.schedule('0 10 * * 1', async () => {
      try {
        console.log('Generating license expiry report...');
        
        const reportData = await reportGenerator.generateReport('license-expiry', {});

        // Only save if there are expiring licenses
        if (reportData.data.length > 0) {
          const excelBuffer = await reportExporter.exportToExcel(reportData, 'license-expiry');

          await this.saveScheduledReport({
            report_type: 'license-expiry',
            report_date: new Date().toISOString().split('T')[0],
            file_data: excelBuffer,
            file_name: `license-expiry-${new Date().toISOString().split('T')[0]}.xlsx`,
            status: 'completed',
          });

          console.log(`License expiry report generated - ${reportData.data.length} licenses expiring`);
        } else {
          console.log('No licenses expiring in next 90 days');
        }
      } catch (error: any) {
        console.error('Error generating license expiry report:', error);
        await this.logScheduledReportError('license-expiry', error.message);
      }
    });

    this.scheduledTasks.set('license-expiry', task);
  }

  /**
   * Save scheduled report to database
   */
  private async saveScheduledReport(reportInfo: {
    report_type: string;
    report_date: string;
    file_data: Buffer;
    file_name: string;
    status: string;
  }): Promise<void> {
    try {
      // Get organization ID
      const { data: org } = await this.supabase
        .from('organizations')
        .select('id')
        .limit(1)
        .single();

      if (!org) {
        throw new Error('Organization not found');
      }

      // Store report metadata (file data would typically go to storage)
      const { error } = await this.supabase
        .from('scheduled_reports')
        .insert({
          organization_id: org.id,
          report_type: reportInfo.report_type,
          report_date: reportInfo.report_date,
          file_name: reportInfo.file_name,
          file_size: reportInfo.file_data.length,
          status: reportInfo.status,
          generated_at: new Date().toISOString(),
          metadata: {
            record_count: 0,
          },
        });

      if (error) {
        console.error('Error saving scheduled report:', error);
      }

      // TODO: Upload file to Supabase Storage
      // const { data: uploadData, error: uploadError } = await this.supabase.storage
      //   .from('reports')
      //   .upload(reportInfo.file_name, reportInfo.file_data);
    } catch (error: any) {
      console.error('Error in saveScheduledReport:', error);
    }
  }

  /**
   * Log scheduled report error
   */
  private async logScheduledReportError(reportType: string, errorMessage: string): Promise<void> {
    try {
      const { data: org } = await this.supabase
        .from('organizations')
        .select('id')
        .limit(1)
        .single();

      if (org) {
        await this.supabase
          .from('scheduled_reports')
          .insert({
            organization_id: org.id,
            report_type: reportType,
            report_date: new Date().toISOString().split('T')[0],
            status: 'failed',
            generated_at: new Date().toISOString(),
            metadata: {
              error: errorMessage,
            },
          });
      }
    } catch (error: any) {
      console.error('Error logging scheduled report error:', error);
    }
  }

  /**
   * Stop all scheduled tasks
   */
  stopAll(): void {
    this.scheduledTasks.forEach((task, name) => {
      task.stop();
      console.log(`Stopped scheduled task: ${name}`);
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

  /**
   * Manually trigger a scheduled report
   */
  async triggerReport(reportType: string): Promise<void> {
    switch (reportType) {
      case 'daily-attendance':
        await this.scheduleDailyAttendanceReport();
        break;
      case 'monthly-payroll':
        await this.scheduleMonthlyPayrollReport();
        break;
      case 'weekly-overtime':
        await this.scheduleWeeklyOvertimeReport();
        break;
      case 'license-expiry':
        await this.scheduleLicenseExpiryReport();
        break;
      default:
        throw new Error(`Unknown scheduled report type: ${reportType}`);
    }
  }
}

// Export singleton instance
export const reportScheduler = new ReportScheduler();

// Initialize schedules when module is loaded (only in production)
if (process.env.NODE_ENV === 'production') {
  reportScheduler.initializeSchedules();
}
