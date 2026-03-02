# 💰 Automated Payroll Calculation System

Complete documentation for the automated payroll calculation engine.

---

## 📋 Overview

The Payroll Calculator is an automated service that processes employee attendance, overtime, allowances, and deductions to generate accurate payroll calculations.

**Location**: `src/services/payroll-calculator.ts`

---

## 🎯 Key Features

### **Automated Calculations**
- ✅ Base salary with pro-rata for new employees
- ✅ Housing, transport, and meal allowances
- ✅ Overtime pay (1.5x hourly rate)
- ✅ Night shift differential (50 SAR/shift)
- ✅ Hazard pay (50 SAR/shift)
- ✅ Bonuses integration
- ✅ Social security (9% of gross)
- ✅ Health insurance deductions
- ✅ Loan and advance deductions
- ✅ Absence and unpaid leave deductions

### **Edge Case Handling**
- ✅ New employees (pro-rata calculation)
- ✅ Terminated employees (final settlement)
- ✅ Unpaid leave deductions
- ✅ Overtime caps (max 60 hours/month)
- ✅ Negative salary validation

### **Validation & Warnings**
- ✅ Net salary < 0 → Error flag
- ✅ Net salary < 50% base → Warning
- ✅ Overtime > 40 hours → Warning
- ✅ Overtime > 60 hours → Capped & warned
- ✅ No attendance records → Warning

---

## 📊 Calculation Formulas

### **Gross Salary Components**

```typescript
// Base Salary (with pro-rata for new employees)
if (new_employee) {
  base_salary = base_salary × (worked_days / total_days_in_period)
}

// Allowances (from grade or employee metadata)
housing_allowance = employee.housing_allowance || grade.housing_allowance
transport_allowance = employee.transport_allowance || grade.transport_allowance
meal_allowance = employee.meal_allowance || grade.meal_allowance

// Overtime Pay (1.5x hourly rate)
hourly_rate = base_salary / 160  // 160 hours/month standard
overtime_hours = min(total_overtime_hours, 60)  // Cap at 60 hours
overtime_pay = overtime_hours × hourly_rate × 1.5

// Night Shift Pay
night_shift_pay = count(shift_type='night') × 50 SAR

// Hazard Pay
hazard_pay = count(is_hazard_shift=true) × 50 SAR

// Bonuses
bonuses = sum(approved_bonuses_for_period)

// Total Gross
gross_salary = base_salary + housing_allowance + transport_allowance + 
               meal_allowance + overtime_pay + night_shift_pay + 
               hazard_pay + bonuses
```

### **Deductions**

```typescript
// Social Security (9%)
social_security = gross_salary × 0.09

// Health Insurance (fixed monthly)
health_insurance = employee.health_insurance_amount

// Loan Deductions
loan_deduction = sum(active_loans.monthly_installment)

// Advance Deductions
advance_deduction = sum(pending_advances.deduction_amount)

// Absence Deduction
daily_rate = base_salary / 30
absent_days = count(status='ABSENT')
unpaid_leave_days = sum(unpaid_leaves.total_days)
absence_deduction = (absent_days + unpaid_leave_days) × daily_rate

// Total Deductions
total_deductions = social_security + health_insurance + 
                   loan_deduction + advance_deduction + 
                   absence_deduction
```

### **Net Salary**

```typescript
net_salary = gross_salary - total_deductions

// Validation
if (net_salary < 0) {
  status = 'review_required'
  error = 'Net salary is negative'
}

if (net_salary < base_salary × 0.5) {
  warning = 'Net salary less than 50% of base'
}
```

---

## 🔧 API Usage

### **Calculate Payroll for Entire Period**

**Endpoint**: `POST /api/hr/payroll/calculate`

**Request Body**:
```json
{
  "period_id": "period-uuid-123"
}
```

**Response**:
```json
{
  "data": {
    "period_id": "period-uuid-123",
    "total_employees": 75,
    "successful": 73,
    "failed": 2,
    "total_gross": 5625000.00,
    "total_deductions": 506250.00,
    "total_net": 5118750.00,
    "records": [
      {
        "employee_id": "emp-uuid",
        "gross_salary_breakdown": {
          "base_salary": 50000.00,
          "housing_allowance": 15000.00,
          "transport_allowance": 5000.00,
          "meal_allowance": 3000.00,
          "overtime_pay": 2250.00,
          "night_shift_pay": 150.00,
          "hazard_pay": 100.00,
          "bonuses": 1000.00,
          "gross_salary": 76500.00,
          "calculation_details": {
            "total_overtime_hours": 12,
            "night_shift_count": 3,
            "hazard_shift_count": 2,
            "worked_days": 22,
            "is_pro_rata": false
          }
        },
        "deductions_breakdown": {
          "social_security": 6885.00,
          "health_insurance": 500.00,
          "loan_deduction": 1000.00,
          "advance_deduction": 0.00,
          "absence_deduction": 0.00,
          "total_deductions": 8385.00,
          "calculation_details": {
            "absent_days": 0,
            "unpaid_leave_days": 0
          }
        },
        "net_salary": 68115.00,
        "payment_status": "pending",
        "warnings": [],
        "errors": []
      }
    ],
    "errors": [
      {
        "employee_id": "emp-uuid-2",
        "error": "No attendance records found"
      }
    ],
    "warnings": [
      {
        "employee_id": "emp-uuid-3",
        "warning": "EMP-2024-050 - High overtime hours: 45h"
      }
    ]
  }
}
```

### **Calculate for Specific Employees**

**Request Body**:
```json
{
  "period_id": "period-uuid-123",
  "employee_ids": [
    "emp-uuid-1",
    "emp-uuid-2"
  ]
}
```

---

## 💡 Usage Examples

### **Example 1: Regular Employee**

**Employee Data**:
- Base Salary: 50,000 SAR
- Housing Allowance: 15,000 SAR
- Transport Allowance: 5,000 SAR
- Worked Days: 22
- Overtime Hours: 10
- Night Shifts: 0
- Absent Days: 0

**Calculation**:
```
Gross Salary:
  Base: 50,000
  Housing: 15,000
  Transport: 5,000
  Overtime: 10h × (50,000/160) × 1.5 = 4,687.50
  Total Gross: 74,687.50

Deductions:
  Social Security: 74,687.50 × 0.09 = 6,721.88
  Health Insurance: 500.00
  Total Deductions: 7,221.88

Net Salary: 74,687.50 - 7,221.88 = 67,465.62
```

### **Example 2: New Employee (Pro-Rata)**

**Employee Data**:
- Base Salary: 60,000 SAR
- Hire Date: 15th of month (30 days)
- Worked Days: 16 days

**Calculation**:
```
Pro-Rata Base: 60,000 × (16/30) = 32,000
Housing: 18,000 × (16/30) = 9,600
Transport: 6,000 × (16/30) = 3,200

Total Gross: 44,800
Deductions: 44,800 × 0.09 + 500 = 4,532
Net Salary: 40,268
```

### **Example 3: Employee with Overtime & Night Shifts**

**Employee Data**:
- Base Salary: 40,000 SAR
- Overtime Hours: 25
- Night Shifts: 5
- Hazard Shifts: 3

**Calculation**:
```
Gross Salary:
  Base: 40,000
  Allowances: 12,000
  Overtime: 25h × (40,000/160) × 1.5 = 9,375
  Night Shift: 5 × 50 = 250
  Hazard Pay: 3 × 50 = 150
  Total Gross: 61,775

Deductions:
  Social Security: 5,559.75
  Health Insurance: 500
  Total: 6,059.75

Net Salary: 55,715.25
```

### **Example 4: Employee with Absences**

**Employee Data**:
- Base Salary: 45,000 SAR
- Absent Days: 3
- Unpaid Leave: 2 days

**Calculation**:
```
Daily Rate: 45,000 / 30 = 1,500

Gross Salary: 45,000 + 13,500 = 58,500

Deductions:
  Social Security: 5,265
  Health Insurance: 500
  Absence: (3 + 2) × 1,500 = 7,500
  Total: 13,265

Net Salary: 45,235
```

---

## ⚠️ Edge Cases & Validations

### **1. New Employee (Pro-Rata)**
```typescript
if (hire_date > period_start_date) {
  worked_days = days_from_hire_to_period_end
  total_days = days_in_period
  pro_rata_salary = base_salary × (worked_days / total_days)
}
```

### **2. Terminated Employee**
```typescript
if (termination_date < period_end_date) {
  worked_days = days_from_period_start_to_termination
  total_days = days_in_period
  final_salary = base_salary × (worked_days / total_days)
  // Add any end-of-service benefits
}
```

### **3. Overtime Cap**
```typescript
if (overtime_hours > 60) {
  warning = 'Overtime exceeded 60 hours - capped'
  overtime_hours = 60
}

if (overtime_hours > 40) {
  warning = 'High overtime hours detected'
}
```

### **4. Negative Net Salary**
```typescript
if (net_salary < 0) {
  status = 'review_required'
  error = 'Net salary is negative - requires manual review'
}
```

### **5. Low Net Salary**
```typescript
if (net_salary < base_salary × 0.5) {
  warning = `Net salary is ${percentage}% of base - investigate`
}
```

### **6. No Attendance Data**
```typescript
if (worked_days === 0) {
  warning = 'No attendance records found for period'
  // Still calculate base salary + allowances
}
```

---

## 🔄 Integration Points

### **Data Sources**

1. **Employees Table**
   - `base_salary`
   - `salary_grade`
   - `hire_date`
   - `termination_date`
   - `metadata.housing_allowance`
   - `metadata.health_insurance_amount`

2. **Attendance Records**
   - `attendance_date`
   - `total_hours`
   - `overtime_hours`
   - `status` (PRESENT, ABSENT)
   - `metadata.shift_type` (day, night)
   - `metadata.is_hazard_shift`

3. **Leave Requests**
   - `start_date`, `end_date`
   - `total_days`
   - `status` (APPROVED)
   - `metadata.leave_type` (paid, unpaid)

4. **Employee Loans**
   - `monthly_installment`
   - `status` (active)
   - `end_date`

5. **Employee Advances**
   - `deduction_amount`
   - `status` (pending_deduction)
   - `deduction_date`

6. **Employee Bonuses**
   - `amount`
   - `period_id`
   - `status` (approved)

### **Output Destination**

**Payroll Transactions Table**:
```sql
INSERT INTO payroll_transactions (
  period_id,
  employee_id,
  basic_salary,
  allowances,
  overtime_pay,
  bonus,
  deductions,
  gross_salary,
  net_salary,
  status,
  metadata
)
```

---

## 📝 Service Methods

### **1. calculateGrossSalary(employeeId, periodId)**

**Returns**: `GrossSalaryBreakdown`

```typescript
{
  base_salary: number,
  housing_allowance: number,
  transport_allowance: number,
  meal_allowance: number,
  overtime_pay: number,
  night_shift_pay: number,
  hazard_pay: number,
  bonuses: number,
  gross_salary: number,
  calculation_details: {
    total_overtime_hours: number,
    night_shift_count: number,
    hazard_shift_count: number,
    worked_days: number,
    is_pro_rata: boolean
  }
}
```

### **2. calculateDeductions(employeeId, grossSalary, periodId)**

**Returns**: `DeductionsBreakdown`

```typescript
{
  social_security: number,
  health_insurance: number,
  loan_deduction: number,
  advance_deduction: number,
  absence_deduction: number,
  total_deductions: number,
  calculation_details: {
    absent_days: number,
    unpaid_leave_days: number
  }
}
```

### **3. calculateNetSalary(employeeId, periodId)**

**Returns**: `PayrollRecord`

```typescript
{
  employee_id: string,
  period_id: string,
  gross_salary_breakdown: GrossSalaryBreakdown,
  deductions_breakdown: DeductionsBreakdown,
  net_salary: number,
  payment_status: string,
  warnings: string[],
  errors: string[],
  calculated_at: string
}
```

### **4. processPayrollForPeriod(periodId)**

**Returns**: `PayrollProcessingResult`

```typescript
{
  period_id: string,
  total_employees: number,
  successful: number,
  failed: number,
  total_gross: number,
  total_deductions: number,
  total_net: number,
  records: PayrollRecord[],
  errors: Array<{ employee_id: string, error: string }>,
  warnings: Array<{ employee_id: string, warning: string }>
}
```

---

## 🚀 Getting Started

### **1. Import the Service**

```typescript
import { payrollCalculator } from '@/services/payroll-calculator';
```

### **2. Calculate for Single Employee**

```typescript
const payroll = await payrollCalculator.calculateNetSalary(
  'employee-uuid',
  'period-uuid'
);

console.log(`Net Salary: ${payroll.net_salary}`);
console.log(`Warnings: ${payroll.warnings.join(', ')}`);
```

### **3. Process Entire Period**

```typescript
const result = await payrollCalculator.processPayrollForPeriod('period-uuid');

console.log(`Processed: ${result.successful}/${result.total_employees}`);
console.log(`Total Payroll: ${result.total_net}`);
```

### **4. Via API**

```bash
curl -X POST http://localhost:3000/api/hr/payroll/calculate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"period_id": "period-uuid-123"}'
```

---

## ✅ Testing Checklist

- [ ] Regular employee calculation
- [ ] New employee pro-rata calculation
- [ ] Terminated employee final settlement
- [ ] Overtime calculation (< 40h, 40-60h, > 60h)
- [ ] Night shift differential
- [ ] Hazard pay calculation
- [ ] Social security deduction (9%)
- [ ] Loan deductions
- [ ] Advance deductions
- [ ] Absence deductions
- [ ] Unpaid leave deductions
- [ ] Negative salary validation
- [ ] Low salary warning
- [ ] No attendance warning
- [ ] Batch processing for period
- [ ] Error handling for missing data

---

## 🔐 Security & Permissions

**Required Role**: `hr_manager` or `admin`

**Audit Logging**: All payroll calculations are logged with:
- User ID who triggered calculation
- Period ID
- Number of employees processed
- Total amounts calculated
- Timestamp

---

## 📊 Performance Considerations

- **Batch Processing**: Processes employees sequentially to avoid database overload
- **Caching**: Consider caching period data for multiple employee calculations
- **Optimization**: Use database indexes on `employee_id`, `period_id`, `attendance_date`
- **Async Processing**: For large organizations (>1000 employees), consider queue-based processing

---

## 🔄 Future Enhancements

- [ ] Tax calculations (income tax brackets)
- [ ] End-of-service benefits calculation
- [ ] Multiple currency support
- [ ] Payroll comparison (month-over-month)
- [ ] Automated payslip generation (PDF)
- [ ] Bank file generation for direct deposits
- [ ] Email notifications to employees
- [ ] Payroll approval workflow
- [ ] Payroll reversal functionality
- [ ] Historical payroll reports

---

**Last Updated**: 2024-02-28  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
