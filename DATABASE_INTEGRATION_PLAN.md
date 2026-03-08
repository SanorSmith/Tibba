# Database Integration Status Report

## Current Status

### ✅ **Database Tables Created**
All HR tables are properly created in PostgreSQL:
- `leave_types` - Leave type definitions
- `leave_requests` - Leave request records
- `leave_balance` - Employee leave balances
- `shifts` - Shift definitions
- `shift_assignments` - Employee shift assignments
- `attendance_transactions` - Raw attendance punches
- `daily_attendance` - Processed daily attendance
- `official_holidays` - Holiday calendar

### ✅ **API Routes Connected to Database**
The following API routes are **already using the database**:

#### Leave Management APIs:
- **GET/POST `/api/hr/leaves`** - Fetch/create leave requests ✅
- **PUT `/api/hr/leaves`** - Update leave request status ✅
- **GET `/api/hr/leaves/balances`** - Fetch leave balances ✅
- **POST `/api/hr/leaves/balances`** - Initialize/accrue balances ✅

#### Attendance APIs:
- **GET/POST `/api/hr/attendance`** - Fetch/create attendance records ✅

### ❌ **UI Components Still Using localStorage**
The following UI components are **NOT connected to database** and use `dataStore` (localStorage):

#### Leave Management UIs:
1. **Leave Request Form** (`/hr/leaves/requests/new/page.tsx`)
   - Uses `dataStore.getEmployees()` for employee list
   - Uses `dataStore.getRawLeaveBalance()` for balances
   - Uses `dataStore.addLeaveRequest()` to save requests
   - Uses `dataStore.updateLeaveBalanceByType()` to update balances

2. **Leave Approvals Page** (`/hr/leaves/approvals/page.tsx`)
   - Needs to fetch from database API

3. **Leave Analytics** (`/hr/leaves/analytics/page.tsx`)
   - Needs to fetch from database API

4. **Employee Portal** (`/staff/page.tsx`)
   - Uses localStorage for employee data

#### Attendance UIs:
1. **Attendance Tracking Pages**
   - Need to verify database connection

## Required Changes

### 1. Update Leave Request Submission Form
**File:** `src/app/(dashboard)/hr/leaves/requests/new/page.tsx`

**Changes needed:**
```typescript
// REMOVE:
import { dataStore } from '@/lib/dataStore';
const emps = dataStore.getEmployees();
const rawBal = dataStore.getRawLeaveBalance(form.employee_id);
dataStore.addLeaveRequest(request);
dataStore.updateLeaveBalanceByType(...);

// REPLACE WITH:
// Fetch employees from database
const response = await fetch('/api/hr/employees');
const { data: employees } = await response.json();

// Fetch leave balances from database
const balanceResponse = await fetch(`/api/hr/leaves/balances?employeeId=${employeeId}&year=${year}`);
const { data: balances } = await balanceResponse.json();

// Submit leave request to database
const submitResponse = await fetch('/api/hr/leaves', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(leaveRequestData)
});
```

### 2. Update Leave Balances Display
**Changes needed:**
- Replace `dataStore.getRawLeaveBalance()` with API call to `/api/hr/leaves/balances`
- Update balance structure to match database schema

### 3. Update Employee Portal
**File:** `src/app/(dashboard)/staff/page.tsx`

**Changes needed:**
- Replace `dataStore` calls with `/api/hr/employees` API
- Update leave balance fetching to use `/api/hr/leaves/balances`
- Update leave request submission to use `/api/hr/leaves`

## Database Schema vs UI Expectations

### Leave Balance Structure

**Database Schema:**
```sql
leave_balance (
  employee_id UUID,
  leave_type_id UUID,
  year INTEGER,
  opening_balance INTEGER,
  accrued INTEGER,
  used INTEGER,
  carry_forwarded INTEGER,
  encashed INTEGER,
  forfeited INTEGER,
  available_balance INTEGER (computed)
)
```

**Current UI Expects (localStorage):**
```json
{
  "employee_id": "uuid",
  "annual": { "available": 25, "used": 5, "total": 30 },
  "sick": { "available": 13, "used": 2, "total": 15 }
}
```

**API Returns (database):**
```json
[
  {
    "employee_id": "uuid",
    "leave_type_id": "uuid",
    "leave_type_name": "Annual Leave",
    "leave_type_code": "ANNUAL",
    "year": 2026,
    "opening_balance": 30,
    "accrued": 0,
    "used": 5,
    "available_balance": 25
  }
]
```

## Implementation Priority

1. **HIGH PRIORITY** - Leave Request Submission Form
2. **HIGH PRIORITY** - Leave Balances Display
3. **MEDIUM PRIORITY** - Employee Portal
4. **MEDIUM PRIORITY** - Leave Approvals Page
5. **LOW PRIORITY** - Analytics Pages

## Testing Checklist

- [ ] Submit new leave request → Check database `leave_requests` table
- [ ] View leave balances → Verify data from `leave_balance` table
- [ ] Approve leave request → Check status update in database
- [ ] View attendance → Verify data from `daily_attendance` table
- [ ] Employee portal → All data from database APIs

## Notes

- The database tables are properly indexed and optimized
- All APIs use parameterized queries (SQL injection safe)
- Row-level security is disabled for development
- Need to remove `dataStore.ts` dependency from UI components
