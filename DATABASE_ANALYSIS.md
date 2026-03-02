# 🗄️ HR Apps & Models Database Analysis

## Overview
Analysis of HR applications, models, and their database connections and engines.

---

## 🏗️ **Database Architecture**

### **Primary Database: Supabase (PostgreSQL)**
- **Engine**: PostgreSQL 15+
- **Connection**: Supabase Client SDK
- **Environment Variables**: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

### **Secondary Database: OpenEHR (PostgreSQL)**
- **Engine**: PostgreSQL
- **Connection**: Direct postgres client
- **Environment Variable**: `OPENEHR_DATABASE_URL`

### **Tertiary Database: EHRbase (Neon PostgreSQL)**
- **Engine**: Neon PostgreSQL (PostgreSQL)
- **Connection**: Direct postgres client
- **Environment Variables**: `TIBBNA_DATABASE_URL`, `DATABASE_URL`

---

## 📊 **HR Modules & Database Connections**

### **1. HR Dashboard Module**
**Path**: `src/app/hr/dashboard/`
**Database**: Supabase
**Connection**: Supabase Client SDK
**Tables Used**:
- `employees`
- `attendance_records`
- `leave_requests`
- `payroll_transactions`
- `departments`
- `alerts`

**API Endpoint**: `/api/hr/dashboard/metrics`
```typescript
const supabase = createClient(supabaseUrl, supabaseKey);
const { count: totalActiveEmployees } = await supabase
  .from('employees')
  .select('*', { count: 'exact', head: true })
  .eq('employment_status', 'active');
```

### **2. Employees Management Module**
**Path**: `src/app/api/hr/employees/`
**Database**: Supabase
**Connection**: Supabase Client SDK
**Tables Used**:
- `employees`
- `departments`

**API Endpoint**: `/api/hr/employees`
```typescript
const supabase = createClient(supabaseUrl, supabaseKey);
const { data: employees } = await supabase
  .from('employees')
  .select('*')
  .order('created_at', { ascending: false });
```

### **3. Attendance Module**
**Path**: `src/app/api/hr/attendance/`
**Database**: Supabase
**Connection**: Supabase Client SDK
**Tables Used**:
- `attendance_records`
- `employees`
- `shifts`

### **4. Leave Management Module**
**Path**: `src/app/api/hr/leaves/`
**Database**: Supabase
**Connection**: Supabase Client SDK
**Tables Used**:
- `leave_requests`
- `leave_types`
- `leave_balances`
- `employees`

### **5. Payroll Module**
**Path**: `src/app/api/hr/payroll/`
**Database**: Supabase
**Connection**: Supabase Client SDK
**Tables Used**:
- `payroll_transactions`
- `payroll_periods`
- `employees`
- `attendance_records`

### **6. Shift Management Module**
**Path**: `src/app/api/hr/shifts/`
**Database**: Supabase
**Connection**: Supabase Client SDK
**Tables Used**:
- `shifts`
- `shift_schedules`
- `employees`

### **7. Workflows Module**
**Path**: `src/app/api/hr/workflows/`
**Database**: Supabase
**Connection**: Supabase Client SDK
**Tables Used**:
- `approval_workflows`
- `approval_steps`
- `employees`

### **8. Alerts Module**
**Path**: `src/app/api/hr/alerts/`
**Database**: Supabase
**Connection**: Supabase Client SDK
**Tables Used**:
- `alerts`
- `alert_rules`
- `notification_queue`

---

## 🏥 **OpenEHR Integration Modules**

### **1. OpenEHR Departments Module**
**Path**: `src/app/api/openehr/departments/`
**Database**: OpenEHR PostgreSQL
**Connection**: Direct postgres client
**Tables Used**:
- `departments`

**API Endpoint**: `/api/openehr/departments`
```typescript
import postgres from 'postgres';
const sql = postgres(process.env.OPENEHR_DATABASE_URL!, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});
const departments = await sql.unsafe(query);
```

### **2. OpenEHR Staff Module**
**Path**: `src/app/api/openehr/staff/`
**Database**: OpenEHR PostgreSQL
**Connection**: Direct postgres client
**Tables Used**:
- `staff`

### **3. OpenEHR Connection Test**
**Path**: `src/app/api/test-openehr-connection/`
**Database**: OpenEHR PostgreSQL
**Connection**: Direct postgres client
**Purpose**: Test database connectivity and list tables

---

## 🏥 **EHRbase Integration Modules**

### **1. EHRbase Doctors Module**
**Path**: `src/app/api/ehrbase-doctors/`
**Database**: Neon PostgreSQL (EHRbase)
**Connection**: Direct postgres client
**Tables Used**:
- `doctors` (assumed)

**API Endpoint**: `/api/ehrbase-doctors`
```typescript
const databaseUrl = process.env.TIBBNA_DATABASE_URL || process.env.DATABASE_URL;
const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});
```

---

## 🔧 **Service Layer Database Connections**

### **1. Payroll Calculator Service**
**Path**: `src/services/payroll-calculator.ts`
**Database**: Supabase (for data persistence)
**Connection**: Supabase Client SDK
**Purpose**: Business logic calculations (can work without DB)

### **2. Health Check Service**
**Path**: `src/app/api/health/route.ts`
**Database**: Supabase
**Connection**: Supabase Client SDK
**Purpose**: System health monitoring

---

## 📋 **Database Engine Summary**

| Module | Database | Engine | Connection Method | Environment Variable |
|--------|----------|--------|------------------|---------------------|
| HR Dashboard | Supabase | PostgreSQL 15+ | Supabase SDK | `NEXT_PUBLIC_SUPABASE_URL` |
| Employees | Supabase | PostgreSQL 15+ | Supabase SDK | `NEXT_PUBLIC_SUPABASE_URL` |
| Attendance | Supabase | PostgreSQL 15+ | Supabase SDK | `NEXT_PUBLIC_SUPABASE_URL` |
| Leave Management | Supabase | PostgreSQL 15+ | Supabase SDK | `NEXT_PUBLIC_SUPABASE_URL` |
| Payroll | Supabase | PostgreSQL 15+ | Supabase SDK | `NEXT_PUBLIC_SUPABASE_URL` |
| Shifts | Supabase | PostgreSQL 15+ | Supabase SDK | `NEXT_PUBLIC_SUPABASE_URL` |
| Workflows | Supabase | PostgreSQL 15+ | Supabase SDK | `NEXT_PUBLIC_SUPABASE_URL` |
| Alerts | Supabase | PostgreSQL 15+ | Supabase SDK | `NEXT_PUBLIC_SUPABASE_URL` |
| OpenEHR Departments | OpenEHR | PostgreSQL | Direct postgres | `OPENEHR_DATABASE_URL` |
| OpenEHR Staff | OpenEHR | PostgreSQL | Direct postgres | `OPENEHR_DATABASE_URL` |
| EHRbase Doctors | Neon | PostgreSQL | Direct postgres | `TIBBNA_DATABASE_URL` |

---

## 🔄 **Data Flow Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Next.js API   │    │   Databases     │
│   (React)       │───▶│   (API Routes)  │───▶│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
                    ▼         ▼         ▼
            ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
            │  Supabase   │ │  OpenEHR    │ │  EHRbase    │
            │ (Primary)   │ │(Secondary)  │ │(Tertiary)   │
            │ PostgreSQL  │ │ PostgreSQL  │ │ Neon PG     │
            └─────────────┘ └─────────────┘ └─────────────┘
```

---

## 🎯 **Key Findings**

### **Primary Database (Supabase)**
- **Used by**: All core HR modules
- **Tables**: 15+ HR-specific tables
- **Connection**: Supabase SDK (managed connection)
- **Features**: Built-in auth, RLS, real-time

### **Secondary Database (OpenEHR)**
- **Used by**: OpenEHR integration modules
- **Tables**: `departments`, `staff`
- **Connection**: Direct postgres client
- **Purpose**: External EHR system integration

### **Tertiary Database (EHRbase)**
- **Used by**: EHRbase integration
- **Tables**: `doctors` (assumed)
- **Connection**: Direct postgres client
- **Provider**: Neon (serverless PostgreSQL)

---

## 🚀 **Connection Status**

### **Working Connections**
- ✅ **Supabase**: Configured and used by all HR modules
- ✅ **OpenEHR**: Direct postgres connections established
- ✅ **EHRbase**: Neon postgres connections configured

### **Environment Variables Required**
```env
# Supabase (Primary HR Database)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenEHR (Secondary Database)
OPENEHR_DATABASE_URL=postgresql://user:pass@host:port/db

# EHRbase (Tertiary Database)
TIBBNA_DATABASE_URL=postgresql://user:pass@host:port/db
DATABASE_URL=postgresql://user:pass@host:port/db
```

---

## 📊 **Performance Considerations**

### **Connection Pooling**
- **Supabase**: Managed by Supabase
- **OpenEHR**: Configured (max: 10, idle_timeout: 20)
- **EHRbase**: Configured (max: 10, idle_timeout: 20)

### **SSL/TLS**
- All databases use SSL connections
- `ssl: 'require'` enforced in all direct connections

---

**Analysis Complete**: HR system uses 3 PostgreSQL databases with different connection methods and purposes.
