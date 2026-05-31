# TIBBNA HOSPITAL SYSTEM - WORKFLOW STRUCTURE ANALYSIS

## System Overview
Tibbna Hospital is a comprehensive healthcare management system built with:
- **Frontend**: Next.js 16 with React 18
- **Backend**: Node.js with Express, Drizzle ORM
- **Database**: PostgreSQL, Supabase
- **Authentication**: Supabase Auth
- **Integration**: OpenEHR, Biometric Systems
- **UI Library**: Radix UI, Tailwind CSS, Lucide Icons

---

## CORE MODULES & WORKFLOWS

### 1. HUMAN RESOURCES (HR) MODULE
**Path**: `/src/app/(dashboard)/hr/`

#### Submodules:
1. **Employee Management**
   - Employee Registration & Profile
   - Department Assignment
   - Job Positions & Grades
   - Employee History & Records
   - Education, Licenses, Certifications

2. **Attendance Management**
   - Biometric Check-in/Check-out
   - Daily Attendance Tracking
   - Exception Handling
   - Attendance Reports
   - Staff History

3. **Leave Management** ⭐ (Complex Workflow)
   - Leave Requests Submission
   - Approval Workflow (Multi-Level)
   - Leave Balance Management
   - Leave Calendar View
   - Leave Types Configuration
   - Analytics & Reports

4. **Payroll Processing** ⭐ (Complex Workflow)
   - Compensation Setup
   - Attendance Integration
   - Leave Deduction Calculation
   - Loan & Advance Deductions
   - Tax Calculation (Iraq-specific)
   - Social Security
   - Bank File Generation
   - Payroll Approval Workflow

5. **Recruitment & Hiring**
   - Job Vacancies Management
   - Candidate Management
   - Application Tracking
   - Interview Process
   - Decision Engine
   - Analytics

6. **Performance Management**
   - Performance Goals Setting
   - Review Cycles
   - Employee Evaluations
   - Reports

7. **Training & Development**
   - Training Programs
   - Certifications Tracking
   - Expiry Management
   - Training Analytics

8. **Benefits Management**
   - Health Insurance
   - Housing Allowance
   - Transport Allowance
   - Other Benefits

9. **Organization Structure**
   - Department Hierarchy
   - Reporting Structure
   - Organization Chart

---

### 2. FINANCE & BILLING MODULE
**Path**: `/src/app/(dashboard)/finance/`

#### Submodules:
1. **Patient Billing**
   - Medical Invoice Generation
   - Service Charge Calculation
   - Payment Tracking
   - Outstanding Balance Management

2. **Accounting**
   - Chart of Accounts
   - Journal Entries
   - General Ledger
   - Financial Reports

3. **Budget Management**
   - Annual Budget Planning
   - Budget Periods
   - Revenue/Expense Tracking
   - Budget vs Actual Analysis

4. **Inventory Management**
   - Medical Supplies Tracking
   - Stock Levels
   - Re-order Points
   - Warehouse Management

5. **Purchase Orders**
   - PO Creation
   - Supplier Management
   - Purchase Requests
   - Approval Workflow
   - Order Tracking

6. **Supplier Management**
   - Supplier Database
   - Contact Information
   - Payment Terms
   - Performance Tracking

7. **Insurance Management**
   - Insurance Providers
   - Patient Insurance Policies
   - Coverage Management
   - Claims Processing

8. **Service Payments**
   - Service Provider Payments
   - Commission Calculations
   - Payment Reports

9. **Financial Reports**
   - Income Statement
   - Balance Sheet
   - Cash Flow Reports
   - Budget Analysis

10. **Returns & Adjustments**
    - Credit Notes
    - Refund Processing
    - Adjustment Tracking

---

### 3. CLINICAL & MEDICAL MODULE
**Path**: `/src/app/(dashboard)/appointments/`, `/src/app/(dashboard)/hospital/`

#### Submodules:
1. **Appointments Management**
   - Patient Appointment Booking
   - Doctor Availability
   - Appointment Confirmation
   - Appointment History

2. **Hospital Operations**
   - Facility Information
   - Department Management
   - Ward Management
   - Operating Theater (OT) Scheduling
   - Radiology Services

3. **Patient Management**
   - Patient Registration
   - Medical History
   - Allergies & Chronic Diseases
   - Current Medications
   - Next Appointment Tracking

4. **Service Management**
   - Service Catalog
   - Service Pricing
   - Service Provider Assignment

---

### 4. INTEGRATIONS & BRIDGES
**Path**: `/src/lib/`

#### Key Services:
1. **Patient Sync Service** (`patient-sync-service.ts`)
   - Syncs patients from Non-Medical DB to Supabase
   - Manages patient references across systems
   - Bidirectional data mapping

2. **Patient Bridge Service** (`patient-bridge-service.ts`)
   - Bridges patient data between Finance and Medical modules
   - Maintains data consistency
   - Handles patient migrations

3. **OpenEHR Integration** (`/hr/integrations/openehr/`)
   - Employee synchronization with OpenEHR
   - Practitioner registration
   - Clinical data standards compliance

4. **Biometric System** (`/hr/attendance/biometric/`)
   - Biometric attendance recording
   - Real-time check-in/check-out
   - Integration with attendance tracking

5. **Notification Service** (`notification-service.ts`)
   - Email notifications
   - System alerts
   - Workflow notifications

---

## CRITICAL WORKFLOWS

### 1. LEAVE REQUEST WORKFLOW (Multi-Level Approval)
```
Employee submits leave request
    ↓
Automatic workflow initialization
    ↓
Department Manager Review → Approval/Rejection
    ↓
HR Manager Review → Approval/Rejection
    ↓
Finance Impact Calculation (if affects payroll)
    ↓
Final Approval/Denial
    ↓
Update Leave Balance
    ↓
Notification to Employee
```

**Services Involved**:
- `leave-approval-workflow.ts`
- `leave-payroll-calculator.ts`
- `notification-service.ts`
- `attendance-leave-integration.ts`

---

### 2. PAYROLL PROCESSING WORKFLOW
```
Mark Attendance Period Complete
    ↓
Retrieve Employee Data (compensation, department, grade)
    ↓
Calculate Attendance Impact (worked days, absences, leaves)
    ↓
Calculate Earnings:
    - Basic Salary
    - Allowances (Housing, Transport, Meal)
    - Overtime (Regular, Weekend, Holiday rates)
    - Night Shift Pay
    - Bonuses
    ↓
Calculate Deductions:
    - Social Security (10% of gross)
    - Health Insurance (5% of gross)
    - Income Tax (Iraq-specific calculation)
    - Loan Installments
    - Advance Deductions
    - Absence Penalties
    ↓
Calculate Net Salary
    ↓
Approval Workflow
    ↓
Bank File Generation
    ↓
Payment Processing
```

**Services Involved**:
- `payroll-calculation-engine.ts`
- `iraq-tax-calculator.ts`
- `leave-payroll-calculator.ts`
- `attendance-leave-integration.ts`
- `bank-file-generator.ts`
- `notification-service.ts`

---

### 3. PATIENT BILLING WORKFLOW
```
Patient Services Rendered
    ↓
Service Charges Applied
    ↓
Insurance Coverage Check
    ↓
Invoice Generation
    ↓
Insurance Claim Processing (if applicable)
    ↓
Payment Collection
    ↓
Balance Management
    ↓
Financial Reporting
```

**Related Services**:
- Finance Module
- Insurance Management
- Service Management
- Patient Bridge Service

---

### 4. RECRUITMENT WORKFLOW
```
Job Vacancy Creation
    ↓
Vacancy Approval
    ↓
Candidate Application
    ↓
Application Review
    ↓
Interview Scheduling
    ↓
Interview Rounds
    ↓
Decision Engine
    ↓
Offer Management
    ↓
Employee Onboarding
```

---

### 5. PURCHASE ORDER WORKFLOW
```
Purchase Request Submission
    ↓
Manager Approval
    ↓
Finance Review
    ↓
Purchase Order Creation
    ↓
Supplier Confirmation
    ↓
Goods Receipt
    ↓
Invoice Matching
    ↓
Payment Processing
```

---

## DATA FLOW ARCHITECTURE

### Core Entities & Relationships:

```
┌─────────────────────────────────────────────────┐
│         EMPLOYEE (HR Core)                      │
│  - Personal Info, Qualifications, Certifications│
│  - Salary Grade, Department Assignment          │
│  - Attendance History, Leave Balances           │
│  - Bank Details for Payroll                     │
└──────────┬──────────────────────────────────────┘
           │
    ┌──────┴──────────┬──────────────┬──────────┐
    │                 │              │          │
    ▼                 ▼              ▼          ▼
ATTENDANCE       LEAVE MGMT    PAYROLL    BENEFITS
- Daily records  - Requests   - Earnings - Health Ins
- Biometric      - Balances   - Deductions- Housing
- Exceptions     - Calendar   - Net Salary- Transport


┌─────────────────────────────────────────────────┐
│         PATIENT (Medical + Finance)             │
│  - Demographics, Medical History                │
│  - Appointments, Services                       │
│  - Billing, Insurance, Balance                  │
└──────────┬──────────────────────────────────────┘
           │
    ┌──────┴──────────┬──────────────┬──────────┐
    │                 │              │          │
    ▼                 ▼              ▼          ▼
APPOINTMENTS    MEDICAL DATA   BILLING    INSURANCE
- Scheduling    - History      - Invoices - Policies
- Services      - Medications  - Payments - Claims
- Providers     - Allergies    - Balance  - Coverage


┌─────────────────────────────────────────────────┐
│         DEPARTMENTS                             │
│  - Hierarchy, Staff Assignment                  │
│  - Budget Allocation, Services Offered          │
└──────────┬──────────────────────────────────────┘
           │
    ┌──────┴──────────┬──────────────┐
    │                 │              │
    ▼                 ▼              ▼
FINANCE        STAFFING      OPERATIONS
- Budget       - Capacity    - Services
- Costs        - Roles       - Equipment
```

---

## TECHNOLOGY STACK

### Frontend
- **Framework**: Next.js 16.1.6
- **UI**: React 18.2.0
- **Components**: Radix UI (Dialog, Select, Tabs, Dropdown, Avatar)
- **Styling**: Tailwind CSS 3.4.1 + Tailwind Animate
- **Icons**: Lucide React 0.563.0
- **Forms**: React Hook Form 7.50.1
- **Charts**: Recharts 2.12.0
- **Validation**: Zod 3.22.4
- **State Management**: Zustand 5.0.11
- **HTTP**: SWR 2.2.5

### Backend
- **Runtime**: Node.js
- **Server**: Express 5.2.1
- **Database**: PostgreSQL 8.18.0
- **ORM**: Drizzle ORM 0.45.1
- **Auth**: Supabase Auth
- **DB Client**: Supabase JS 2.95.3
- **Scheduling**: node-cron 3.0.3

### Utilities
- **Date Handling**: date-fns 3.3.1
- **PDF Generation**: PDFKit 0.15.0
- **Excel**: ExcelJS 4.4.0
- **CSV**: csv-parser 3.2.0
- **UUID**: uuid 13.0.0
- **Notifications**: Sonner 2.0.7
- **Environment**: dotenv 17.3.1

---

## KEY FEATURES SUMMARY

### ✅ Implemented Features
1. Multi-level leave approval workflow
2. Complex payroll calculation engine
3. Biometric attendance integration
4. Patient-Finance bridge system
5. OpenEHR synchronization
6. Iraq-specific tax calculations
7. Insurance management
8. Recruitment with decision engine
9. Budget tracking and reporting
10. Purchase order management

### 🔧 Integration Points
1. **Biometric Systems** - Real-time attendance
2. **OpenEHR** - Clinical data standards
3. **Banking Systems** - Payroll disbursement
4. **Insurance Providers** - Claims processing
5. **Email System** - Notifications

---

## DATABASE SCHEMA AREAS

- `staff` / `employees` - Employee master records
- `attendance` - Daily attendance logs
- `leave_requests` - Leave applications
- `leave_types` - Leave policy definitions
- `payroll_periods` - Payroll cycles
- `payroll_calculations` - Individual payroll records
- `patients` - Patient master records
- `invoices` / `medical_invoices` - Billing records
- `purchase_orders` - PO records
- `insurance_providers` - Insurance company database
- `departments` - Organizational structure
- `job_vacancies` - Recruitment postings
- `candidates` - Applicant records

---

## API ENDPOINTS PATTERN

### HR Module
```
/api/hr/employees - CRUD operations
/api/hr/attendance - Attendance tracking
/api/hr/leaves - Leave management
/api/hr/payroll - Payroll operations
/api/hr/recruitment - Recruitment workflows
```

### Finance Module
```
/api/finance/invoices - Billing
/api/finance/purchase-orders - PO management
/api/finance/insurance - Insurance operations
/api/finance/reports - Financial reports
```

### Patient Module
```
/api/patients - Patient management
/api/appointments - Appointment booking
```

---

## VALIDATION & DATA INTEGRITY

**Zod Schemas** (`src/lib/validations/`):
- Employee data validation
- Leave request validation
- Payroll data validation
- Financial records validation
- Patient information validation

---

## ERROR HANDLING & LOGGING

- API response wrapper (`api-response.ts`)
- Service-level error handling
- Notification system for failures
- Audit logging for critical operations

---

## SYSTEM STRENGTHS

1. **Modular Architecture** - Clear separation of concerns
2. **Type Safety** - Full TypeScript implementation
3. **Data Integration** - Multiple data sources unified
4. **Automation** - Complex workflow automation
5. **Compliance** - Iraq-specific calculations and standards
6. **Scalability** - Built with enterprise patterns
7. **Real-time** - Biometric and attendance updates
8. **Multi-currency** - IQD and USD support

---

## DEPLOYMENT & OPERATIONS

**Environment**:
- Windows 11 environment
- PostgreSQL database
- Supabase backend-as-a-service
- Next.js production deployment

**Scripts**:
```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run test         # Run tests
npm run migrate:hr   # HR data migration
```

---

*Generated: System Architecture Analysis*
*Purpose: Logical and workflow-based system understanding*
