# 🏥 HR API Documentation

Complete REST API documentation for all HR operations in Tibbna Hospital system.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Response Format](#response-format)
4. [Employees API](#employees-api)
5. [Attendance API](#attendance-api)
6. [Leave Management API](#leave-management-api)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)

---

## 🎯 Overview

The HR API provides comprehensive endpoints for managing all HR operations including:
- Employee management (CRUD operations)
- Attendance tracking (check-in/out with automatic calculations)
- Leave management (requests, approvals, rejections)
- Payroll operations (calculation, approval, file generation)

**Base URL**: `/api/hr`

---

## 🔐 Authentication

All API endpoints require authentication using Bearer tokens.

### Headers Required

```http
Authorization: Bearer <your_access_token>
Content-Type: application/json
```

### User Roles

- **employee**: Basic access to own data
- **supervisor**: Can manage team members
- **hr_manager**: Full HR operations access
- **admin**: Complete system access

---

## 📦 Response Format

All API responses follow this standard format:

### Success Response

```json
{
  "data": { /* response data */ },
  "pagination": {  // Optional, for list endpoints
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Error Response

```json
{
  "error": "Error message description"
}
```

---

## 👥 Employees API

### List Employees

**GET** `/api/hr/employees`

Get a paginated list of employees with optional filtering.

**Query Parameters:**
- `department_id` (UUID, optional): Filter by department
- `employment_status` (string, optional): Filter by status (ACTIVE, ON_LEAVE, SUSPENDED, TERMINATED)
- `employment_type` (string, optional): Filter by type (FULL_TIME, PART_TIME, CONTRACT)
- `search` (string, optional): Search by name, employee number, or email
- `page` (number, default: 1): Page number
- `limit` (number, default: 20, max: 100): Items per page

**Required Role**: Any authenticated user

**Example Request:**
```http
GET /api/hr/employees?department_id=abc-123&status=ACTIVE&page=1&limit=20
Authorization: Bearer <token>
```

**Example Response:**
```json
{
  "data": [
    {
      "id": "emp-uuid-123",
      "employee_number": "EMP-2024-001",
      "first_name": "Ahmed",
      "last_name": "Al-Rashidi",
      "email": "ahmed@hospital.com",
      "employment_status": "ACTIVE",
      "departments": {
        "id": "dept-uuid",
        "name": "Cardiology",
        "code": "CARD"
      },
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 75,
    "pages": 4
  }
}
```

---

### Get Single Employee

**GET** `/api/hr/employees/:id`

Get detailed information about a specific employee.

**Required Role**: Employee (own data), HR Manager, Admin

**Example Request:**
```http
GET /api/hr/employees/emp-uuid-123
Authorization: Bearer <token>
```

**Example Response:**
```json
{
  "data": {
    "id": "emp-uuid-123",
    "employee_number": "EMP-2024-001",
    "first_name": "Ahmed",
    "last_name": "Al-Rashidi",
    "email": "ahmed@hospital.com",
    "phone": "+964-770-100-0001",
    "date_of_birth": "1990-01-15",
    "employment_status": "ACTIVE",
    "employment_type": "FULL_TIME",
    "hire_date": "2020-01-01",
    "base_salary": 5000000,
    "departments": {
      "id": "dept-uuid",
      "name": "Cardiology",
      "code": "CARD",
      "type": "CLINICAL"
    },
    "qualifications": [...],
    "specialties": [...],
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

---

### Create Employee

**POST** `/api/hr/employees`

Create a new employee record.

**Required Role**: HR Manager, Admin

**Request Body:**
```json
{
  "employee_number": "EMP-2024-100",
  "first_name": "Fatima",
  "last_name": "Hassan",
  "email": "fatima@hospital.com",
  "phone": "+964-770-100-0100",
  "date_of_birth": "1995-05-20",
  "gender": "FEMALE",
  "nationality": "Iraqi",
  "national_id": "1234567890",
  "department_id": "dept-uuid-123",
  "job_title": "Nurse",
  "employment_type": "FULL_TIME",
  "employment_status": "ACTIVE",
  "hire_date": "2024-02-01",
  "base_salary": 2500000,
  "salary_grade": "G5"
}
```

**Example Response:**
```json
{
  "data": {
    "id": "new-emp-uuid",
    "employee_number": "EMP-2024-100",
    "first_name": "Fatima",
    "last_name": "Hassan",
    ...
  }
}
```

---

### Update Employee

**PUT** `/api/hr/employees/:id`

Update an existing employee record.

**Required Role**: HR Manager, Admin

**Request Body:** (All fields optional)
```json
{
  "employment_status": "ON_LEAVE",
  "base_salary": 3000000,
  "department_id": "new-dept-uuid"
}
```

---

### Delete Employee (Soft Delete)

**DELETE** `/api/hr/employees/:id`

Soft delete an employee by setting status to TERMINATED.

**Required Role**: HR Manager, Admin

**Example Response:**
```json
{
  "data": {
    "message": "Employee terminated successfully",
    "data": {
      "id": "emp-uuid-123",
      "employment_status": "TERMINATED",
      "termination_date": "2024-02-28",
      "active": false
    }
  }
}
```

---

## ⏰ Attendance API

### Check In

**POST** `/api/hr/attendance/check-in`

Clock in for the day with automatic timestamp recording.

**Required Role**: Any authenticated user

**Request Body:**
```json
{
  "employee_id": "emp-uuid-123",
  "device_id": "DEVICE-001",
  "location": {
    "latitude": 33.3152,
    "longitude": 44.3661,
    "address": "Baghdad, Iraq"
  },
  "notes": "Regular check-in"
}
```

**Example Response:**
```json
{
  "data": {
    "id": "attendance-uuid",
    "employee_id": "emp-uuid-123",
    "attendance_date": "2024-02-28",
    "check_in": "2024-02-28T08:00:00Z",
    "check_out": null,
    "status": "PRESENT",
    "message": "Checked in successfully"
  }
}
```

**Business Rules:**
- Cannot check in twice on the same day without checking out first
- Check-in time is automatically recorded
- Creates attendance record with status PRESENT

---

### Check Out

**POST** `/api/hr/attendance/check-out`

Clock out with automatic hours calculation.

**Required Role**: Any authenticated user

**Request Body:**
```json
{
  "attendance_id": "attendance-uuid",
  "device_id": "DEVICE-001",
  "location": {
    "latitude": 33.3152,
    "longitude": 44.3661
  },
  "notes": "End of shift"
}
```

**Example Response:**
```json
{
  "data": {
    "id": "attendance-uuid",
    "check_in": "2024-02-28T08:00:00Z",
    "check_out": "2024-02-28T17:00:00Z",
    "total_hours": 9.0,
    "overtime_hours": 1.0,
    "message": "Checked out successfully. Total hours: 9h, Overtime: 1h"
  }
}
```

**Automatic Calculations:**
- `total_hours` = check_out - check_in (in hours)
- `overtime_hours` = max(total_hours - 8, 0)
- Standard work day is 8 hours

---

### List Attendance Records

**GET** `/api/hr/attendance`

Get attendance records with filtering options.

**Query Parameters:**
- `employee_id` (UUID, optional): Filter by employee
- `start_date` (date, optional): Filter from date (YYYY-MM-DD)
- `end_date` (date, optional): Filter to date (YYYY-MM-DD)
- `status` (string, optional): Filter by status
- `page` (number, default: 1)
- `limit` (number, default: 20)

**Example Request:**
```http
GET /api/hr/attendance?employee_id=emp-uuid&start_date=2024-02-01&end_date=2024-02-28
```

---

### Daily Attendance Summary

**GET** `/api/hr/attendance/daily-summary`

Get comprehensive attendance summary for a specific date.

**Query Parameters:**
- `date` (date, optional, default: today): Date to get summary for

**Example Response:**
```json
{
  "data": {
    "date": "2024-02-28",
    "total_employees": 75,
    "present": 68,
    "absent": 5,
    "late": 12,
    "on_leave": 2,
    "checked_in": 10,
    "checked_out": 58,
    "attendance_records": [...],
    "absent_employees": [...]
  }
}
```

**Metrics Explained:**
- `total_employees`: Total active employees
- `present`: Employees who checked in
- `absent`: Employees who didn't check in
- `late`: Employees who checked in after 9:00 AM
- `checked_in`: Currently checked in (not checked out yet)
- `checked_out`: Completed attendance for the day

---

## 🏖️ Leave Management API

### List Leave Requests

**GET** `/api/hr/leaves`

Get leave requests with filtering options.

**Query Parameters:**
- `employee_id` (UUID, optional)
- `status` (enum, optional): PENDING, APPROVED, REJECTED, CANCELLED
- `start_date` (date, optional)
- `end_date` (date, optional)
- `leave_type_id` (UUID, optional)
- `page` (number, default: 1)
- `limit` (number, default: 20)

---

### Submit Leave Request

**POST** `/api/hr/leaves`

Submit a new leave request with automatic validation.

**Required Role**: Any authenticated user

**Request Body:**
```json
{
  "employee_id": "emp-uuid-123",
  "leave_type_id": "leave-type-uuid",
  "start_date": "2024-03-01",
  "end_date": "2024-03-05",
  "total_days": 5,
  "reason": "Family vacation",
  "contact_number": "+964-770-100-0001"
}
```

**Validations:**
- End date must be after start date
- Cannot overlap with existing approved/pending leaves
- Leave balance check (if leave type specified)

**Example Response:**
```json
{
  "data": {
    "id": "leave-uuid",
    "request_number": "LR-1709136000-ABC123",
    "employee_id": "emp-uuid-123",
    "start_date": "2024-03-01",
    "end_date": "2024-03-05",
    "total_days": 5,
    "status": "PENDING",
    "message": "Leave request submitted successfully"
  }
}
```

---

### Approve Leave Request

**PUT** `/api/hr/leaves/:id/approve`

Approve a pending leave request.

**Required Role**: Supervisor, HR Manager, Admin

**Request Body:**
```json
{
  "approver_id": "approver-uuid",
  "remarks": "Approved for family vacation"
}
```

**Example Response:**
```json
{
  "data": {
    "id": "leave-uuid",
    "status": "APPROVED",
    "approver_1_id": "approver-uuid",
    "approver_1_status": "APPROVED",
    "approver_1_date": "2024-02-28T10:00:00Z",
    "approver_1_remarks": "Approved for family vacation",
    "message": "Leave request approved successfully"
  }
}
```

---

### Reject Leave Request

**PUT** `/api/hr/leaves/:id/reject`

Reject a pending leave request.

**Required Role**: Supervisor, HR Manager, Admin

**Request Body:**
```json
{
  "rejected_by": "user-uuid",
  "rejection_reason": "Insufficient staffing during requested period"
}
```

**Example Response:**
```json
{
  "data": {
    "id": "leave-uuid",
    "status": "REJECTED",
    "rejected_by": "user-uuid",
    "rejected_at": "2024-02-28T10:00:00Z",
    "rejection_reason": "Insufficient staffing during requested period",
    "message": "Leave request rejected"
  }
}
```

---

## ❌ Error Handling

### HTTP Status Codes

- `200 OK`: Successful GET request
- `201 Created`: Successful POST request
- `400 Bad Request`: Validation error or business rule violation
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

### Error Response Format

```json
{
  "error": "Detailed error message"
}
```

### Common Errors

**Validation Error:**
```json
{
  "error": "Validation error: First name is required, Email must be valid"
}
```

**Authentication Error:**
```json
{
  "error": "Unauthorized - Please login"
}
```

**Authorization Error:**
```json
{
  "error": "Forbidden - Insufficient permissions"
}
```

**Business Rule Violation:**
```json
{
  "error": "Already checked in today. Please check out first."
}
```

---

## 🚦 Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Standard endpoints**: 100 requests per minute per user
- **Check-in/Check-out**: 10 requests per minute per user
- **Bulk operations**: 20 requests per minute per user

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1709136060
```

---

## 🔍 Audit Logging

All write operations (CREATE, UPDATE, DELETE, APPROVE, REJECT) are automatically logged with:
- User ID who performed the action
- Action type
- Entity type and ID
- Before/after changes (for updates)
- Timestamp

Audit logs can be queried for compliance and security purposes.

---

## 📝 Best Practices

1. **Always include authentication headers** in all requests
2. **Use pagination** for list endpoints to improve performance
3. **Handle errors gracefully** and display user-friendly messages
4. **Validate data client-side** before sending to API
5. **Use appropriate HTTP methods** (GET for reading, POST for creating, PUT for updating, DELETE for removing)
6. **Check rate limits** and implement exponential backoff for retries
7. **Store sensitive data securely** (never log passwords or tokens)

---

## 🔄 Changelog

### Version 1.0.0 (2024-02-28)
- Initial release
- Employees API with full CRUD
- Attendance API with check-in/out and calculations
- Leave Management API with approval workflow
- Authentication and authorization middleware
- Comprehensive validation schemas
- Audit logging for all operations

---

## 📞 Support

For API support or questions:
- Email: api-support@hospital.com
- Documentation: https://docs.hospital.com/api
- Status Page: https://status.hospital.com

---

**Last Updated**: 2024-02-28  
**API Version**: 1.0.0  
**Status**: Production Ready
