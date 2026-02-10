'use client';

import employeesJson from '@/data/hr/employees.json';
import departmentsJson from '@/data/hr/departments.json';
import attendanceJson from '@/data/hr/attendance.json';
import leavesJson from '@/data/hr/leaves.json';
import payrollJson from '@/data/hr/payroll.json';
import recruitmentJson from '@/data/hr/candidates.json';
import trainingJson from '@/data/hr/training.json';
import performanceJson from '@/data/hr/performance.json';
import benefitsJson from '@/data/hr/benefits.json';

import type {
  Employee,
  Department,
  AttendanceTransaction,
  AttendanceException,
  DailyAttendanceSummary,
  LeaveRequest,
  LeaveBalance,
  PayrollTransaction,
  PayrollPeriod,
  Loan,
  Candidate,
  JobVacancy,
  TrainingProgram,
  TrainingSession,
  PerformanceReview,
  BenefitPlan,
  BenefitEnrollment,
} from '@/types/hr';

// =============================================================================
// TYPES
// =============================================================================

interface HRDataStore {
  employees: Employee[];
  departments: Department[];
  attendance: typeof attendanceJson;
  leaves: typeof leavesJson;
  payroll: typeof payrollJson;
  recruitment: typeof recruitmentJson;
  training: typeof trainingJson;
  performance: typeof performanceJson;
  benefits: typeof benefitsJson;
  version: number;
  lastUpdated: string;
}

// =============================================================================
// DATA STORE CLASS
// =============================================================================

class DataStore {
  private STORAGE_KEY = 'tibbna_hr_data';

  /** Initialize store with default JSON data if not already present */
  initialize(): void {
    if (typeof window === 'undefined') return;

    const existing = localStorage.getItem(this.STORAGE_KEY);

    if (!existing) {
      const initialData: HRDataStore = {
        employees: employeesJson.employees as unknown as Employee[],
        departments: departmentsJson.departments as unknown as Department[],
        attendance: attendanceJson,
        leaves: leavesJson,
        payroll: payrollJson,
        recruitment: recruitmentJson,
        training: trainingJson,
        performance: performanceJson,
        benefits: benefitsJson,
        version: 1,
        lastUpdated: new Date().toISOString(),
      };

      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(initialData));
        console.log('✅ Data store initialized with default data');
      } catch (err) {
        console.error('❌ Failed to initialize data store:', err);
      }
    }
  }

  // ===========================================================================
  // GENERIC HELPERS
  // ===========================================================================

  private getData(): HRDataStore | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private saveData(data: HRDataStore): boolean {
    try {
      data.lastUpdated = new Date().toISOString();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (err) {
      console.error('❌ Failed to save data store:', err);
      return false;
    }
  }

  private updateSection<K extends keyof HRDataStore>(section: K, value: HRDataStore[K]): boolean {
    const store = this.getData();
    if (!store) return false;
    store[section] = value;
    return this.saveData(store);
  }

  // ===========================================================================
  // EMPLOYEES
  // ===========================================================================

  getEmployees(): Employee[] {
    return this.getData()?.employees ?? (employeesJson.employees as unknown as Employee[]);
  }

  getEmployee(id: string): Employee | undefined {
    return this.getEmployees().find(e => e.id === id);
  }

  addEmployee(employee: Employee): boolean {
    const list = this.getEmployees();
    list.push(employee);
    return this.updateSection('employees', list);
  }

  updateEmployee(id: string, updates: Partial<Employee>): boolean {
    const list = this.getEmployees();
    const idx = list.findIndex(e => e.id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...updates };
    return this.updateSection('employees', list);
  }

  deleteEmployee(id: string): boolean {
    const list = this.getEmployees().filter(e => e.id !== id);
    return this.updateSection('employees', list);
  }

  // ===========================================================================
  // DEPARTMENTS
  // ===========================================================================

  getDepartments(): Department[] {
    return this.getData()?.departments ?? (departmentsJson.departments as unknown as Department[]);
  }

  getDepartment(id: string): Department | undefined {
    return this.getDepartments().find(d => d.id === id);
  }

  addDepartment(dept: Department): boolean {
    const data = this.getData();
    if (!data) return false;
    const list = [...this.getDepartments(), dept];
    return this.updateSection('departments', list);
  }

  updateDepartment(id: string, updates: Partial<Department>): boolean {
    const data = this.getData();
    if (!data) return false;
    const list = this.getDepartments();
    const idx = list.findIndex(d => d.id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...updates };
    return this.updateSection('departments', list);
  }

  deleteDepartment(id: string): boolean {
    const data = this.getData();
    if (!data) return false;
    const list = this.getDepartments().filter(d => d.id !== id);
    return this.updateSection('departments', list);
  }

  // ===========================================================================
  // ATTENDANCE
  // ===========================================================================

  getDailySummaries(): DailyAttendanceSummary[] {
    const data = this.getData();
    return (data?.attendance?.daily_summaries ?? attendanceJson.daily_summaries) as unknown as DailyAttendanceSummary[];
  }

  getAttendanceTransactions(): AttendanceTransaction[] {
    const data = this.getData();
    return ((data?.attendance as any)?.transactions ?? []) as AttendanceTransaction[];
  }

  addAttendanceTransaction(txn: AttendanceTransaction): boolean {
    const data = this.getData();
    if (!data?.attendance) return false;
    const att = data.attendance as any;
    if (!att.transactions) att.transactions = [];
    att.transactions.push(txn);
    return this.updateSection('attendance', data.attendance);
  }

  getAttendanceExceptions(): AttendanceException[] {
    const data = this.getData();
    return ((data?.attendance as any)?.exceptions ?? []) as AttendanceException[];
  }

  addAttendanceException(exc: AttendanceException): boolean {
    const data = this.getData();
    if (!data?.attendance) return false;
    const att = data.attendance as any;
    if (!att.exceptions) att.exceptions = [];
    att.exceptions.push(exc);
    return this.updateSection('attendance', data.attendance);
  }

  updateAttendanceException(exceptionId: string, updates: Partial<AttendanceException>): boolean {
    const data = this.getData();
    if (!data?.attendance) return false;
    const att = data.attendance as any;
    if (!att.exceptions) return false;
    const idx = (att.exceptions as AttendanceException[]).findIndex(e => e.exception_id === exceptionId);
    if (idx === -1) return false;
    att.exceptions[idx] = { ...att.exceptions[idx], ...updates };
    return this.updateSection('attendance', data.attendance);
  }

  deleteAttendanceException(exceptionId: string): boolean {
    const data = this.getData();
    if (!data?.attendance) return false;
    const att = data.attendance as any;
    if (!att.exceptions) return false;
    att.exceptions = (att.exceptions as AttendanceException[]).filter(e => e.exception_id !== exceptionId);
    return this.updateSection('attendance', data.attendance);
  }

  // ---------------------------------------------------------------------------
  // Processed Daily Summaries (generated by processing engine)
  // ---------------------------------------------------------------------------

  getProcessedSummaries(): DailyAttendanceSummary[] {
    const data = this.getData();
    return ((data?.attendance as any)?.processed_summaries ?? []) as DailyAttendanceSummary[];
  }

  batchAddProcessedSummaries(summaries: DailyAttendanceSummary[]): boolean {
    const data = this.getData();
    if (!data?.attendance) return false;
    const att = data.attendance as any;
    if (!att.processed_summaries) att.processed_summaries = [];
    att.processed_summaries.push(...summaries);
    return this.updateSection('attendance', data.attendance);
  }

  deleteProcessedSummariesByDate(date: string): number {
    const data = this.getData();
    if (!data?.attendance) return 0;
    const att = data.attendance as any;
    if (!att.processed_summaries) return 0;
    const before = att.processed_summaries.length;
    att.processed_summaries = (att.processed_summaries as DailyAttendanceSummary[]).filter(s => s.date !== date);
    this.updateSection('attendance', data.attendance);
    return before - att.processed_summaries.length;
  }

  // ===========================================================================
  // LEAVES
  // ===========================================================================

  getLeaveRequests(): LeaveRequest[] {
    const data = this.getData();
    return (data?.leaves?.leave_requests ?? leavesJson.leave_requests) as unknown as LeaveRequest[];
  }

  getLeaveRequest(id: string): LeaveRequest | undefined {
    return this.getLeaveRequests().find(r => r.id === id);
  }

  addLeaveRequest(request: LeaveRequest): boolean {
    const data = this.getData();
    if (!data?.leaves) return false;
    const requests = data.leaves.leave_requests as unknown as LeaveRequest[];
    requests.push(request);
    return this.updateSection('leaves', data.leaves);
  }

  updateLeaveRequest(id: string, updates: Partial<LeaveRequest>): boolean {
    const data = this.getData();
    if (!data?.leaves) return false;
    const requests = data.leaves.leave_requests as unknown as LeaveRequest[];
    const idx = requests.findIndex(r => r.id === id);
    if (idx === -1) return false;
    requests[idx] = { ...requests[idx], ...updates };
    return this.updateSection('leaves', data.leaves);
  }

  getLeaveBalances(): LeaveBalance[] {
    const data = this.getData();
    return (data?.leaves?.leave_balances ?? leavesJson.leave_balances) as unknown as LeaveBalance[];
  }

  // Get raw leave balance object for an employee (nested: annual/sick/emergency)
  getRawLeaveBalance(employeeId: string): any | null {
    const balances = this.getLeaveBalances() as any[];
    return balances.find((b: any) => b.employee_id === employeeId) ?? null;
  }

  // Update a specific leave-type bucket inside the nested balance object
  updateLeaveBalanceByType(employeeId: string, typeKey: string, updates: Record<string, number>): boolean {
    const data = this.getData();
    if (!data?.leaves?.leave_balances) return false;
    const arr = data.leaves.leave_balances as any[];
    const idx = arr.findIndex((b: any) => b.employee_id === employeeId);
    if (idx === -1) return false;
    if (!arr[idx][typeKey]) arr[idx][typeKey] = {};
    arr[idx][typeKey] = { ...arr[idx][typeKey], ...updates };
    return this.updateSection('leaves', data.leaves);
  }

  // ===========================================================================
  // PAYROLL
  // ===========================================================================

  getPayrollPeriods(): PayrollPeriod[] {
    const data = this.getData();
    return (data?.payroll?.payroll_periods ?? payrollJson.payroll_periods) as unknown as PayrollPeriod[];
  }

  getLoans(): Loan[] {
    const data = this.getData();
    return (data?.payroll?.loans ?? payrollJson.loans) as unknown as Loan[];
  }

  // ===========================================================================
  // RECRUITMENT
  // ===========================================================================

  getVacancies(): JobVacancy[] {
    const data = this.getData();
    return (data?.recruitment?.vacancies ?? recruitmentJson.vacancies) as unknown as JobVacancy[];
  }

  getCandidates(): Candidate[] {
    const data = this.getData();
    return (data?.recruitment?.candidates ?? recruitmentJson.candidates) as unknown as Candidate[];
  }

  // ===========================================================================
  // TRAINING
  // ===========================================================================

  getTrainingPrograms(): TrainingProgram[] {
    const data = this.getData();
    return (data?.training?.programs ?? trainingJson.programs) as unknown as TrainingProgram[];
  }

  getTrainingSessions(): TrainingSession[] {
    const data = this.getData();
    return (data?.training?.sessions ?? trainingJson.sessions) as unknown as TrainingSession[];
  }

  // ===========================================================================
  // PERFORMANCE
  // ===========================================================================

  getPerformanceReviews(): PerformanceReview[] {
    const data = this.getData();
    return (data?.performance?.reviews ?? performanceJson.reviews) as unknown as PerformanceReview[];
  }

  // ===========================================================================
  // BENEFITS
  // ===========================================================================

  getBenefitPlans(): BenefitPlan[] {
    const data = this.getData();
    return (data?.benefits?.benefit_plans ?? benefitsJson.benefit_plans) as unknown as BenefitPlan[];
  }

  getBenefitPlan(id: string): BenefitPlan | undefined {
    return this.getBenefitPlans().find(p => p.id === id);
  }

  addBenefitPlan(plan: BenefitPlan): boolean {
    const data = this.getData();
    if (!data?.benefits) return false;
    const list = [...this.getBenefitPlans(), plan];
    data.benefits.benefit_plans = list as any;
    return this.saveData(data);
  }

  updateBenefitPlan(id: string, updates: Partial<BenefitPlan>): boolean {
    const data = this.getData();
    if (!data?.benefits) return false;
    const list = this.getBenefitPlans();
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...updates };
    data.benefits.benefit_plans = list as any;
    return this.saveData(data);
  }

  deleteBenefitPlan(id: string): boolean {
    const data = this.getData();
    if (!data?.benefits) return false;
    data.benefits.benefit_plans = this.getBenefitPlans().filter(p => p.id !== id) as any;
    return this.saveData(data);
  }

  getBenefitEnrollments(): BenefitEnrollment[] {
    const data = this.getData();
    return (data?.benefits?.enrollments ?? benefitsJson.enrollments) as unknown as BenefitEnrollment[];
  }

  getBenefitEnrollment(id: string): BenefitEnrollment | undefined {
    return this.getBenefitEnrollments().find(e => e.id === id);
  }

  getEmployeeBenefitEnrollments(employeeId: string): BenefitEnrollment[] {
    return this.getBenefitEnrollments().filter(e => e.employee_id === employeeId);
  }

  addBenefitEnrollment(enrollment: BenefitEnrollment): boolean {
    const data = this.getData();
    if (!data?.benefits) return false;
    const list = [...this.getBenefitEnrollments(), enrollment];
    data.benefits.enrollments = list as any;
    return this.saveData(data);
  }

  updateBenefitEnrollment(id: string, updates: Partial<BenefitEnrollment>): boolean {
    const data = this.getData();
    if (!data?.benefits) return false;
    const list = this.getBenefitEnrollments();
    const idx = list.findIndex(e => e.id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...updates };
    data.benefits.enrollments = list as any;
    return this.saveData(data);
  }

  deleteBenefitEnrollment(id: string): boolean {
    const data = this.getData();
    if (!data?.benefits) return false;
    data.benefits.enrollments = this.getBenefitEnrollments().filter(e => e.id !== id) as any;
    return this.saveData(data);
  }

  // ===========================================================================
  // UTILITY
  // ===========================================================================

  /** Reset store to default JSON data */
  reset(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.initialize();
    console.log('✅ Data store reset to defaults');
  }

  /** Export all data as JSON */
  exportData(): HRDataStore | null {
    return this.getData();
  }

  /** Import data from JSON */
  importData(data: HRDataStore): boolean {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      console.log('✅ Data imported successfully');
      return true;
    } catch {
      return false;
    }
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const dataStore = new DataStore();

// Auto-initialize on client
if (typeof window !== 'undefined') {
  dataStore.initialize();
}
