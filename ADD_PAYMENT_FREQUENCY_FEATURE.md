# 💰 Adding Payment Frequency Feature - Complete Implementation Guide

## 🔍 **Current Status: NOT IMPLEMENTED**

After analyzing your system, I found that **payment frequency (monthly, weekly, bi-weekly) is NOT currently configured** for individual staff members.

### **What's Currently Available:**
- ✅ **Basic Salary** - Fixed monthly amount
- ✅ **Payroll Periods** - Monthly processing cycles
- ✅ **Employee Compensation** - Base salary and allowances
- ❌ **Payment Frequency** - NOT available per employee

---

## 🎯 **Where to Add Payment Frequency**

### **1. Database Schema Addition**

**Add to `employee_compensation` table:**
```sql
ALTER TABLE employee_compensation 
ADD COLUMN payment_frequency VARCHAR(20) DEFAULT 'MONTHLY' 
CHECK (payment_frequency IN ('WEEKLY', 'BI-WEEKLY', 'MONTHLY', 'QUARTERLY'));

-- Add index for performance
CREATE INDEX idx_employee_compensation_payment_frequency 
ON employee_compensation(payment_frequency);
```

**Alternative: Add to `staff` table:**
```sql
ALTER TABLE staff 
ADD COLUMN payment_frequency VARCHAR(20) DEFAULT 'MONTHLY' 
CHECK (payment_frequency IN ('WEEKLY', 'BI-WEEKLY', 'MONTHLY', 'QUARTERLY'));
```

---

### **2. UI Implementation**

**Location 1: Employee Creation/Edit Page**
**File:** `src/app/(dashboard)/hr/employees/new/page.tsx`

**Add to Employee Form:**
```typescript
// Add to initialForm state
payment_frequency: 'MONTHLY',

// Add to form JSX
<FormGroup label="Payment Frequency" required>
  <select
    value={formData.payment_frequency}
    onChange={(e) => setFormData({...formData, payment_frequency: e.target.value})}
    className="tibbna-input"
  >
    <option value="WEEKLY">Weekly</option>
    <option value="BI-WEEKLY">Every Two Weeks</option>
    <option value="MONTHLY">Monthly</option>
    <option value="QUARTERLY">Quarterly</option>
  </select>
</FormGroup>
```

**Location 2: Employee Compensation Page**
**File:** `src/app/(dashboard)/staff/compensation/page.tsx`

**Add to Compensation Interface:**
```typescript
interface Compensation {
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  meal_allowance: number;
  payment_frequency: 'WEEKLY' | 'BI-WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  total_package: number;
  salary_grade: string;
  currency: string;
  effective_from: string;
}
```

---

### **3. API Updates**

**Update Employee API:**
**File:** `src/app/api/hr/employees/route.ts`

```typescript
// Add to employee creation/update
const {
  // ... existing fields
  payment_frequency = 'MONTHLY'
} = body;

// Include in INSERT/UPDATE queries
const result = await pool.query(
  `INSERT INTO employees (
    // ... existing fields,
    payment_frequency
  ) VALUES ($1, $2, ..., $n) RETURNING *`,
  [
    // ... existing values,
    payment_frequency
  ]
);
```

**Update Compensation API:**
**File:** `src/app/api/hr/compensation/route.ts`

```typescript
// Add payment frequency to compensation management
const compensationData = {
  employee_id,
  basic_salary,
  housing_allowance,
  transport_allowance,
  meal_allowance,
  payment_frequency, // NEW FIELD
  // ... other fields
};
```

---

### **4. Payroll Calculation Engine Updates**

**File:** `src/lib/services/payroll-calculation-engine.ts`

**Add Payment Frequency Logic:**
```typescript
export interface EmployeeCompensation {
  employee_id: string;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  meal_allowance: number;
  payment_frequency: 'WEEKLY' | 'BI-WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  salary_grade: string;
  currency: string;
}

// Calculate pay based on frequency
export const calculateFrequencyBasedPay = (compensation: EmployeeCompensation, periodDays: number) => {
  const monthlyBase = compensation.basic_salary + 
                     compensation.housing_allowance + 
                     compensation.transport_allowance + 
                     compensation.meal_allowance;
  
  switch (compensation.payment_frequency) {
    case 'WEEKLY':
      return monthlyBase / 4.33; // Average weeks per month
    case 'BI-WEEKLY':
      return monthlyBase / 2.17; // Average bi-weekly periods per month
    case 'MONTHLY':
      return monthlyBase;
    case 'QUARTERLY':
      return monthlyBase / 3;
    default:
      return monthlyBase;
  }
};
```

---

### **5. Payroll Periods Enhancement**

**Update Payroll Periods to Support Multiple Frequencies:**
**File:** `src/app/api/hr/payroll/periods/route.ts`

```typescript
// Add frequency filter to periods API
const frequency = searchParams.get('frequency');

if (frequency) {
  params.push(frequency);
  query += ` AND frequency = $${params.length}`;
}

// Create periods for different frequencies
export const createFrequencyBasedPeriods = async (frequency: string, startDate: Date) => {
  switch (frequency) {
    case 'WEEKLY':
      // Create weekly periods (7 days each)
      return createWeeklyPeriods(startDate);
    case 'BI-WEEKLY':
      // Create bi-weekly periods (14 days each)
      return createBiWeeklyPeriods(startDate);
    case 'MONTHLY':
      // Create monthly periods (existing logic)
      return createMonthlyPeriods(startDate);
    case 'QUARTERLY':
      // Create quarterly periods (3 months each)
      return createQuarterlyPeriods(startDate);
  }
};
```

---

## 🎯 **Implementation Steps**

### **Step 1: Database Migration**
```sql
-- Add payment_frequency to employee_compensation table
ALTER TABLE employee_compensation 
ADD COLUMN payment_frequency VARCHAR(20) DEFAULT 'MONTHLY' 
CHECK (payment_frequency IN ('WEEKLY', 'BI-WEEKLY', 'MONTHLY', 'QUARTERLY'));
```

### **Step 2: Update TypeScript Types**
```typescript
// Update Employee interface
export interface Employee {
  // ... existing fields
  payment_frequency?: 'WEEKLY' | 'BI-WEEKLY' | 'MONTHLY' | 'QUARTERLY';
}

// Update Compensation interface  
export interface Compensation {
  // ... existing fields
  payment_frequency: 'WEEKLY' | 'BI-WEEKLY' | 'MONTHLY' | 'QUARTERLY';
}
```

### **Step 3: Update Employee Form**
Add payment frequency dropdown to employee creation/edit forms.

### **Step 4: Update API Endpoints**
Modify employee and compensation APIs to handle payment frequency.

### **Step 5: Update Payroll Engine**
Modify calculation engine to handle different payment frequencies.

### **Step 6: Update Payroll Periods**
Enhance payroll periods to support multiple frequencies.

---

## 📱 **User Experience**

### **For HR Managers:**
1. **Employee Creation:** Select payment frequency from dropdown
2. **Employee Edit:** Change payment frequency as needed
3. **Payroll Processing:** Process payroll by frequency groups
4. **Reporting:** View payroll by payment frequency

### **For Employees:**
1. **Payslips:** Show payment frequency clearly
2. **Payment History:** Display based on actual payment frequency
3. **Compensation View:** See current payment frequency

---

## 🔧 **Where You'll Be Able to Set Payment Frequency:**

### **Primary Location: Employee Management**
**URL:** `/hr/employees/new` (New Employee)
**URL:** `/hr/employees/[id]` (Edit Employee)

**Form Field:**
```html
<label>Payment Frequency</label>
<select>
  <option value="WEEKLY">Weekly</option>
  <option value="BI-WEEKLY">Every Two Weeks</option>
  <option value="MONTHLY">Monthly</option>
  <option value="QUARTERLY">Quarterly</option>
</select>
```

### **Secondary Location: Compensation Management**
**URL:** `/staff/compensation` (Employee View)
**URL:** `/hr/compensation` (HR Management)

### **Tertiary Location: Bulk Updates**
**URL:** `/hr/payroll/bulk-update` (Future Enhancement)

---

## 🚀 **Benefits of Implementation**

✅ **Flexible Payroll** - Support different payment schedules
✅ **Employee Satisfaction** - Accommodate different preferences
✅ **Compliance** - Meet various labor requirements
✅ **Global Ready** - Support international payment practices
✅ **Accurate Calculations** - Proper pro-rating for different periods

---

## 📋 **Implementation Priority**

### **High Priority:**
1. Database schema update
2. Employee form addition
3. API endpoint updates
4. Basic payroll calculation updates

### **Medium Priority:**
1. Payroll periods enhancement
2. Reporting by frequency
3. Bulk update functionality

### **Low Priority:**
1. Advanced frequency features
2. Historical data migration
3. Frequency change tracking

**This implementation will give you complete control over each staff member's payment frequency!** 🎉
