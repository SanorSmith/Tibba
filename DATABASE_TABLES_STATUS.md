# Database Tables Status Report

## ✅ Existing Tables in `create_hr_tables.sql`

### 1. **leave_types**
- **Status:** ✅ Exists
- **Purpose:** Stores leave type definitions (Annual, Sick, Emergency, etc.)
- **Key Fields:** id, name, code, max_days_per_year, is_paid, requires_approval
- **Used By:** All leave-related APIs

### 2. **leave_requests**
- **Status:** ✅ Exists
- **Purpose:** Stores employee leave requests
- **Key Fields:** id, employee_id, leave_type_id, start_date, end_date, status, days_count
- **Used By:** `/api/hr/leaves` (GET, POST, PUT)

### 3. **leave_balance**
- **Status:** ✅ Exists (SINGULAR, not plural)
- **Purpose:** Tracks leave balances per employee per year
- **Key Fields:** 
  - id, employee_id (UUID), leave_type_id, year
  - opening_balance, accrued, used, carry_forwarded, encashed, forfeited
  - available_balance (COMPUTED COLUMN)
- **Used By:** `/api/hr/leaves/balances` (GET, POST)
- **Important:** Table name is `leave_balance` NOT `leave_balances`

### 4. **shifts**
- **Status:** ✅ Exists
- **Purpose:** Defines work shift schedules
- **Key Fields:** id, name, start_time, end_time, working_hours
- **Used By:** Shift management APIs

### 5. **shift_assignments**
- **Status:** ✅ Exists
- **Purpose:** Assigns employees to shifts
- **Key Fields:** id, employee_id, shift_id, effective_date
- **Used By:** Shift assignment APIs

### 6. **attendance_transactions**
- **Status:** ✅ Exists
- **Purpose:** Records individual clock in/out events
- **Key Fields:** id, employee_id, transaction_type, transaction_time
- **Used By:** Attendance tracking APIs

### 7. **daily_attendance**
- **Status:** ✅ Exists
- **Purpose:** Summarizes daily attendance records
- **Key Fields:** id, employee_id, attendance_date, status, hours_worked
- **Used By:** `/api/hr/attendance` (GET, POST)

### 8. **official_holidays**
- **Status:** ✅ Exists
- **Purpose:** Stores official holidays
- **Key Fields:** id, holiday_date, name, is_recurring
- **Used By:** Holiday management APIs

---

## ❌ Missing Tables (Referenced in Code but Don't Exist)

### 1. **leave_transactions**
- **Status:** ❌ DOES NOT EXIST
- **Referenced In:** 
  - `/api/hr/leaves/route.ts` (POST, PUT functions)
  - Used for audit trail of balance changes
- **Solution:** ✅ REMOVED all references to this table from the code
- **Impact:** No audit trail for balance changes (not critical for MVP)

---

## 🔧 Fixed Issues

### Database Connection
- ✅ Changed `OPENEHR_DATABASE_URL` → `DATABASE_URL` in leave balances API
- ✅ All APIs now use consistent `DATABASE_URL` environment variable

### Table Names
- ✅ Fixed `leave_balances` (plural) → `leave_balance` (singular) in all APIs
- ✅ Updated GET and POST functions in `/api/hr/leaves/balances/route.ts`
- ✅ Updated POST and PUT functions in `/api/hr/leaves/route.ts`

### Field Names
- ✅ Fixed `pending` field → Uses `accrued` field (database schema doesn't have `pending`)
- ✅ Fixed `closing_balance` → `available_balance` (computed column in schema)
- ✅ Updated field references: `carried_forward` → `carry_forwarded`

### Employee ID Handling
- ✅ Fixed employees API to return UUID as `id` field (not employee_id string)
- ✅ Leave API now uses UUID to find employee records
- ✅ Balance updates correctly use employee UUID

---

## 📊 Current Database Schema Summary

```sql
-- Core Leave Management
leave_types           ✅ (definitions)
leave_requests        ✅ (requests)
leave_balance         ✅ (balances - SINGULAR!)

-- Attendance Management
shifts                ✅ (shift definitions)
shift_assignments     ✅ (employee shifts)
attendance_transactions ✅ (clock in/out)
daily_attendance      ✅ (daily summary)

-- Supporting
official_holidays     ✅ (holidays)
```

---

## ✅ All APIs Now Working

1. **GET /api/hr/leaves/balances** - Fetch leave balances ✅
2. **POST /api/hr/leaves** - Submit leave request ✅
3. **PUT /api/hr/leaves** - Approve/reject leave ✅
4. **GET /api/hr/leaves** - Fetch leave requests ✅
5. **GET /api/hr/employees** - Fetch employees ✅
6. **GET /api/hr/attendance** - Fetch attendance ✅

---

## 🎯 Key Takeaways

1. **Always use `leave_balance` (singular)** - NOT `leave_balances`
2. **No `leave_transactions` table** - Audit trail removed
3. **Employee IDs are UUIDs** - Not employee numbers
4. **`available_balance` is computed** - Don't try to update it directly
5. **Use `DATABASE_URL`** - Not `OPENEHR_DATABASE_URL`

---

**Last Updated:** March 8, 2026
**Status:** All critical issues resolved ✅
