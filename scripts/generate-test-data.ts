/**
 * Test Data Generator
 * Generates realistic test data for development and testing
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  position: string;
  department_id: string;
  base_salary: number;
  hire_date: Date;
  status: string;
  metadata: Record<string, any>;
}

interface AttendanceRecord {
  employee_id: string;
  attendance_date: string;
  check_in: string;
  check_out: string;
  status: string;
  overtime_hours: number;
  shift_type: string;
  is_hazard_shift: boolean;
}

interface LeaveRequest {
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: string;
}

class TestDataGenerator {
  private supabase;
  private departments: any[] = [];

  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async generateAllTestData(): Promise<void> {
    console.log('🚀 Starting test data generation...');
    
    try {
      await this.generateDepartments();
      await this.generateEmployees(100);
      await this.generateAttendanceRecords(30);
      await this.generateLeaveRequests(50);
      await this.generatePayrollPeriod();
      
      console.log('✅ Test data generation completed!');
    } catch (error: any) {
      console.error('❌ Test data generation failed:', error.message);
      throw error;
    }
  }

  private async generateDepartments(): Promise<void> {
    console.log('📁 Generating departments...');
    
    const departments = [
      { name: 'Intensive Care Unit', code: 'ICU', type: 'department', metadata: { is_hazardous: true } },
      { name: 'Emergency Room', code: 'ER', type: 'department', metadata: { is_hazardous: true } },
      { name: 'General Ward', code: 'GW', type: 'department' },
      { name: 'Pediatrics', code: 'PED', type: 'department' },
      { name: 'Surgery', code: 'SURG', type: 'department' },
      { name: 'Radiology', code: 'RAD', type: 'department' },
      { name: 'Laboratory', code: 'LAB', type: 'department' },
      { name: 'Pharmacy', code: 'PHARM', type: 'department' },
      { name: 'Administration', code: 'ADMIN', type: 'department' },
      { name: 'Human Resources', code: 'HR', type: 'department' },
    ];

    for (const dept of departments) {
      const { error } = await this.supabase
        .from('departments')
        .upsert(dept, { onConflict: 'code' });

      if (error) throw error;
    }

    // Fetch departments for later use
    const { data } = await this.supabase
      .from('departments')
      .select('*')
      .eq('type', 'department');

    this.departments = data || [];
    console.log(`✅ Generated ${this.departments.length} departments`);
  }

  private async generateEmployees(count: number): Promise<void> {
    console.log(`👥 Generating ${count} employees...`);
    
    const positions = [
      'Doctor', 'Nurse', 'Technician', 'Administrator', 'HR Manager',
      'Pharmacist', 'Lab Technician', 'Radiologist', 'Surgeon', 'Anesthesiologist'
    ];

    const firstNames = [
      'Ahmed', 'Mohammed', 'Sara', 'Fatima', 'Omar', 'Aisha', 'Ali', 'Khadija',
      'Yusuf', 'Maryam', 'Ibrahim', 'Zainab', 'Abdullah', 'Hana', 'Khalid'
    ];

    const lastNames = [
      'Al-Rashid', 'Al-Saud', 'Al-Qasimi', 'Al-Maktoum', 'Al-Nahyan',
      'Al-Thani', 'Al-Khalifa', 'Al-Sabah', 'Al-Hamed', 'Al-Mansour'
    ];

    for (let i = 0; i < count; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const position = positions[Math.floor(Math.random() * positions.length)];
      const department = this.departments[Math.floor(Math.random() * this.departments.length)];
      
      const baseSalary = this.getRandomSalary(position);
      const hireDate = this.getRandomDate();
      
      const employee: Partial<Employee> = {
        employee_number: `EMP${String(i + 1).padStart(4, '0')}`,
        first_name: firstName,
        last_name: lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@tibbna.com`,
        phone: `+96650${Math.floor(Math.random() * 90000000) + 10000000}`,
        position,
        department_id: department.id,
        base_salary: baseSalary,
        hire_date: hireDate,
        status: 'active',
        metadata: {
          licenses: this.generateLicenses(position),
          bank_account: `SA442000000000${String(i + 1).padStart(10, '0')}`,
          address: {
            street: `${Math.floor(Math.random() * 999) + 1} King Fahd Road`,
            city: 'Riyadh',
            postal_code: String(Math.floor(Math.random() * 90000) + 10000),
          },
        },
      };

      const { error } = await this.supabase
        .from('employees')
        .upsert(employee, { onConflict: 'employee_number' });

      if (error) throw error;
    }

    console.log(`✅ Generated ${count} employees`);
  }

  private async generateAttendanceRecords(days: number): Promise<void> {
    console.log(`📅 Generating ${days} days of attendance records...`);
    
    const { data: employees } = await this.supabase
      .from('employees')
      .select('id, employee_number, metadata')
      .eq('status', 'active')
      .limit(100);

    if (!employees) return;

    for (let dayOffset = 0; dayOffset < days; dayOffset++) {
      const date = new Date();
      date.setDate(date.getDate() - dayOffset);
      const dateStr = date.toISOString().split('T')[0];

      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      for (const employee of employees) {
        const attendance = this.generateAttendanceRecord(employee.id, dateStr, employee.metadata);
        
        const { error } = await this.supabase
          .from('attendance_records')
          .upsert(attendance, { onConflict: ['employee_id', 'attendance_date'] });

        if (error) throw error;
      }
    }

    console.log(`✅ Generated attendance records for ${employees.length} employees over ${days} days`);
  }

  private async generateLeaveRequests(count: number): Promise<void> {
    console.log(`🏖️ Generating ${count} leave requests...`);
    
    const { data: employees } = await this.supabase
      .from('employees')
      .select('id, employee_number')
      .eq('status', 'active')
      .limit(100);

    if (!employees) return;

    const leaveTypes = ['annual', 'sick', 'emergency', 'maternity', 'paternity'];
    const reasons = [
      'Family emergency', 'Medical appointment', 'Personal reasons',
      'Vacation', 'Child care', 'Family event', 'Health reasons'
    ];

    for (let i = 0; i < count; i++) {
      const employee = employees[Math.floor(Math.random() * employees.length)];
      const leaveType = leaveTypes[Math.floor(Math.random() * leaveTypes.length)];
      const reason = reasons[Math.floor(Math.random() * reasons.length)];
      
      const startDate = this.getRandomDate();
      const totalDays = Math.floor(Math.random() * 10) + 1;
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + totalDays - 1);

      const leaveRequest: Partial<LeaveRequest> = {
        employee_id: employee.id,
        leave_type: leaveType,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        total_days,
        reason,
        status: Math.random() > 0.3 ? 'approved' : 'pending',
        metadata: {
          has_medical_certificate: leaveType === 'sick' && Math.random() > 0.5,
        },
      };

      const { error } = await this.supabase
        .from('leave_requests')
        .upsert(leaveRequest);

      if (error) throw error;
    }

    console.log(`✅ Generated ${count} leave requests`);
  }

  private async generatePayrollPeriod(): Promise<void> {
    console.log('💰 Generating payroll period...');
    
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const payrollPeriod = {
      name: `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      status: 'active',
      metadata: {
        processed_date: null,
        total_employees: 0,
        total_payroll: 0,
      },
    };

    const { error } = await this.supabase
      .from('payroll_periods')
      .upsert(payrollPeriod, { onConflict: 'name' });

    if (error) throw error;
    
    console.log('✅ Generated payroll period');
  }

  private generateAttendanceRecord(employeeId: string, date: string, metadata: any): AttendanceRecord {
    const random = Math.random();
    
    // 5% chance of absence
    if (random < 0.05) {
      return {
        employee_id,
        attendance_date: date,
        check_in: null,
        check_out: null,
        status: 'ABSENT',
        overtime_hours: 0,
        shift_type: 'day',
        is_hazard_shift: false,
      };
    }

    // 10% chance of late
    const isLate = random < 0.15;
    const checkInHour = isLate ? '08:' + String(Math.floor(Math.random() * 30) + 15).padStart(2, '0') : '08:00';
    
    // Check out time
    const checkOutHour = '17:' + String(Math.floor(Math.random() * 30)).padStart(2, '0');
    
    // Overtime (20% chance)
    const overtimeHours = random < 0.2 ? Math.floor(Math.random() * 4) + 1 : 0;
    
    // Shift type
    const shiftTypes = ['day', 'evening', 'night'];
    const shiftType = shiftTypes[Math.floor(Math.random() * shiftTypes.length)];
    
    // Hazard shift (15% chance)
    const isHazardShift = random < 0.15;

    return {
      employee_id,
      attendance_date: date,
      check_in: checkInHour,
      check_out: checkOutHour,
      status: isLate ? 'LATE' : 'PRESENT',
      overtime_hours,
      shift_type: shiftType,
      is_hazard_shift: isHazardShift,
    };
  }

  private generateLicenses(position: string): Array<any> {
    const licenses = [];
    
    if (position === 'Doctor' || position === 'Surgeon') {
      licenses.push({
        type: 'Medical License',
        number: `ML${Math.floor(Math.random() * 900000) + 100000}`,
        expiry_date: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        issuing_authority: 'SCFHS',
      });
    }
    
    if (position === 'Nurse') {
      licenses.push({
        type: 'Nursing License',
        number: `NL${Math.floor(Math.random() * 900000) + 100000}`,
        expiry_date: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        issuing_authority: 'SCFHS',
      });
    }
    
    return licenses;
  }

  private getRandomSalary(position: string): number {
    const salaryRanges: Record<string, [number, number]> = {
      'Doctor': [15000, 25000],
      'Surgeon': [20000, 35000],
      'Nurse': [8000, 15000],
      'Technician': [6000, 10000],
      'Administrator': [7000, 12000],
      'HR Manager': [12000, 20000],
      'Pharmacist': [10000, 18000],
      'Lab Technician': [6000, 9000],
      'Radiologist': [15000, 25000],
      'Anesthesiologist': [18000, 30000],
    };

    const range = salaryRanges[position] || [6000, 12000];
    return Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
  }

  private getRandomDate(): Date {
    const days = Math.floor(Math.random() * 365 * 3); // Up to 3 years ago
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }
}

// Main execution
async function main() {
  const generator = new TestDataGenerator();
  await generator.generateAllTestData();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { TestDataGenerator };
