# 🔔 Alerts & Workflow Automation System

Complete documentation for automated alerts and multi-level approval workflows.

---

## 📋 Overview

The Alerts & Workflow Automation System provides intelligent monitoring, automated notifications, and multi-level approval workflows for HR operations.

**Key Features**:
- ✅ Automated license expiry alerts (90, 60, 30, 7 days)
- ✅ Attendance anomaly detection
- ✅ Leave balance monitoring
- ✅ Multi-level approval workflows
- ✅ Email notifications
- ✅ In-app alerts
- ✅ Scheduled daily checks

---

## 🔔 Alert System

### **Alert Types**

| Alert Type | Description | Severity Levels | Schedule |
|------------|-------------|-----------------|----------|
| `license_expiry` | Professional licenses expiring | warning, critical, urgent | Daily 6 AM |
| `late_arrival` | Consistent late arrivals | warning, critical | Daily 10 AM |
| `missing_checkout` | Forgot to check out | warning | Daily 10 AM |
| `high_overtime` | Excessive overtime hours | warning | Daily 10 AM |
| `consecutive_absence` | Multiple days absent | critical | Daily 10 AM |
| `leave_balance` | Low or expiring leave balance | info, warning | Weekly Mon 9 AM |

### **Severity Levels**

- **Info**: Informational, no action required
- **Warning**: Attention needed, not urgent
- **Critical**: Requires prompt action
- **Urgent**: Immediate action required

---

## 🎯 Alert Detection Rules

### **1. License Expiry Alerts**

**Schedule**: Daily at 6:00 AM

**Detection Logic**:
```typescript
Thresholds:
- 90 days before expiry → Warning
- 60 days before expiry → Warning
- 30 days before expiry → Critical
- 7 days before expiry → Urgent
```

**Notifications**:
- Email to employee
- Email to HR manager
- In-app notification

**Example Alert**:
```
Title: License Expiring in 30 Days
Message: Your Medical License (ML-2024-12345) will expire on 2024-04-15. 
         Please renew it before expiration.
Severity: Critical
Action Required: Yes
Action URL: /hr/licenses/renew
```

---

### **2. Late Arrival Pattern Detection**

**Schedule**: Daily at 10:00 AM

**Detection Logic**:
```typescript
Period: Last 7 days
Threshold: ≥3 late arrivals → Warning
          ≥5 late arrivals → Critical
```

**Notifications**:
- Alert to employee
- Email to supervisor
- Email to HR

**Example Alert**:
```
Title: Frequent Late Arrivals
Message: You have been late 5 times in the past week. 
         Please ensure punctuality.
Severity: Critical
Data: {
  late_count: 5,
  period: "last_7_days"
}
```

---

### **3. Missing Check-Out Detection**

**Schedule**: Daily at 10:00 AM

**Detection Logic**:
```typescript
Check: Previous day's attendance records
Condition: check_in exists AND check_out is NULL
```

**Notifications**:
- Alert to employee
- Action required to update attendance

**Example Alert**:
```
Title: Missing Check-Out
Message: You forgot to check out on 2024-02-27. 
         Please update your attendance record.
Severity: Warning
Action Required: Yes
Action URL: /hr/attendance/update
```

---

### **4. High Overtime Detection**

**Schedule**: Daily at 10:00 AM

**Detection Logic**:
```typescript
Period: Last 7 days
Threshold: Total overtime > 20 hours → Warning
```

**Notifications**:
- Alert to employee
- Email to HR manager

**Example Alert**:
```
Title: High Overtime Hours
Message: You have worked 25.5 overtime hours this week. 
         Please ensure work-life balance.
Severity: Warning
Data: {
  overtime_hours: 25.5,
  period: "last_7_days"
}
```

---

### **5. Consecutive Absence Detection**

**Schedule**: Daily at 10:00 AM

**Detection Logic**:
```typescript
Period: Last 7 days
Threshold: ≥3 consecutive absent days → Critical
Condition: No approved leave request for those dates
```

**Notifications**:
- Alert to employee
- Email to supervisor
- Email to HR manager

**Example Alert**:
```
Title: Consecutive Absences Detected
Message: You have been absent for 4 consecutive days. 
         Please contact HR if you need assistance.
Severity: Critical
Action Required: Yes
Data: {
  consecutive_days: 4,
  period: "last_7_days"
}
```

---

### **6. Leave Balance Alerts**

**Schedule**: Weekly on Monday at 9:00 AM

**Detection Logic**:
```typescript
Low Balance:
  Remaining leave < 5 days → Warning

Expiring Leave:
  Days until year end ≤ 60 AND remaining > 5 → Info
```

**Notifications**:
- Alert to employee

**Example Alerts**:
```
Low Balance:
Title: Low Leave Balance
Message: You have only 3 days of annual leave remaining. 
         Plan your leave accordingly.
Severity: Warning

Expiring Leave:
Title: Annual Leave Expiring Soon
Message: You have 12 days of annual leave that will expire on December 31. 
         Consider planning your leave.
Severity: Info
```

---

## 🔄 Multi-Level Approval Workflows

### **Workflow Types**

- `leave_request` - Leave approval
- `overtime_request` - Overtime approval
- `expense_claim` - Expense approval
- `loan_request` - Loan approval
- `advance_request` - Salary advance approval

### **Approval Levels**

#### **Leave Request Approval Rules**

| Leave Type | Duration | Levels | Approvers |
|------------|----------|--------|-----------|
| Emergency | Any | 0 | Auto-approved |
| Sick (with cert) | Any | 1 | Supervisor |
| Annual | ≤3 days | 1 | Supervisor |
| Annual | 4-7 days | 2 | Supervisor → HR Manager |
| Annual | >7 days | 3 | Supervisor → HR Manager → Director |

#### **Workflow Status**

- **pending**: Waiting to start
- **in_progress**: Currently being processed
- **approved**: All levels approved
- **rejected**: Rejected at any level
- **cancelled**: Cancelled by submitter

#### **Step Status**

- **pending**: Awaiting approval
- **approved**: Approved by approver
- **rejected**: Rejected by approver
- **skipped**: Skipped (e.g., approver unavailable)

---

## 🔧 API Endpoints

### **Alert APIs**

#### **GET /api/hr/alerts**
Get alerts for current user

**Query Parameters**:
- `is_read` (optional): Filter by read status
- `alert_type` (optional): Filter by type
- `severity` (optional): Filter by severity
- `page` (default: 1)
- `limit` (default: 20)

**Response**:
```json
{
  "data": [
    {
      "id": "alert-uuid",
      "alert_type": "license_expiry",
      "severity": "critical",
      "title": "License Expiring in 30 Days",
      "message": "Your Medical License will expire...",
      "data": {
        "license_type": "Medical License",
        "expiry_date": "2024-04-15",
        "days_until_expiry": 30
      },
      "is_read": false,
      "action_required": true,
      "action_url": "/hr/licenses/renew",
      "created_at": "2024-02-28T06:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

**Example**:
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/hr/alerts?is_read=false&severity=critical"
```

---

#### **PUT /api/hr/alerts/:id/read**
Mark alert as read

**Response**:
```json
{
  "data": {
    "id": "alert-uuid",
    "is_read": true,
    "read_at": "2024-02-28T10:30:00Z"
  }
}
```

**Example**:
```bash
curl -X PUT \
  -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/hr/alerts/alert-uuid-123/read
```

---

### **Workflow APIs**

#### **POST /api/hr/workflows/submit**
Submit entity for approval

**Request Body**:
```json
{
  "entity_type": "leave_request",
  "entity_id": "leave-uuid-123"
}
```

**Response**:
```json
{
  "data": {
    "workflow_id": "workflow-uuid",
    "total_levels": 2,
    "message": "Submitted for 2-level approval"
  }
}
```

**Example**:
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_type":"leave_request","entity_id":"leave-uuid-123"}' \
  http://localhost:3000/api/hr/workflows/submit
```

---

#### **POST /api/hr/workflows/:id/approve**
Approve workflow step

**Request Body**:
```json
{
  "comments": "Approved. Enjoy your vacation!"
}
```

**Response**:
```json
{
  "data": {
    "status": "in_progress",
    "next_level": 2,
    "message": "Approved. Moved to level 2"
  }
}
```

**Example**:
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"comments":"Approved"}' \
  http://localhost:3000/api/hr/workflows/workflow-uuid/approve
```

---

#### **POST /api/hr/workflows/:id/reject**
Reject workflow step

**Request Body**:
```json
{
  "reason": "Insufficient leave balance"
}
```

**Response**:
```json
{
  "data": {
    "status": "rejected",
    "message": "Workflow rejected"
  }
}
```

**Example**:
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Insufficient leave balance"}' \
  http://localhost:3000/api/hr/workflows/workflow-uuid/reject
```

---

## 💻 Programmatic Usage

### **Alert Service**

```typescript
import { alertService } from '@/services/alert-service';

// Initialize scheduled checks
alertService.initializeSchedules();

// Manually trigger checks
await alertService.checkLicenseExpiry();
await alertService.checkAttendanceAnomalies();
await alertService.checkLeaveBalances();

// Get scheduler status
const status = alertService.getStatus();
console.log(status);
// [
//   { name: 'license-expiry', running: true },
//   { name: 'attendance-anomaly', running: true },
//   { name: 'leave-balance', running: true }
// ]

// Stop all scheduled checks
alertService.stopAll();
```

### **Workflow Service**

```typescript
import { workflowService } from '@/services/workflow-service';

// Submit leave for approval
const result = await workflowService.submitForApproval(
  'leave_request',
  'leave-uuid-123',
  'employee-uuid'
);

console.log(`Workflow ID: ${result.workflow_id}`);
console.log(`Total Levels: ${result.total_levels}`);

// Approve workflow step
const approveResult = await workflowService.approveStep(
  'workflow-uuid',
  'approver-uuid',
  'Approved'
);

console.log(`Status: ${approveResult.status}`);
console.log(`Next Level: ${approveResult.next_level}`);

// Reject workflow
const rejectResult = await workflowService.rejectStep(
  'workflow-uuid',
  'approver-uuid',
  'Insufficient leave balance'
);

// Get approval status
const status = await workflowService.getApprovalStatus(
  'leave_request',
  'leave-uuid-123'
);

console.log(status);
// {
//   workflow_id: 'workflow-uuid',
//   status: 'in_progress',
//   current_level: 2,
//   total_levels: 3,
//   steps: [...]
// }

// Get pending approvals for employee
const pending = await workflowService.getPendingApprovals('employee-uuid');
console.log(`${pending.length} pending approvals`);
```

---

## 📊 Database Schema

### **Alerts Table**

```sql
CREATE TABLE alerts (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  alert_type VARCHAR(50),
  severity VARCHAR(20),
  employee_id UUID REFERENCES employees(id),
  title VARCHAR(200),
  message TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  action_required BOOLEAN DEFAULT false,
  action_url VARCHAR(500),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **Approval Workflows Table**

```sql
CREATE TABLE approval_workflows (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  entity_type VARCHAR(50),
  entity_id UUID,
  current_level INTEGER DEFAULT 1,
  total_levels INTEGER,
  status VARCHAR(20) DEFAULT 'pending',
  submitted_by UUID REFERENCES employees(id),
  submitted_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

### **Approval Steps Table**

```sql
CREATE TABLE approval_steps (
  id UUID PRIMARY KEY,
  workflow_id UUID REFERENCES approval_workflows(id),
  level INTEGER,
  approver_id UUID REFERENCES employees(id),
  approver_role VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending',
  action_date TIMESTAMP,
  comments TEXT
);
```

### **Notification Queue Table**

```sql
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  notification_type VARCHAR(50),
  recipient_id UUID REFERENCES employees(id),
  recipient_email VARCHAR(255),
  subject VARCHAR(500),
  body TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  priority INTEGER DEFAULT 5,
  scheduled_for TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP
);
```

---

## 📅 Scheduled Jobs

### **Daily Jobs**

| Job | Time | Description |
|-----|------|-------------|
| License Expiry Check | 6:00 AM | Check for expiring licenses |
| Attendance Anomaly Check | 10:00 AM | Detect attendance issues |

### **Weekly Jobs**

| Job | Day | Time | Description |
|-----|-----|------|-------------|
| Leave Balance Check | Monday | 9:00 AM | Check leave balances |

### **Cron Schedules**

```typescript
'0 6 * * *'   // Daily at 6:00 AM
'0 10 * * *'  // Daily at 10:00 AM
'0 9 * * 1'   // Monday at 9:00 AM
```

---

## 🔐 Security & Permissions

### **Alert Access**
- Employees can view their own alerts
- HR managers can view all alerts
- Admins can view all alerts

### **Workflow Access**
- Submitters can view their workflows
- Approvers can view workflows they need to approve
- HR managers can view all workflows
- Admins can view all workflows

### **Audit Logging**
All workflow actions are logged:
- Submit for approval
- Approve step
- Reject step
- User ID, timestamp, comments

---

## 📧 Email Notifications

### **Email Templates**

#### **License Expiry**
```
Subject: License Expiring Soon - [License Type]

Dear [Employee Name],

Your [License Type] ([License Number]) will expire in [Days] days 
on [Expiry Date].

Please renew it as soon as possible to avoid any disruptions.

Best regards,
HR Department
```

#### **Approval Required**
```
Subject: Approval Required: [Entity Type]

Dear [Approver Name],

You have a pending approval request from [Submitter Name].

Entity Type: [Entity Type]
Level: [Level]

Please review and approve/reject this request.

[Approve Button] [Reject Button]

Best regards,
HR System
```

#### **Approval Decision**
```
Subject: [Entity Type] [Approved/Rejected]

Dear [Employee Name],

Your [Entity Type] has been [approved/rejected].

Comments: [Comments]

Best regards,
HR Department
```

---

## 🎯 Use Cases

### **Use Case 1: License Expiry Management**

```
Day 1 (90 days before):
- System sends warning alert
- Employee receives email
- HR manager notified

Day 30 (60 days before):
- System sends warning alert
- Reminder email sent

Day 60 (30 days before):
- System sends critical alert
- Urgent email sent
- HR manager follows up

Day 83 (7 days before):
- System sends urgent alert
- Final warning email
- HR manager escalates
```

### **Use Case 2: Leave Approval Workflow**

```
Employee submits 5-day annual leave:
1. System determines 2-level approval needed
2. Creates workflow
3. Notifies supervisor (Level 1)

Supervisor approves:
1. System moves to Level 2
2. Notifies HR manager

HR Manager approves:
1. System marks workflow as approved
2. Updates leave request status
3. Notifies employee
4. Sends confirmation email
```

### **Use Case 3: Attendance Anomaly Detection**

```
Week 1:
- Employee late 3 times
- System sends warning alert
- Supervisor notified

Week 2:
- Employee late 5 times total
- System sends critical alert
- HR manager notified
- Supervisor schedules meeting
```

---

## 📁 File Structure

```
supabase/
└── migrations/
    └── 004_create_alerts_and_workflows.sql

src/
├── services/
│   ├── alert-service.ts           # Alert detection & scheduling
│   └── workflow-service.ts        # Multi-level approvals
└── app/
    └── api/
        └── hr/
            ├── alerts/
            │   ├── route.ts                    # GET alerts
            │   └── [id]/read/route.ts          # Mark as read
            └── workflows/
                ├── submit/route.ts             # Submit workflow
                └── [id]/
                    ├── approve/route.ts        # Approve step
                    └── reject/route.ts         # Reject step

docs/
└── ALERTS_AND_WORKFLOWS.md
```

---

## 🚀 Getting Started

### **1. Apply Database Migration**

```bash
psql -h your-db-host -U postgres -d your-db < supabase/migrations/004_create_alerts_and_workflows.sql
```

### **2. Initialize Alert Service**

```typescript
import { alertService } from '@/services/alert-service';

// In production, auto-starts
// In development, manually start:
alertService.initializeSchedules();
```

### **3. Test Alerts**

```bash
# Get your alerts
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/hr/alerts

# Mark alert as read
curl -X PUT \
  -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/hr/alerts/alert-id/read
```

### **4. Test Workflows**

```bash
# Submit leave for approval
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_type":"leave_request","entity_id":"leave-id"}' \
  http://localhost:3000/api/hr/workflows/submit

# Approve workflow
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"comments":"Approved"}' \
  http://localhost:3000/api/hr/workflows/workflow-id/approve
```

---

## 🎊 Summary

### **Completed Features**

✅ **Automated Alert Detection**
- License expiry (4 thresholds)
- Late arrival patterns
- Missing check-outs
- High overtime
- Consecutive absences
- Leave balance warnings

✅ **Multi-Level Approval Workflows**
- Dynamic level determination
- Role-based approvers
- Email notifications
- Status tracking

✅ **Scheduled Jobs**
- Daily license checks (6 AM)
- Daily attendance checks (10 AM)
- Weekly leave balance checks (Mon 9 AM)

✅ **Email Integration**
- Notification queue
- Template support
- Priority handling
- Retry logic

✅ **API Endpoints**
- Get alerts
- Mark alerts as read
- Submit workflows
- Approve/reject workflows

---

**Last Updated**: 2024-02-28  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
