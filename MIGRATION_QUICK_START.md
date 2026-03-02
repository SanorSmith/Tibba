# 🚀 HR Data Migration - Quick Start Guide

## ⚡ Quick Execution (5 Minutes)

### Step 1: Verify Environment (30 seconds)

```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# If not set, add to .env.local:
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Step 2: Run Migration (2-3 minutes)

```bash
npm run migrate:hr
```

### Step 3: Validate Results (1 minute)

```bash
# Check the migration report
cat migration-report.json

# Expected output:
# {
#   "success": true,
#   "totalRecords": 1300+,
#   "totalInserted": 1300+,
#   "totalFailed": 0
# }
```

### Step 4: Verify in Database (1 minute)

Connect to Supabase and run:

```sql
-- Quick validation
SELECT 'departments' as table_name, COUNT(*) as count FROM departments
UNION ALL
SELECT 'employees', COUNT(*) FROM employees
UNION ALL
SELECT 'attendance_records', COUNT(*) FROM attendance_records
UNION ALL
SELECT 'leave_requests', COUNT(*) FROM leave_requests;

-- Expected results:
-- departments: 24
-- employees: 100+
-- attendance_records: 1000+
-- leave_requests: 200+
```

---

## 🔄 If Something Goes Wrong

### Rollback and Retry

```bash
# 1. Rollback
npm run migrate:hr:rollback
# Type 'yes' when prompted

# 2. Fix any issues in JSON files

# 3. Re-run migration
npm run migrate:hr
```

---

## ✅ Success Indicators

Migration is successful when you see:

```
================================================================================
📊 HR DATA MIGRATION REPORT
================================================================================

Overall Status: ✅ SUCCESS
Total Records: 1324
Total Inserted: 1324
Total Failed: 0

🎉 Migration completed successfully!
```

---

## 📋 What Gets Migrated

| Data Type | Source File | Target Table | Records |
|-----------|-------------|--------------|---------|
| Departments | departments.json | departments | 24 |
| Employees | employees.json | employees | 100+ |
| Attendance | attendance.json | attendance_records | 1000+ |
| Leaves | leaves.json | leave_requests | 200+ |
| Payroll | payroll.json | payroll_transactions | varies |

---

## 🎯 Next Steps After Migration

1. **Update HR Module** - Switch from JSON to database
2. **Create API Routes** - Build database-backed endpoints
3. **Test Application** - Verify all HR features work
4. **Remove JSON Dependencies** - Clean up old code

See `docs/HR_DATA_MIGRATION_GUIDE.md` for detailed instructions.

---

## 🆘 Common Issues

| Issue | Solution |
|-------|----------|
| Missing env vars | Add to `.env.local` |
| Connection failed | Check Supabase URL/key |
| Duplicate errors | Run rollback, fix JSON, retry |
| Foreign key errors | Migration runs in correct order automatically |

---

**Total Time**: ~5 minutes  
**Difficulty**: Easy  
**Risk**: Low (rollback available)
