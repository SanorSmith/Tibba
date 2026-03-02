# 🚀 Setup Guide - Migrations & Testing

Complete guide for running database migrations and setting up the testing framework.

---

## 📋 **Step 1: Run Database Migrations**

### **Migration Files to Run (in order):**

1. **Shift Management Migration**
   ```bash
   psql -h your-db-host -U postgres -d your-db < supabase/migrations/003_shift_management_simple.sql
   ```
   
   **What it creates:**
   - `shifts` table (Day, Evening, Night, 24-Hour shifts)
   - `shift_schedules` table
   - `hazard_departments` table
   - Extends `attendance_records` with shift tracking columns
   - Helper functions for shift detection

2. **Alerts & Workflows Migration**
   ```bash
   psql -h your-db-host -U postgres -d your-db < supabase/migrations/004_alerts_workflows_simple.sql
   ```
   
   **What it creates:**
   - `alerts` table
   - `approval_workflows` table
   - `approval_steps` table
   - `notification_queue` table
   - `alert_rules` table
   - Helper functions for workflows

---

## 📦 **Step 2: Install Testing Dependencies**

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @types/jest jest-environment-jsdom
```

---

## 🧪 **Step 3: Testing Framework Files Created**

### **Configuration Files:**
- ✅ `jest.config.js` - Jest configuration for Next.js
- ✅ `jest.setup.js` - Test environment setup

### **Test Files:**
- ✅ `src/services/__tests__/payroll-calculator.test.ts` - PayrollCalculator unit tests
- ✅ `scripts/validate-data.ts` - Data validation script

### **Package.json Scripts:**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

---

## ⚠️ **Current Status**

### **✅ Completed:**
1. Fixed database migrations (removed organization_id dependency)
2. Created shift management migration
3. Created alerts & workflows migration
4. Created Jest configuration
5. Created PayrollCalculator unit tests (template)
6. Created data validation script

### **⏳ Pending:**
1. Run the two migration files in your database
2. Install testing dependencies (`npm install`)
3. Create actual PayrollCalculator service to match tests
4. Create remaining test files:
   - ReportGenerator tests
   - WorkflowService tests
   - Integration tests
   - API endpoint tests
   - Test data generator

---

## 🎯 **Next Steps**

### **Immediate Actions:**

1. **Run migrations:**
   ```bash
   # Shift management
   psql -h your-db-host -U postgres -d your-db < supabase/migrations/003_shift_management_simple.sql
   
   # Alerts & workflows
   psql -h your-db-host -U postgres -d your-db < supabase/migrations/004_alerts_workflows_simple.sql
   ```

2. **Install dependencies:**
   ```bash
   npm install --save-dev jest @testing-library/react @testing-library/jest-dom @types/jest jest-environment-jsdom
   ```

3. **Verify migrations:**
   ```sql
   -- Check tables created
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
     AND table_name IN ('shifts', 'shift_schedules', 'alerts', 'approval_workflows');
   ```

---

## 📁 **Files Ready to Use**

### **Migration Files:**
- `supabase/migrations/003_shift_management_simple.sql` ✅
- `supabase/migrations/004_alerts_workflows_simple.sql` ✅

### **Testing Files:**
- `jest.config.js` ✅
- `jest.setup.js` ✅
- `src/services/__tests__/payroll-calculator.test.ts` ✅
- `scripts/validate-data.ts` ✅

### **Documentation:**
- `docs/ALERTS_AND_WORKFLOWS.md` ✅
- `SETUP_GUIDE.md` (this file) ✅

---

## 🔍 **Troubleshooting**

### **Migration Errors:**

**Error: "column organization_id does not exist"**
- Solution: Use the `_simple.sql` migration files (already created)

**Error: "relation already exists"**
- Solution: Migrations use `IF NOT EXISTS`, safe to re-run

### **Test Errors:**

**Error: "Cannot find name 'describe'"**
- Solution: Run `npm install --save-dev @types/jest`

**Error: "Cannot find module '@/services/payroll-calculator'"**
- Solution: PayrollCalculator service needs to be created (pending)

---

## 📊 **What's Working**

✅ Database schema (organizations, employees, departments, attendance)  
✅ Shift management tables ready to deploy  
✅ Alerts & workflows tables ready to deploy  
✅ Testing framework configured  
✅ Test templates created  
✅ Data validation script ready  

---

## 🎊 **Summary**

You now have:
1. **2 migration files** ready to run
2. **Testing framework** configured
3. **Test templates** for PayrollCalculator
4. **Data validation** script
5. **Complete documentation**

**Run the migrations, install dependencies, and you're ready to proceed with testing!**
