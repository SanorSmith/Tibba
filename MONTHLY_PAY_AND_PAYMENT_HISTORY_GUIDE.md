# 💰 Monthly Pay & Payment History - Complete Guide

## 📍 **Where Monthly Pay is Determined**

### **1. Employee Compensation Setup**
**Location:** `/staff/compensation` (Employee View) or `/hr/employees/[id]` (HR View)

**What's Configured:**
- ✅ **Basic Salary** - Monthly base pay amount
- ✅ **Housing Allowance** - Monthly housing benefit
- ✅ **Transport Allowance** - Monthly transport benefit
- ✅ **Meal Allowance** - Monthly meal benefit
- ✅ **Salary Grade** - Pay scale level
- ✅ **Effective Date** - When compensation starts

**Database Table:** `employee_compensation`
```sql
SELECT employee_id, basic_salary, housing_allowance, transport_allowance, 
       meal_allowance, salary_grade, effective_from
FROM employee_compensation;
```

---

### **2. Payroll Calculation Engine**
**Location:** `src/lib/services/payroll-calculation-engine.ts`

**Monthly Pay Calculation Process:**
```javascript
// Step 1: Base Monthly Compensation
const monthlyBase = basic_salary + housing_allowance + transport_allowance + meal_allowance;

// Step 2: Attendance-Based Adjustments
const attendanceBonus = calculateOvertime(overtime_hours) + calculateNightShift(night_shifts);
const attendancePenalty = calculateAbsenceDeductions(absent_days);

// Step 3: Deductions
const socialSecurity = calculateSocialSecurity(gross_salary);
const healthInsurance = calculateHealthInsurance(gross_salary);
const loanDeductions = getMonthlyLoanInstallments(employee_id);
const advanceDeductions = getAdvanceDeductions(employee_id);

// Step 4: Final Monthly Net Pay
const netSalary = monthlyBase + attendanceBonus - attendancePenalty - allDeductions;
```

**Factors Affecting Monthly Pay:**
- ✅ **Base compensation** (fixed monthly)
- ✅ **Attendance** (overtime, night shifts, absences)
- ✅ **Leave deductions** (unpaid leave)
- ✅ **Loan installments** (monthly deductions)
- ✅ **Salary advances** (monthly recovery)
- ✅ **Social security** (percentage-based)
- ✅ **Health insurance** (fixed/percentage)
- ✅ **Income tax** (progressive calculation)

---

### **3. Payroll Periods Management**
**Location:** `/hr/payroll` (HR Dashboard)

**What's Determined:**
- ✅ **Pay Period** - Monthly date ranges (e.g., March 1-31)
- ✅ **Payment Date** - When salaries are paid
- ✅ **Calculation Status** - DRAFT → CALCULATED → APPROVED → PAID
- ✅ **Employee Count** - Number of staff in period
- ✅ **Total Payroll** - Gross and net totals for period

**Database Table:** `payroll_periods`
```sql
SELECT period_name, start_date, end_date, payment_date, status,
       total_employees, total_gross, total_net
FROM payroll_periods;
```

---

## 📊 **Where Payment History is Shown**

### **1. Employee Payslips (Individual View)**
**Location:** `/staff/payslips` (Employee Self-Service)

**What Employees See:**
- ✅ **Payment History** - All past payslips by month
- ✅ **Period Details** - Pay period dates and status
- ✅ **Earnings Breakdown** - Basic + allowances + overtime
- ✅ **Deductions Breakdown** - All monthly deductions
- ✅ **Net Salary** - Final take-home pay
- ✅ **Yearly Filtering** - View by specific year

**API Endpoint:** `/api/hr/payroll/transactions?employee_id={id}`
```javascript
// Sample payslip data
{
  payslip_number: "P2026-03-001",
  period_name: "March 2026",
  basic_salary: 5000,
  housing_allowance: 500,
  transport_allowance: 200,
  overtime_pay: 150,
  gross_salary: 5850,
  social_security: 175.50,
  loan_deduction: 200,
  net_salary: 5474.50
}
```

### **2. Payroll Dashboard (HR View)**
**Location:** `/hr/payroll` (HR Management)

**What HR Managers See:**
- ✅ **All Payroll Periods** - Historical and current
- ✅ **Period Transactions** - All employee payments for selected period
- ✅ **Employee Breakdown** - Individual payment details
- ✅ **Department Totals** - Payroll by department
- ✅ **Status Tracking** - Calculation and approval status

**Features:**
- ✅ **Filter by Period** - Select any payroll period
- ✅ **View All Employees** - Complete payment breakdown
- ✅ **Export Reports** - Download payment histories
- ✅ **Process Payroll** - Calculate for new periods

### **3. Employee Compensation Page**
**Location:** `/staff/compensation` (Employee View)

**What Employees See:**
- ✅ **Current Compensation** - Base salary and allowances
- ✅ **Active Loans** - Monthly installments and balances
- ✅ **Salary Advances** - Recovery schedule
- ✅ **Payment History** - Links to detailed payslips

---

## 🔧 **How Monthly Pay is Calculated**

### **Calculation Flow:**
```
1. Employee Compensation (Fixed Monthly)
   ↓
2. Attendance Integration (Daily/Weekly)
   ↓
3. Payroll Period Processing (Monthly)
   ↓
4. Deduction Calculations (Various Sources)
   ↓
5. Net Payroll Generation (Final Amount)
   ↓
6. Payment History Storage (Permanent Record)
```

### **Key Calculation Components:**

#### **Base Monthly Pay:**
```javascript
// From employee_compensation table
const monthlyBase = basic_salary + housing_allowance + transport_allowance + meal_allowance;
```

#### **Variable Components:**
```javascript
// From attendance system
const overtimePay = overtime_hours * hourly_rate * 1.5;
const nightShiftPay = night_shifts * night_shift_bonus;
const absenceDeduction = absent_days * daily_rate;
```

#### **Statutory Deductions:**
```javascript
// From payroll configuration
const socialSecurity = gross_salary * social_security_rate; // Usually 5-7%
const healthInsurance = fixed_amount || gross_salary * health_rate;
const incomeTax = calculateProgressiveTax(taxable_income);
```

#### **Other Deductions:**
```javascript
// From loans and advances tables
const loanDeductions = getActiveLoanInstallments(employee_id);
const advanceDeductions = getAdvanceRecoveryAmount(employee_id);
```

---

## 🎯 **How to Access Payment History**

### **For Employees:**
1. **Login to Employee Portal**
2. **Navigate to** `/staff/payslips`
3. **View** all monthly payment history
4. **Filter by year** if needed
5. **Download** individual payslips

### **For HR Managers:**
1. **Go to** `/hr/payroll`
2. **Select payroll period** from dropdown
3. **View all employee transactions** for that period
4. **Filter by employee** or department
5. **Export reports** as needed

### **For Finance:**
1. **Access** `/hr/payroll/transactions`
2. **Filter by period, employee, or status**
3. **View detailed payment breakdowns**
4. **Generate financial reports**

---

## 📱 **Real-World Examples**

### **Example Monthly Calculation:**
```
Employee: Dr. Ahmed Hassan
Period: March 2026 (1-31 days)

Base Salary: $5,000
Housing Allowance: $500
Transport Allowance: $200
Meal Allowance: $150
Overtime (8 hours): $120
Night Shift Bonus (5 shifts): $100
Gross Salary: $6,070

Deductions:
Social Security (6%): $364.20
Health Insurance: $50
Loan Installment: $200
Income Tax: $180
Total Deductions: $794.20

Net Salary: $5,275.80
```

### **Payment History View:**
```
March 2026: $5,275.80 - PAID
February 2026: $5,150.00 - PAID  
January 2026: $5,200.00 - PAID
December 2025: $5,300.00 - PAID
```

---

## 🚀 **System Integration**

### **Connected Modules:**
- ✅ **Employee Management** - Compensation setup
- ✅ **Attendance System** - Daily/monthly tracking
- ✅ **Leave Management** - Unpaid leave deductions
- ✅ **Loan Management** - Monthly installments
- ✅ **Shift Management** - Night shift/overtime pay
- ✅ **Payroll Periods** - Monthly processing cycles

### **Data Flow:**
```
Staff Data → Attendance → Payroll Engine → Transactions → Payslips → History
```

**Your monthly pay calculation and payment history system is fully integrated and functional!** 🎉
