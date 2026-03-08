# 🧑‍💼 Employee Self-Service Portal - Complete Guide

**Date:** March 8, 2026  
**Status:** ✅ FULLY FUNCTIONAL

---

## 🎯 **Overview**

The Employee Portal at `/employee` is a **personalized self-service dashboard** where each logged-in employee can manage their own:
- Leave requests (Create, View, Delete)
- Attendance records
- Personal profile information
- Password changes

**This is NOT an employee directory** - it's a personal workspace for the logged-in employee only.

---

## 🌐 **Access URL**

```
http://localhost:3000/employee
```

---

## 📋 **Features by Tab**

### **1. Overview Tab** (Default)

**Leave Balances:**
- View all leave types with remaining days
- See used vs. total allocation
- Real-time balance updates

**Quick Actions:**
- Request Leave - Direct link to create new leave request
- View Requests - Switch to Leaves tab
- My Attendance - Switch to Attendance tab
- Settings - Switch to Profile tab

**Recent Leave Requests:**
- Shows last 3 leave requests
- Status badges (Approved, Pending, Rejected)
- Date ranges and duration

---

### **2. My Leaves Tab**

**Full Leave Request Management:**

**View All Requests:**
- Complete list of all leave requests
- Status color coding:
  - 🟢 Green: APPROVED
  - 🟡 Yellow: PENDING
  - 🔴 Red: REJECTED
  - ⚪ Gray: CANCELLED

**Request Details:**
- Leave type name
- Start and end dates
- Number of working days
- Reason for leave
- Request submission date
- Current status

**Actions:**
- ➕ **Create New Request** - Button links to `/hr/leaves/requests/new`
- 🗑️ **Delete Pending Requests** - Trash icon for PENDING requests only
- 👁️ **View Details** - Click on any request card

---

### **3. Attendance Tab**

**Personal Attendance Records:**

**Last 30 Days:**
- Date of attendance
- Check-in time
- Check-out time
- Hours worked
- Status (Present, Absent, Late, Leave)

**Status Color Coding:**
- 🟢 Green: PRESENT
- 🔴 Red: ABSENT
- 🟠 Orange: LATE
- 🔵 Blue: LEAVE

---

### **4. Profile & Settings Tab**

**Personal Information Management:**

**Editable Fields:**
- ✏️ Name
- ✏️ Email
- ✏️ Phone

**Read-Only Fields:**
- 🔒 Employee Number
- 🔒 Department
- 🔒 Position

**Edit Mode:**
1. Click "Edit Profile" button
2. Modify editable fields
3. Click "Save" to update or "Cancel" to discard changes
4. Success message on save

**Change Password:**
1. Click "Change Password" button
2. Enter current password
3. Enter new password
4. Confirm new password
5. Click "Update Password"
6. System validates passwords match
7. Success message on update

---

## 🔗 **Integration with HR System**

### **API Endpoints Used:**

**Employee Profile:**
```
GET /api/hr/employees/{user_id}
PUT /api/hr/employees/{user_id}
```

**Leave Balances:**
```
GET /api/hr/leaves/balances?employee_id={user_id}
```

**Leave Requests:**
```
GET /api/hr/leaves?employee_id={user_id}
DELETE /api/hr/leaves/{request_id}
```

**Attendance Records:**
```
GET /api/hr/attendance?employee_id={user_id}&start_date={date}&end_date={date}
```

**Password Change:**
```
POST /api/auth/change-password
```

---

## 🎨 **User Interface**

### **Header:**
- Page title: "My Employee Portal"
- Welcome message with employee name
- Employee number badge

### **Tab Navigation:**
- Clean tab interface
- Active tab highlighted in blue
- Smooth transitions between tabs

### **Color Scheme:**
- Blue: Primary actions, leave balances
- Green: Approved, present, success actions
- Yellow: Pending status
- Red: Rejected, absent, delete actions
- Orange: Late status, password change
- Purple: Attendance features
- Gray: Cancelled, disabled fields

---

## 💡 **User Workflows**

### **Workflow 1: Request Leave**

1. Navigate to `/employee`
2. Click "Request Leave" in Quick Actions OR
3. Switch to "My Leaves" tab
4. Click "New Request" button
5. Fill out leave request form at `/hr/leaves/requests/new`
6. Submit request
7. Return to Employee Portal to see new request in "My Leaves" tab

### **Workflow 2: Check Leave Balance**

1. Navigate to `/employee`
2. View "Leave Balances" section in Overview tab
3. See remaining days for each leave type
4. Check used vs. total allocation

### **Workflow 3: Update Profile**

1. Navigate to `/employee`
2. Switch to "Profile & Settings" tab
3. Click "Edit Profile"
4. Update name, email, or phone
5. Click "Save"
6. Confirmation message appears
7. Profile updated in database

### **Workflow 4: Change Password**

1. Navigate to `/employee`
2. Switch to "Profile & Settings" tab
3. Click "Change Password"
4. Enter current password
5. Enter new password twice
6. Click "Update Password"
7. Confirmation message appears
8. Password updated

### **Workflow 5: Delete Pending Request**

1. Navigate to `/employee`
2. Switch to "My Leaves" tab
3. Find PENDING request
4. Click trash icon
5. Confirm deletion
6. Request removed from list

### **Workflow 6: View Attendance**

1. Navigate to `/employee`
2. Switch to "Attendance" tab
3. View last 30 days of attendance records
4. Check check-in/out times and status

---

## 🔒 **Security & Permissions**

**Data Access:**
- ✅ Employee can ONLY see their own data
- ✅ Employee ID from logged-in user session
- ✅ All API calls filtered by `employee_id={user.id}`
- ❌ Cannot view other employees' information
- ❌ Cannot modify other employees' data

**Actions Allowed:**
- ✅ View own profile, leaves, attendance
- ✅ Edit own name, email, phone
- ✅ Create new leave requests
- ✅ Delete own PENDING leave requests
- ✅ Change own password
- ❌ Cannot delete APPROVED/REJECTED requests
- ❌ Cannot modify employee number, department, position
- ❌ Cannot approve/reject leave requests (manager function)

---

## 📊 **Data Display**

### **Leave Balances:**
```
Annual Leave
25 days remaining
Used: 5/30
```

### **Leave Request Card:**
```
Annual Leave
01/15/2026 - 01/20/2026
Taking time off for family vacation
[PENDING]
5 working days | Requested 01/10/2026
[🗑️ Delete]
```

### **Attendance Record:**
```
03/07/2026
In: 08:30 AM | Out: 05:00 PM | 8h
[PRESENT]
```

---

## 🚀 **Quick Reference**

### **Main Actions:**

| Action | Location | Button/Link |
|--------|----------|-------------|
| Request Leave | Overview Tab | "Request Leave" button |
| View All Requests | My Leaves Tab | Tab navigation |
| Delete Request | My Leaves Tab | Trash icon (PENDING only) |
| Edit Profile | Profile Tab | "Edit Profile" button |
| Change Password | Profile Tab | "Change Password" button |
| View Attendance | Attendance Tab | Tab navigation |

### **Status Colors:**

| Status | Color | Badge |
|--------|-------|-------|
| APPROVED | Green | 🟢 |
| PENDING | Yellow | 🟡 |
| REJECTED | Red | 🔴 |
| CANCELLED | Gray | ⚪ |
| PRESENT | Green | 🟢 |
| ABSENT | Red | 🔴 |
| LATE | Orange | 🟠 |
| LEAVE | Blue | 🔵 |

---

## 🔧 **Technical Details**

### **Component Structure:**
```typescript
EmployeePage Component
├── State Management
│   ├── profile (EmployeeProfile)
│   ├── leaveBalances (LeaveBalance[])
│   ├── leaveRequests (LeaveRequest[])
│   ├── attendanceRecords (AttendanceRecord[])
│   ├── activeTab (overview | leaves | attendance | profile)
│   ├── editingProfile (boolean)
│   └── showPasswordChange (boolean)
├── Data Loading (useEffect)
│   ├── Load employee profile
│   ├── Load leave balances
│   ├── Load leave requests
│   └── Load attendance records
├── CRUD Operations
│   ├── handleSaveProfile()
│   ├── handleChangePassword()
│   └── handleDeleteLeaveRequest()
└── UI Rendering
    ├── Header
    ├── Tab Navigation
    └── Tab Content (conditional)
```

### **Interfaces:**
```typescript
interface EmployeeProfile {
  id: string;
  name: string;
  employee_number: string;
  department: string;
  position: string;
  email: string;
  phone: string;
  join_date: string;
  status: string;
}

interface LeaveBalance {
  leave_type: string;
  total_days: number;
  used_days: number;
  remaining_days: number;
}

interface LeaveRequest {
  id: string;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  working_days_count: number;
  status: string;
  reason: string;
  created_at: string;
}

interface AttendanceRecord {
  date: string;
  check_in: string;
  check_out: string;
  status: string;
  hours_worked: number;
}
```

---

## ✅ **Testing Checklist**

- [x] Employee portal loads successfully
- [x] Shows logged-in employee's name and number
- [x] Leave balances display correctly
- [x] Leave requests list shows employee's requests only
- [x] Can create new leave request (links to form)
- [x] Can delete PENDING leave requests
- [x] Cannot delete APPROVED/REJECTED requests
- [x] Attendance records show last 30 days
- [x] Can edit profile fields (name, email, phone)
- [x] Cannot edit restricted fields (employee number, department, position)
- [x] Can change password with validation
- [x] All tabs switch correctly
- [x] Status colors display correctly
- [x] Responsive design works on mobile/tablet/desktop

---

## 🎉 **Summary**

The Employee Portal is a **fully functional, personalized self-service dashboard** that allows employees to:

✅ Manage their own leave requests  
✅ View leave balances and history  
✅ Track attendance records  
✅ Update personal information  
✅ Change their password  

**All data is scoped to the logged-in employee only** - providing a secure, private workspace for each employee to manage their HR-related tasks independently.

**Access it now at:** `http://localhost:3000/employee`

---

**The employee portal is ready for production use!** 🚀
