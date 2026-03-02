# 🏥 HR Data Migration Guide

Complete guide for migrating HR data from JSON files to Supabase database.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Migration Process](#migration-process)
4. [Data Transformations](#data-transformations)
5. [Validation](#validation)
6. [Rollback](#rollback)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This migration system transfers all HR data from static JSON files to the Supabase PostgreSQL database while:

- ✅ Preserving all data relationships and foreign keys
- ✅ Validating data integrity before and after migration
- ✅ Using batch inserts for optimal performance (100 records per batch)
- ✅ Providing detailed logging and error reporting
- ✅ Supporting safe rollback in case of failures

### Data Sources

**JSON Files** (`src/data/hr/`):
- `employees.json` - 100+ employee records
- `departments.json` - 24 departments
- `attendance.json` - 1000+ attendance records
- `leaves.json` - 200+ leave requests
- `payroll.json` - 12 payroll periods with transactions

### Target Tables

**Supabase Database**:
- `departments` - Department structure
- `employees` - Employee master data
- `attendance_records` - Daily attendance tracking
- `leave_requests` - Leave applications
- `payroll_transactions` - Salary payments

---

## 📦 Prerequisites

### 1. Environment Variables

Ensure these are set in your `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Database Schema

The Supabase database must have the HR tables created. Run the schema:

```bash
# Schema is in supabase/schema.sql
# Tables: organizations, departments, employees, attendance_records, leave_requests, payroll_transactions
```

### 3. Dependencies

Install required packages:

```bash
npm install
```

Required packages:
- `@supabase/supabase-js` - Supabase client
- `ts-node` - TypeScript execution
- `typescript` - TypeScript compiler

---

## 🚀 Migration Process

### Step 1: Pre-Migration Check

Before running the migration, verify your setup:

```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Verify JSON files exist
ls -la src/data/hr/
```

### Step 2: Run Migration

Execute the migration script:

```bash
npm run migrate:hr
```

**What happens during migration:**

1. **Organization Setup** - Gets or creates default organization
2. **Department Migration** - Migrates 24 departments
3. **Employee Migration** - Migrates 100+ employees with department links
4. **Attendance Migration** - Migrates 1000+ attendance records
5. **Leave Migration** - Migrates 200+ leave requests
6. **Payroll Migration** - Migrates payroll transactions
7. **Validation** - Verifies data integrity
8. **Report Generation** - Creates detailed migration report

### Step 3: Monitor Progress

The script provides real-time feedback:

```
🏥 TIBBNA HOSPITAL - HR DATA MIGRATION
================================================================================

ℹ️  Using organization ID: abc-123-def
📁 Migrating Departments...
ℹ️  Inserting 24 records into departments in 1 batches
✅ Batch 1/1 completed (24 records)
✅ Departments migration completed

👥 Migrating Employees...
ℹ️  Inserting 120 records into employees in 2 batches
✅ Batch 1/2 completed (100 records)
✅ Batch 2/2 completed (20 records)
✅ Employees migration completed

...
```

### Step 4: Review Migration Report

After completion, check the generated report:

```bash
cat migration-report.json
```

**Report includes:**
- Total records processed
- Success/failure counts per table
- Detailed error messages
- Migration duration
- Timestamp information

---

## 🔄 Data Transformations

### Department Transformation

**JSON Structure:**
```json
{
  "id": "DEP-001",
  "code": "EXEC",
  "name": "Executive Management",
  "name_arabic": "الإدارة التنفيذية",
  "type": "ADMINISTRATIVE",
  "budget_annual": 500000000
}
```

**Database Structure:**
```sql
{
  id: UUID (generated),
  organization_id: UUID (from org),
  code: "EXEC",
  name: "Executive Management",
  name_ar: "الإدارة التنفيذية",
  type: "ADMINISTRATIVE",
  annual_budget: 500000000,
  metadata: { original_id: "DEP-001" },
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
}
```

### Employee Transformation

**Key Mappings:**
- `id` → UUID (generated, original stored in metadata)
- `department_id` → Mapped to new department UUID
- `full_name_arabic` → Split into `first_name_ar` and `last_name_ar`
- `education` → Stored in `qualifications` JSONB
- `licenses` → Stored in `specialties` JSONB
- `basic_salary` → `base_salary`
- `date_of_hire` → `hire_date`

### Attendance Transformation

**Key Mappings:**
- `employee_id` → Mapped to new employee UUID
- `date` → `attendance_date`
- `check_in/check_out` → Converted to ISO timestamps
- `shift_id` → Stored in metadata

### Leave Request Transformation

**Key Mappings:**
- `employee_id` → Mapped to new employee UUID
- `leave_type` → Stored in metadata (leave_type_id set to null)
- Dates converted to ISO format

### Payroll Transformation

**Key Mappings:**
- `employee_id` → Mapped to new employee UUID
- `period_id` → Set to null (periods need separate migration)
- All amounts preserved
- `period` → Stored in metadata

---

## ✅ Validation

### Automated Validation

The migration script automatically validates:

1. **Row Counts** - JSON vs Database comparison
2. **Foreign Keys** - No orphaned references
3. **Duplicates** - No duplicate employee numbers
4. **Required Fields** - All mandatory fields populated

### Manual Validation

Run the validation SQL queries:

```bash
# Connect to Supabase and run:
psql $DATABASE_URL -f scripts/validate-hr-migration.sql
```

**Validation Queries Check:**

1. ✅ Row count comparison
2. ✅ Orphaned foreign key detection
3. ✅ Duplicate record detection
4. ✅ Data quality checks
5. ✅ Summary statistics
6. ✅ Metadata validation
7. ✅ Date range validation
8. ✅ Referential integrity summary

### Expected Results

**Successful Migration:**
```sql
-- All checks should return 0
employees_invalid_dept: 0
attendance_invalid_emp: 0
leaves_invalid_emp: 0
payroll_invalid_emp: 0

-- Final validation
VALIDATION_CHECK: ✅ ALL CHECKS PASSED
```

---

## 🔙 Rollback

If the migration fails or you need to start over:

### Execute Rollback

```bash
npm run migrate:hr:rollback
```

**Warning:** This will DELETE all HR data from the database!

### Rollback Process

1. **Confirmation** - Requires explicit "yes" confirmation
2. **Record Count** - Shows current records before deletion
3. **Deletion** - Deletes in reverse order (respects foreign keys):
   - payroll_transactions
   - leave_requests
   - leave_balances
   - attendance_records
   - employees
   - departments
4. **Verification** - Confirms all tables are empty
5. **Summary** - Shows total records deleted

### After Rollback

You can safely re-run the migration:

```bash
npm run migrate:hr
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Missing Environment Variables

**Error:**
```
❌ Missing Supabase credentials
```

**Solution:**
```bash
# Check .env.local file
cat .env.local | grep SUPABASE

# Ensure both variables are set:
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
```

#### 2. Database Connection Failed

**Error:**
```
Failed to connect to Supabase
```

**Solution:**
- Verify Supabase URL is correct
- Check service role key is valid
- Ensure database is accessible
- Check network connectivity

#### 3. Foreign Key Violations

**Error:**
```
Batch failed: foreign key constraint violation
```

**Solution:**
- Migration runs in correct order (departments → employees → attendance)
- Check if organization exists
- Verify department IDs are mapped correctly

#### 4. Duplicate Employee Numbers

**Error:**
```
Batch failed: duplicate key value violates unique constraint
```

**Solution:**
- Check JSON for duplicate employee_number values
- Run rollback and fix JSON data
- Re-run migration

#### 5. Invalid Date Formats

**Error:**
```
invalid input syntax for type date
```

**Solution:**
- Dates are automatically converted to ISO format
- Check JSON for malformed dates
- Ensure dates are in YYYY-MM-DD format

### Debug Mode

For detailed debugging, check the migration report:

```bash
cat migration-report.json | jq '.stats[] | select(.failed > 0)'
```

This shows only tables with failures and their error messages.

---

## 📊 Migration Statistics

### Expected Performance

- **Departments**: ~1 second (24 records)
- **Employees**: ~3-5 seconds (100+ records)
- **Attendance**: ~10-15 seconds (1000+ records)
- **Leaves**: ~3-5 seconds (200+ records)
- **Payroll**: ~2-3 seconds (varies)

**Total Migration Time**: ~30-45 seconds

### Batch Processing

- Batch size: 100 records
- Reduces database round trips
- Improves performance significantly
- Handles large datasets efficiently

---

## 🎯 Post-Migration Steps

### 1. Update Application Code

After successful migration, update the HR module to use database instead of JSON:

```typescript
// OLD: Using dataStore (JSON)
import { dataStore } from '@/lib/dataStore';
const employees = dataStore.getEmployees();

// NEW: Using Supabase
import { supabase } from '@/lib/supabase/client';
const { data: employees } = await supabase.from('employees').select('*');
```

### 2. Create API Routes

Create database-backed API routes:

```typescript
// src/app/api/hr/employees/route.ts
export async function GET() {
  const { data, error } = await supabase
    .from('employees')
    .select('*, departments(name)');
  
  return NextResponse.json(data);
}
```

### 3. Update UI Components

Update components to fetch from API instead of dataStore:

```typescript
// OLD
const employees = dataStore.getEmployees();

// NEW
const response = await fetch('/api/hr/employees');
const employees = await response.json();
```

### 4. Remove JSON Dependencies

Once migration is verified and application is updated:

1. Keep JSON files as backup
2. Update dataStore.ts to use database
3. Remove localStorage usage
4. Update all HR pages to use API

---

## 📝 Migration Checklist

- [ ] Environment variables configured
- [ ] Database schema created
- [ ] JSON files verified
- [ ] Dependencies installed
- [ ] Migration script executed
- [ ] Migration report reviewed
- [ ] Validation queries passed
- [ ] Application code updated
- [ ] API routes created
- [ ] UI components updated
- [ ] Testing completed
- [ ] JSON files backed up

---

## 🆘 Support

If you encounter issues:

1. Check this guide's troubleshooting section
2. Review the migration report for detailed errors
3. Run validation queries to identify specific issues
4. Use rollback if needed and try again
5. Check Supabase logs for database errors

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Foreign Keys](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [TypeScript Node](https://typestrong.org/ts-node/)

---

**Last Updated**: 2026-02-28  
**Version**: 1.0.0  
**Status**: Ready for Production
