# Staff Attendance System Documentation

## Overview

Complete staff attendance system with check-in/check-out time registration for all staff members.

## Database Structure

### Tables

#### 1. `attendance_transactions`
Stores every check-in and check-out transaction.

**Key Fields:**
- `id` - Transaction UUID
- `employee_id` - Staff UUID (references `staff.staffid`)
- `employee_name` - Staff full name
- `employee_number` - Staff custom ID
- `transaction_type` - 'IN' or 'OUT'
- `timestamp` - When the transaction occurred
- `device_type` - BIOMETRIC, MANUAL, CARD, MOBILE
- `source` - DEVICE, API, MANUAL
- `is_valid` - Transaction validity
- `processed` - Whether processed into daily summary

#### 2. `daily_attendance`
Daily summary of attendance for each staff member.

**Key Fields:**
- `id` - Summary UUID
- `employee_id` - Staff UUID
- `date` - Attendance date
- `first_in` - First check-in time
- `last_out` - Last check-out time
- `total_hours` - Total hours worked
- `status` - PRESENT, ABSENT, LEAVE, HOLIDAY

### Database Functions

#### `process_staff_attendance_transaction()`
Automatically processes check-in/out transactions and updates daily summaries.

**Parameters:**
- `p_employee_id` - Staff UUID
- `p_transaction_type` - 'IN' or 'OUT'
- `p_timestamp` - Transaction timestamp (default: NOW())
- `p_device_type` - Device type (default: 'MANUAL')
- `p_source` - Source (default: 'API')

**Returns:**
- `success` - Boolean
- `message` - Status message
- `transaction_id` - Created transaction UUID
- `daily_summary_id` - Updated/created daily summary UUID

**Example:**
```sql
SELECT * FROM process_staff_attendance_transaction(
  'staff-uuid-here'::UUID,
  'IN'::VARCHAR,
  NOW()::TIMESTAMP WITH TIME ZONE,
  'BIOMETRIC'::VARCHAR,
  'DEVICE'::VARCHAR
);
```

### Database Views

#### `staff_attendance_today`
Real-time view of today's attendance status for all staff.

**Columns:**
- `employee_id` - Staff UUID
- `employee_name` - Full name
- `employee_number` - Custom staff ID
- `role` - Staff role
- `unit` - Department/unit
- `date` - Today's date
- `first_in` - First check-in time
- `last_out` - Last check-out time
- `total_hours` - Hours worked
- `status` - Attendance status
- `current_status` - NOT_CHECKED_IN, CHECKED_IN, or CHECKED_OUT

**Usage:**
```sql
SELECT * FROM staff_attendance_today
WHERE unit = 'Emergency'
ORDER BY employee_name;
```

#### `staff_attendance_transactions_recent`
Recent attendance transactions (last 7 days).

**Usage:**
```sql
SELECT * FROM staff_attendance_transactions_recent
WHERE employee_id = 'staff-uuid'
ORDER BY timestamp DESC;
```

## API Endpoints

### 1. GET `/api/hr/attendance/staff`

#### Get Today's Attendance Status
```javascript
fetch('/api/hr/attendance/staff?today=true')
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "employee_id": "uuid",
      "employee_name": "John Smith",
      "employee_number": "STAFF-001",
      "role": "Doctor",
      "unit": "Emergency",
      "date": "2026-03-08",
      "first_in": "2026-03-08T08:30:00Z",
      "last_out": null,
      "total_hours": 0,
      "status": "PRESENT",
      "current_status": "CHECKED_IN"
    }
  ],
  "count": 44
}
```

#### Get Attendance History for Specific Staff
```javascript
fetch('/api/hr/attendance/staff?staff_id=uuid&start_date=2026-03-01&end_date=2026-03-08')
```

### 2. POST `/api/hr/attendance/staff`

Record check-in or check-out.

**Request:**
```json
{
  "staff_id": "staff-uuid",
  "transaction_type": "IN",
  "timestamp": "2026-03-08T08:30:00Z",
  "device_type": "BIOMETRIC",
  "location": "Main Entrance",
  "source": "DEVICE"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transaction processed successfully",
  "data": {
    "transaction_id": "txn-uuid",
    "daily_summary": {
      "id": "summary-uuid",
      "employee_id": "staff-uuid",
      "employee_name": "John Smith",
      "date": "2026-03-08",
      "first_in": "2026-03-08T08:30:00Z",
      "last_out": null,
      "total_hours": 0,
      "status": "PRESENT",
      "current_status": "CHECKED_IN"
    }
  }
}
```

### 3. PUT `/api/hr/attendance/staff`

Get attendance transactions (detailed log).

**Query Parameters:**
- `staff_id` - Filter by staff UUID
- `start_date` - Start date filter
- `end_date` - End date filter
- `limit` - Max records (default: 100)

## UI Pages

### 1. Biometric Attendance Page
**Path:** `/hr/attendance/biometric`

**Features:**
- Real-time clock display
- Fingerprint scanner simulation
- Employee search by name or ID
- Manual ID entry mode
- Today's transaction log
- Check-in/out statistics

**How to Use:**
1. Search for employee by name or enter employee number
2. Click the fingerprint scanner button
3. System automatically determines if it's check-in or check-out
4. Transaction is recorded in database
5. Daily summary is updated automatically

### 2. Staff Attendance History Page
**Path:** `/hr/attendance/staff-history`

**Features:**
- View today's attendance status for all staff
- Search and filter attendance records
- Date range filtering for historical data
- Export to CSV
- Real-time status indicators
- Summary statistics

**Views:**
- **Today View:** Current status of all staff (checked in, checked out, not checked in)
- **History View:** Historical attendance records with date range filter

## Deployment

### 1. Run Migration

```bash
node database/deploy_attendance_migration.js
```

This will:
- Create indexes for performance
- Create database views
- Create the `process_staff_attendance_transaction` function
- Run tests to verify everything works

### 2. Verify Setup

Check that the views are working:
```sql
-- Check today's attendance
SELECT * FROM staff_attendance_today LIMIT 10;

-- Check recent transactions
SELECT * FROM staff_attendance_transactions_recent LIMIT 10;
```

### 3. Test Check-in/Out

Navigate to `/hr/attendance/biometric` and test:
1. Search for a staff member
2. Click to check in
3. Verify transaction appears in the log
4. Click again to check out
5. Verify hours are calculated

## Data Flow

### Check-In Flow
```
User Action (UI) 
  → POST /api/hr/attendance/staff 
  → process_staff_attendance_transaction()
  → Insert into attendance_transactions
  → Create/Update daily_attendance record
  → Return updated summary
  → UI updates with new status
```

### Check-Out Flow
```
User Action (UI)
  → POST /api/hr/attendance/staff
  → process_staff_attendance_transaction()
  → Insert into attendance_transactions
  → Update daily_attendance (last_out, total_hours)
  → Return updated summary
  → UI shows total hours worked
```

## Features

✅ **Real-time Check-in/Out** - Instant recording of attendance
✅ **Automatic Hour Calculation** - System calculates total hours worked
✅ **Multiple Entry Methods** - Biometric, manual, card, mobile
✅ **Transaction Validation** - Prevents invalid check-ins/outs
✅ **Daily Summaries** - Automatic aggregation of daily attendance
✅ **Historical Records** - Complete audit trail of all transactions
✅ **Search & Filter** - Find attendance records easily
✅ **Export Capability** - Download attendance data as CSV
✅ **Real-time Status** - See who's currently checked in
✅ **Staff Integration** - Works seamlessly with staff table

## Status Indicators

### Current Status (Today View)
- **NOT_CHECKED_IN** - Staff has not checked in today
- **CHECKED_IN** - Staff is currently checked in
- **CHECKED_OUT** - Staff has checked out for the day

### Attendance Status (Historical)
- **PRESENT** - Staff attended and has check-in record
- **ABSENT** - Staff did not attend
- **LEAVE** - Staff on approved leave
- **HOLIDAY** - Public holiday

## Performance Optimizations

1. **Indexes** - Created on frequently queried fields
2. **Views** - Pre-computed queries for common operations
3. **Function** - Database-level processing for consistency
4. **Pagination** - Limits on query results

## Security

- All transactions are timestamped and immutable
- Complete audit trail maintained
- Staff IDs validated against staff table
- Transaction validation prevents duplicates
- Source tracking (device, manual, API)

## Troubleshooting

### Issue: Staff not found
**Solution:** Verify staff exists in `staff` table with valid `staffid`

### Issue: Can't check out
**Solution:** Staff must check in first. Check `attendance_transactions` for last transaction type.

### Issue: Hours not calculating
**Solution:** Ensure both `first_in` and `last_out` are set in `daily_attendance` table.

### Issue: Duplicate transactions
**Solution:** Check `validation_status` field in `attendance_transactions` table.

## Future Enhancements

- Shift scheduling integration
- Overtime calculation rules
- Late arrival notifications
- Early departure tracking
- Break time management
- Mobile app integration
- Facial recognition support
- GPS location tracking
- Automated reports
- Manager approvals for manual entries
