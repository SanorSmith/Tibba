# Leave Balance Table - Connection Map

## 📊 Database Table: `leave_balance`

### Table Structure:
```sql
CREATE TABLE leave_balance (
  id UUID PRIMARY KEY,
  employee_id UUID NOT NULL,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id),
  year INTEGER NOT NULL,
  opening_balance INTEGER DEFAULT 0,
  accrued INTEGER DEFAULT 0,
  used INTEGER DEFAULT 0,
  carry_forwarded INTEGER DEFAULT 0,
  encashed INTEGER DEFAULT 0,
  forfeited INTEGER DEFAULT 0,
  available_balance INTEGER GENERATED (computed),
  last_accrual_date DATE,
  UNIQUE(employee_id, leave_type_id, year)
);
```

---

## 🔌 API Connection

### API Route: `/api/hr/leaves/balances/route.ts`

**Status:** ✅ **CONNECTED TO DATABASE**

#### GET Endpoint:
```typescript
GET /api/hr/leaves/balances?employeeId={uuid}&year={2026}
```

**SQL Query:**
```sql
SELECT 
  lb.id,
  lb.employee_id,
  lb.leave_type_id,
  lt.name as leave_type_name,
  lt.code as leave_type_code,
  lt.color as leave_type_color,
  lb.year,
  lb.opening_balance,
  lb.accrued,
  lb.used,
  lb.pending,
  lb.carried_forward,
  lb.encashed,
  lb.closing_balance,
  (lb.closing_balance - lb.pending) as available_balance
FROM leave_balances lb
JOIN leave_types lt ON lb.leave_type_id = lt.id
WHERE lb.employee_id = $1 AND lb.year = $2
```

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "employee_id": "uuid",
      "leave_type_id": "uuid",
      "leave_type_name": "Annual Leave",
      "leave_type_code": "ANNUAL",
      "leave_type_color": "#3B82F6",
      "year": 2026,
      "opening_balance": 30,
      "accrued": 0,
      "used": 5,
      "pending": 2,
      "available_balance": 23
    }
  ]
}
```

#### POST Endpoint (Admin Actions):
```typescript
POST /api/hr/leaves/balances
Body: { "action": "initialize" } // Initialize balances for all staff
Body: { "action": "accrual" }    // Run monthly accrual
```

---

## 🖥️ UI Connections

### 1. ✅ **Leave Request Form** (CONNECTED)
**File:** `src/app/(dashboard)/hr/leaves/requests/new/page.tsx`

**Status:** ✅ **NOW USING DATABASE API**

**Functions:**
```typescript
// Loads leave balances from database
const loadLeaveBalances = async (employeeId: string) => {
  const year = new Date().getFullYear();
  const response = await fetch(`/api/hr/leaves/balances?employeeId=${employeeId}&year=${year}`);
  const data = await response.json();
  if (data.success) {
    setLeaveBalances(data.data);
  }
};

// Displays balance in UI
const employeeBalance = useMemo(() => {
  const balance = leaveBalances.find(b => b.leave_type_id === form.leave_type_id);
  return {
    available: balance?.available_balance || 0,
    taken: balance?.used || 0,
    pending: balance?.pending || 0,
    total: balance?.opening_balance + balance?.accrued || 0,
  };
}, [form.leave_type_id, leaveBalances]);
```

**UI Display:**
- Shows balance when employee and leave type are selected
- Displays: Total, Taken, Pending, Available
- Validates if requested days exceed available balance
- Updates after leave request submission

---

### 2. ⚠️ **Leave Balances Page** (STILL USING localStorage)
**File:** `src/app/(dashboard)/hr/leaves/balances/page.tsx`

**Status:** ❌ **STILL USING dataStore (localStorage)**

**Current Code:**
```typescript
// Line 106-108: USING localStorage
const loadData = useCallback(() => {
  setEmployees(dataStore.getEmployees());
  const bals = dataStore.getLeaveBalances() as unknown as RawBalance[];
  setRawBalances(bals);
}, []);

// Line 248: USING localStorage
const balance = dataStore.getRawLeaveBalance(adjEmpId);

// Line 257: USING localStorage
const ok = dataStore.updateLeaveBalanceByType(adjEmpId, typeKey, { 
  total: newTotal, 
  available: newAvailable 
});
```

**What This Page Does:**
- Displays all employee leave balances in a table
- Shows statistics (total employees, total days, used, available)
- Allows filtering by department, employee, leave type
- Allows HR to adjust balances (add/deduct days)
- Exports balances to CSV

**Required Changes:**
```typescript
// REPLACE loadData with:
const loadData = useCallback(async () => {
  try {
    // Load employees from database
    const empResponse = await fetch('/api/hr/employees');
    const empData = await empResponse.json();
    setEmployees(empData.data);

    // Load all balances for current year
    const year = new Date().getFullYear();
    const allBalances = [];
    
    for (const emp of empData.data) {
      const balResponse = await fetch(`/api/hr/leaves/balances?employeeId=${emp.id}&year=${year}`);
      const balData = await balResponse.json();
      if (balData.success) {
        allBalances.push(...balData.data);
      }
    }
    
    setRawBalances(allBalances);
  } catch (err) {
    console.error('Error loading balances:', err);
    toast.error('Failed to load leave balances');
  } finally {
    setLoading(false);
  }
}, []);
```

---

### 3. ⚠️ **Employee Portal (Staff Page)** (STILL USING localStorage)
**File:** `src/app/(dashboard)/staff/page.tsx`

**Status:** ❌ **STILL USING localStorage/mock data**

**Current Issues:**
- Uses mock data for employee leave balances
- Does not fetch from database API

**Required Changes:**
```typescript
// Add balance loading for selected employee
useEffect(() => {
  if (selectedEmployee) {
    loadEmployeeBalances(selectedEmployee.id);
  }
}, [selectedEmployee]);

const loadEmployeeBalances = async (employeeId: string) => {
  const year = new Date().getFullYear();
  const response = await fetch(`/api/hr/leaves/balances?employeeId=${employeeId}&year=${year}`);
  const data = await response.json();
  if (data.success) {
    setEmployeeBalances(data.data);
  }
};
```

---

### 4. ⚠️ **Employee Detail Page** (Partial Connection)
**File:** `src/app/(dashboard)/hr/employees/[id]/page.tsx`

**Status:** ⚠️ **NEEDS VERIFICATION**

**Line 1 match:** Uses `leave_balance` in query or display

---

### 5. ⚠️ **Leave Request Detail Page** (Partial Connection)
**File:** `src/app/(dashboard)/hr/leaves/requests/[id]/page.tsx`

**Status:** ⚠️ **NEEDS VERIFICATION**

**Line 1 match:** May display balance information

---

## 🔄 How Leave Balance Updates Work

### When Leave Request is Submitted:
1. **User submits leave request** → `POST /api/hr/leaves`
2. **Request saved to database** → `leave_requests` table
3. **Balance should be updated** → `leave_balance.pending` increased
   - ⚠️ **Currently NOT implemented in API**
   - Need to add trigger or update logic

### When Leave Request is Approved:
1. **Admin approves request** → `PUT /api/hr/leaves` or approval endpoint
2. **Request status updated** → `leave_requests.status = 'APPROVED'`
3. **Balance should be updated:**
   - `leave_balance.pending` decreased
   - `leave_balance.used` increased
   - ⚠️ **Currently NOT fully implemented**

### When Leave Request is Rejected:
1. **Admin rejects request** → `PUT /api/hr/leaves`
2. **Request status updated** → `leave_requests.status = 'REJECTED'`
3. **Balance should be updated:**
   - `leave_balance.pending` decreased
   - `leave_balance.available_balance` restored
   - ⚠️ **Currently NOT implemented**

---

## 📋 Summary

### ✅ What's Working:
1. **Database table exists** with proper structure
2. **API endpoint connected** to database
3. **Leave request form** now uses database API for balances
4. **GET balances** works correctly

### ❌ What's NOT Working:
1. **Leave Balances Page** still uses localStorage
2. **Employee Portal** still uses mock data
3. **Balance updates** not automated when leave requests change status
4. **Pending balance** not updated when request submitted

### 🔧 Required Fixes:

#### High Priority:
1. **Update Leave Balances Page** (`/hr/leaves/balances/page.tsx`)
   - Replace `dataStore.getLeaveBalances()` with API call
   - Replace `dataStore.updateLeaveBalanceByType()` with API call

2. **Add Balance Update Logic to Leave Request API**
   - When request submitted: increase `pending`
   - When request approved: decrease `pending`, increase `used`
   - When request rejected: decrease `pending`

#### Medium Priority:
3. **Update Employee Portal** (`/staff/page.tsx`)
   - Fetch balances from database API
   - Display real-time balance data

4. **Add Balance Adjustment API**
   - Create endpoint for HR to manually adjust balances
   - Log adjustments in audit table

---

## 🧪 Testing Checklist

### Test Balance Display:
- [ ] Open leave request form
- [ ] Select employee
- [ ] Select leave type
- [ ] Verify balance shows from database
- [ ] Check SQL query in database logs

### Test Balance Updates:
- [ ] Submit leave request
- [ ] Check `leave_balance.pending` increased in database
- [ ] Approve leave request
- [ ] Check `leave_balance.used` increased, `pending` decreased
- [ ] Reject leave request
- [ ] Check `leave_balance.pending` decreased

### Test Balances Page:
- [ ] Open `/hr/leaves/balances`
- [ ] Verify data loads from database (not localStorage)
- [ ] Test filtering
- [ ] Test balance adjustment
- [ ] Test CSV export

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    leave_balance Table                       │
│  (employee_id, leave_type_id, year, used, pending, etc.)   │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ SQL Queries
                   │
┌──────────────────▼──────────────────────────────────────────┐
│          API: /api/hr/leaves/balances/route.ts              │
│  GET: Fetch balances | POST: Initialize/Accrue balances    │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ HTTP Requests
                   │
        ┌──────────┴──────────┬──────────────────┐
        │                     │                   │
┌───────▼────────┐  ┌────────▼────────┐  ┌──────▼──────────┐
│ Leave Request  │  │ Leave Balances  │  │ Employee Portal │
│ Form (NEW)     │  │ Page (OLD)      │  │ (OLD)           │
│ ✅ Database    │  │ ❌ localStorage  │  │ ❌ Mock Data    │
└────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## 🎯 Next Steps

1. **Fix Leave Balances Page** - Replace localStorage with database API
2. **Add Balance Update Triggers** - Auto-update balances when requests change
3. **Fix Employee Portal** - Use database API for balance display
4. **Add Audit Logging** - Track all balance changes
5. **Test End-to-End** - Submit request → Approve → Verify balance updated
