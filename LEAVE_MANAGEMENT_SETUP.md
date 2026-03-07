# Leave Management System - Setup & Usage Guide

## 🎯 System Overview

A comprehensive leave management system for hospital staff with:
- 8 leave types (Annual, Sick, Emergency, Maternity, Paternity, Unpaid, Hajj, Study)
- Automated balance calculation and accrual
- Multi-level approval workflow
- Leave calendar and team coverage
- Integration with existing staff and department data

## 📋 Setup Instructions

### Step 1: Create Database Schema

Run the setup endpoint to create all required tables:

```bash
POST http://localhost:3000/api/hr/leaves/setup
```

This creates 7 tables:
- `leave_types` - Leave type definitions
- `leave_balances` - Employee leave balances
- `leave_requests` - Leave request records
- `leave_approvals` - Approval workflow
- `leave_transactions` - Transaction history
- `holidays` - Holiday calendar
- `leave_policies` - Policy rules

### Step 2: Seed Initial Data

Populate leave types and holidays:

```bash
POST http://localhost:3000/api/hr/leaves/seed-data
```

This creates:
- 8 leave types with Iraqi hospital standards
- 12 holidays for 2026 (National & Religious)

### Step 3: Initialize Leave Balances

Create initial balances for all staff:

```bash
POST http://localhost:3000/api/hr/leaves/balances
Content-Type: application/json

{
  "action": "initialize"
}
```

This creates leave balances for all active staff members.

## 🔧 API Endpoints

### Leave Types

**Get all leave types:**
```
GET /api/hr/leaves/types
GET /api/hr/leaves/types?employeeId=STAFF_ID  (filtered by gender)
```

**Create leave type:**
```
POST /api/hr/leaves/types
{
  "code": "CUSTOM",
  "name": "Custom Leave",
  "category": "PAID",
  "max_days": 10,
  "accrual_method": "MONTHLY",
  "accrual_rate": 0.83
}
```

### Leave Requests

**Get leave requests:**
```
GET /api/hr/leaves/requests
GET /api/hr/leaves/requests?employeeId=STAFF_ID
GET /api/hr/leaves/requests?status=PENDING
```

**Create leave request:**
```
POST /api/hr/leaves/requests
{
  "employee_id": "STAFF_ID",
  "leave_type_id": "LEAVE_TYPE_UUID",
  "start_date": "2026-03-10",
  "end_date": "2026-03-14",
  "reason": "Family vacation",
  "emergency_contact": "John Doe",
  "emergency_phone": "+964-770-123-4567",
  "handover_to": "COLLEAGUE_STAFF_ID"
}
```

**Approve/Reject leave:**
```
POST /api/hr/leaves/requests/{REQUEST_ID}/approve
{
  "approver_id": "APPROVER_STAFF_ID",
  "action": "APPROVE",
  "comments": "Approved"
}
```

### Leave Balances

**Get employee balances:**
```
GET /api/hr/leaves/balances?employeeId=STAFF_ID&year=2026
```

**Run monthly accrual:**
```
POST /api/hr/leaves/balances
{
  "action": "accrual"
}
```

### Holidays

**Get holidays:**
```
GET /api/hr/leaves/holidays
GET /api/hr/leaves/holidays?year=2026
GET /api/hr/leaves/holidays?type=RELIGIOUS
```

**Create holiday:**
```
POST /api/hr/leaves/holidays
{
  "name": "Special Holiday",
  "date": "2026-12-25",
  "type": "SPECIAL",
  "recurring": false
}
```

### Leave Calendar

**Get leave calendar:**
```
GET /api/hr/leaves/calendar?startDate=2026-03-01&endDate=2026-03-31
GET /api/hr/leaves/calendar?startDate=2026-03-01&endDate=2026-03-31&departmentId=Cardiology
```

## 🎨 Leave Types Configuration

### 1. Annual Leave
- **Category**: PAID
- **Max Days**: 30 days/year
- **Accrual**: 2.5 days/month
- **Carry Forward**: Yes (max 10 days)
- **Notice**: 7 days

### 2. Sick Leave
- **Category**: PAID
- **Max Days**: 30 days/year
- **Accrual**: 30 days/year
- **Documentation**: Required
- **Notice**: 0 days (can be immediate)

### 3. Emergency Leave
- **Category**: PAID
- **Max Days**: 5 days/year
- **Max Consecutive**: 3 days
- **Notice**: 0 days

### 4. Maternity Leave
- **Category**: PAID
- **Max Days**: 90 days
- **Gender**: Female only
- **Documentation**: Required
- **Notice**: 30 days

### 5. Paternity Leave
- **Category**: PAID
- **Max Days**: 5 days
- **Gender**: Male only
- **Documentation**: Required
- **Notice**: 7 days

### 6. Unpaid Leave
- **Category**: UNPAID
- **Max Days**: 30 days/year
- **Max Consecutive**: 15 days
- **Notice**: 14 days

### 7. Hajj Leave
- **Category**: UNPAID
- **Max Days**: 30 days
- **Documentation**: Required
- **Notice**: 60 days

### 8. Study Leave
- **Category**: HALF_PAID
- **Max Days**: 15 days/year
- **Max Consecutive**: 10 days
- **Documentation**: Required
- **Notice**: 14 days

## 🔄 Approval Workflow

### Level 1: Direct Supervisor
- All leave requests require supervisor approval
- Auto-assigned based on `reporting_to` field in staff table

### Level 2: Department Head (Optional)
- Required for leaves > 5 days
- Required for special leave types

### Level 3: HR Approval (Optional)
- Required for Maternity, Hajj, Study leaves
- Required for leaves > 15 days

### Auto-Escalation
- Pending approvals escalate after 48 hours
- Emergency leaves can be auto-approved based on policy

## 📊 Balance Calculation

### Opening Balance
- Carried forward from previous year (if applicable)
- Maximum carry forward as per leave type rules

### Accrual Methods

**Monthly Accrual:**
- Annual Leave: 2.5 days/month
- Accrued on 1st of each month
- Pro-rated for new joiners

**Annual Accrual:**
- Sick Leave: 30 days on January 1st
- Emergency Leave: 5 days on January 1st

**No Accrual:**
- Maternity, Paternity, Hajj, Study
- Available as needed, subject to eligibility

### Balance Formula
```
Available Balance = Opening Balance + Accrued - Used - Pending
```

## 🗓️ Working Days Calculation

- Excludes Fridays (Iraqi weekend)
- Excludes official holidays
- Counts only working days

Example:
- Request: March 10-14 (5 calendar days)
- Friday March 14 excluded
- Working days: 4 days

## 🎯 Integration with Staff Data

### Staff Table Fields Used
- `staffid` - Employee identifier
- `firstname`, `lastname` - Employee name
- `unit` - Department (for calendar filtering)
- `specialty` - Role information
- `gender` - For gender-specific leaves
- `reporting_to` - For approval chain

### Department Integration
- Department-based leave calendar
- Coverage gap detection
- Team leave visibility

## 📱 UI Pages

### Dashboard (`/hr/leaves`)
- Leave balance overview
- Pending requests
- Quick actions
- Team calendar preview

### New Request (`/hr/leaves/requests/new`)
- Leave type selection
- Date picker with holiday highlighting
- Balance check
- Handover assignment

### My Requests (`/hr/leaves/requests`)
- All leave requests
- Status tracking
- Cancel/edit pending requests

### Approvals (`/hr/leaves/approvals`)
- Pending approvals
- Request details
- Approve/reject actions
- Team impact view

### Calendar (`/hr/leaves/calendar`)
- Monthly/weekly view
- Team leaves
- Holiday markers
- Coverage analysis

### Balances (`/hr/leaves/balances`)
- Current balances
- Transaction history
- Accrual schedule
- Carry forward preview

## 🔧 Maintenance Tasks

### Monthly Accrual (Run on 1st of month)
```bash
POST /api/hr/leaves/balances
{
  "action": "accrual"
}
```

### Year-End Carry Forward (Run on December 31st)
```sql
-- Automated process to carry forward eligible leave balances
```

### Balance Reconciliation
```bash
POST /api/hr/leaves/balances
{
  "action": "reconcile"
}
```

## 🎉 Quick Start Test

1. **Setup database:**
   ```bash
   curl -X POST http://localhost:3000/api/hr/leaves/setup
   ```

2. **Seed data:**
   ```bash
   curl -X POST http://localhost:3000/api/hr/leaves/seed-data
   ```

3. **Initialize balances:**
   ```bash
   curl -X POST http://localhost:3000/api/hr/leaves/balances \
     -H "Content-Type: application/json" \
     -d '{"action":"initialize"}'
   ```

4. **Check leave types:**
   ```bash
   curl http://localhost:3000/api/hr/leaves/types
   ```

5. **View balances for a staff member:**
   ```bash
   curl "http://localhost:3000/api/hr/leaves/balances?employeeId=YOUR_STAFF_ID&year=2026"
   ```

6. **Create a leave request:**
   ```bash
   curl -X POST http://localhost:3000/api/hr/leaves/requests \
     -H "Content-Type: application/json" \
     -d '{
       "employee_id": "YOUR_STAFF_ID",
       "leave_type_id": "LEAVE_TYPE_UUID",
       "start_date": "2026-03-10",
       "end_date": "2026-03-14",
       "reason": "Test leave request"
     }'
   ```

## ✅ Success Indicators

- ✅ All 7 tables created successfully
- ✅ 8 leave types seeded
- ✅ 12 holidays for 2026 created
- ✅ Leave balances initialized for all staff
- ✅ Leave requests can be created
- ✅ Approval workflow functioning
- ✅ Balance calculations accurate
- ✅ Calendar showing team leaves

## 🚀 Next Steps

1. **UI Development**: Complete frontend interfaces
2. **Notifications**: Email/SMS for approvals
3. **Reports**: Advanced analytics and exports
4. **Mobile App**: Mobile-friendly interface
5. **Integration**: Connect with payroll system

Your advanced leave management system is now ready to use! 🎊
