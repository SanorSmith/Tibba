# TIBBNA HOSPITAL SYSTEM - QUICK REFERENCE GUIDE

## System Architecture at a Glance

```
USER INTERFACE (React Components)
         ↓
Next.js APP Router (Server/Client Components)
         ↓
BUSINESS LOGIC SERVICES (TypeScript)
         ↓
DATA ACCESS (Supabase + ORM)
         ↓
DATABASES (PostgreSQL + Legacy Systems)
```

---

## Module Breakdown

### 🏥 HOSPITAL OPERATIONS
- **Base URL**: `/hospital`
- **Key Features**:
  - Facility information management
  - Department directory
  - Hospital-wide announcements
  - Facilities booking

---

### 👥 HR MODULE
- **Base URL**: `/hr`
- **Submodules**:
  
| Section | Endpoint | Function |
|---------|----------|----------|
| **Employees** | `/employees` | CRUD, profiles, documents |
| **Attendance** | `/attendance` | Daily log, biometric sync, reports |
| **Leaves** | `/leaves` | Requests, approvals, balance tracking |
| **Payroll** | `/payroll` | Salary calculation, approval, bank file |
| **Recruitment** | `/recruitment` | Job postings, candidates, hiring |
| **Performance** | `/performance` | Reviews, goals, evaluations |
| **Training** | `/training` | Programs, certifications, tracking |
| **Benefits** | `/benefits` | Insurance, allowances, policies |
| **Organization** | `/organization` | Department hierarchy, reporting |
| **Departments** | `/departments` | Dept setup, budgets, staffing |
| **Job Categories** | `/job-categories` | Job positions, grades |

---

### 💰 FINANCE MODULE
- **Base URL**: `/finance`
- **Submodules**:

| Section | Endpoint | Function |
|---------|----------|----------|
| **Invoicing** | `/invoices` | Patient billing, services |
| **Accounting** | `/accounting` | GL, journal entries, reconciliation |
| **Budget** | `/budget` | Annual budgets, tracking, analysis |
| **Inventory** | `/inventory` | Stock levels, medical supplies |
| **Purchase Orders** | `/purchases` | PO creation, supplier management |
| **Returns** | `/returns` | Returns, credit notes |
| **Insurance** | `/insurance` | Providers, patient policies, claims |
| **Service Payments** | `/service-payments` | Provider payments, commissions |
| **Suppliers** | `/suppliers` | Supplier database, contacts |
| **Shareholders** | `/shareholders` | Ownership, dividend tracking |
| **Stakeholders** | `/stakeholders` | External parties, contracts |
| **Patient Accounts** | `/patients` | Patient billing, balances |
| **Reports** | `/reports` | Financial statements, analysis |

---

### 📋 CLINICAL/MEDICAL MODULE
- **Base URL**: `/appointments` + `/hospital`
- **Submodules**:

| Section | Endpoint | Function |
|---------|----------|----------|
| **Appointments** | `/appointments` | Booking, scheduling, history |
| **Patient Records** | `/hospital/[id]` | Patient profile, medical history |

---

## Core Data Models

### Employee (HR)
```typescript
{
  id: string,
  employee_number: string,
  first_name: string,
  last_name: string,
  email: string,
  phone: string,
  date_of_birth: string,
  gender: 'MALE' | 'FEMALE',
  employment_type: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT',
  job_title: string,
  department_id: string,
  basic_salary: number,
  employment_status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED',
  bank_account_number?: string
}
```

### Patient (Finance + Medical)
```typescript
{
  id: string,
  patient_number: string,
  first_name: string,
  last_name: string,
  date_of_birth: string,
  gender: 'MALE' | 'FEMALE',
  phone: string,
  email?: string,
  national_id?: string,
  medical_history?: string,
  allergies?: string,
  total_balance: number,
  is_active: boolean
}
```

### Leave Request (HR)
```typescript
{
  id: string,
  employee_id: string,
  leave_type: string,
  from_date: string,
  to_date: string,
  days: number,
  reason: string,
  status: 'PENDING' | 'APPROVED' | 'REJECTED',
  created_at: string
}
```

### Invoice (Finance)
```typescript
{
  id: string,
  invoice_number: string,
  patient_id: string,
  total_amount: number,
  payment_status: 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE',
  invoice_date: string,
  due_date: string,
  items: InvoiceItem[]
}
```

---

## Critical Business Services

### 🔴 COMPLEX CALCULATION ENGINES

| Service | Purpose | Key Algorithm |
|---------|---------|---------------|
| **payroll-calculation-engine.ts** | Salary calculation | Multi-factor earnings + deductions |
| **iraq-tax-calculator.ts** | Income tax | Iraq tax slab calculation |
| **leave-approval-workflow.ts** | Leave approval | Multi-level sequential approval |
| **leave-payroll-calculator.ts** | Leave impact | Salary deduction for leaves |
| **attendance-leave-integration.ts** | Cross-module sync | Attendance → Leave → Payroll |

### 🟠 INTEGRATION SERVICES

| Service | Integrates | Purpose |
|---------|-----------|---------|
| **patient-sync-service.ts** | Non-Medical DB ↔ Supabase | Patient data sync |
| **patient-bridge-service.ts** | Finance ↔ Medical | Patient data consistency |
| **notification-service.ts** | Email/SMS | Alerts and communications |
| **bank-file-generator.ts** | Payroll → Bank | Payment file generation |

---

## Approval Workflows Summary

### Leave Request Approval
```
Step 1: Department Manager (24h)
        ↓
Step 2: HR Manager (24h)
        ↓
Step 3: Finance Manager [Optional] (12h)
        ↓
COMPLETE
```

### Payroll Approval
```
Calculated Payroll
        ↓
Department Manager (Review)
        ↓
Finance Manager (Final Authority)
        ↓
READY FOR BANK PROCESSING
```

### Purchase Order Approval
```
PO Request
        ↓
Manager Approval
        ↓
Finance Check
        ↓
Budget Owner Final OK
        ↓
SUPPLIER ORDER
```

---

## Key Calculations

### Payroll Calculation
```
GROSS SALARY = Base Salary + Allowances + Variable Pay
             = (Basic + Housing + Transport + Meal)
             + (Overtime + Night Shift + Bonuses)

DEDUCTIONS = Fixed Deductions + Variable Deductions
           = (Social Security + Health Insurance + Tax)
           + (Loans + Advances + Absence Penalties)

NET SALARY = GROSS SALARY - DEDUCTIONS
```

### Leave Impact on Payroll
```
Per Leave Day Deduction = (Gross Salary / Working Days in Month)
Total Leave Deduction = Per Day × Number of Leave Days
(Except paid leave types)
```

### Iraq Income Tax Calculation
```
Taxable Income = Gross Salary - Standard Deductions
Tax Bracket 1: 0-5,000,000 IQD @ 3%
Tax Bracket 2: 5,000,001-10,000,000 @ 5%
Tax Bracket 3: 10,000,001+ @ 7%
Total Tax = Sum of bracket calculations
```

---

## Database Operations

### Key Tables & Operations

| Table | CRUD | Special Operations |
|-------|------|-------------------|
| **employees** | Full | Salary grade, department assignment |
| **attendance** | Create, Read | Daily rollup, exception flagging |
| **leave_requests** | Full | Multi-level approval, balance update |
| **payroll_calculations** | Create, Read | Bulk generation, archive |
| **invoices** | Full | Insurance claim reconciliation |
| **patients** | Full | Sync from multiple sources |
| **purchase_orders** | Full | Approval workflow, goods receipt |
| **insurance_policies** | Full | Coverage calculation, claim tracking |

---

## Configuration Files

### Environment Variables
```
DATABASE_URL=          # PostgreSQL connection
SUPABASE_URL=          # Supabase API endpoint
SUPABASE_KEY=          # Supabase API key
NEXTAUTH_SECRET=       # Session encryption
NEXTAUTH_URL=          # Auth callback URL
```

### Business Settings (Hardcoded/Configurable)
- Overtime rate multipliers (1.5x, 2.0x)
- Night shift allowance (USD per shift)
- Social security percentage (10%)
- Health insurance percentage (5%)
- Tax brackets (Iraq-specific)
- Leave policy limits
- Holiday calendar
- Working hours per day

---

## Testing & Validation

### Test Coverage
```
src/__tests__/
├── api/              # API endpoint tests
├── e2e/              # End-to-end workflows
├── integration/      # Module integration tests
│   ├── leave-flow.test.ts
│   ├── payroll-flow.test.ts
│   └── module-connectivity.test.ts
```

### Validation Schemas (Zod)
```
src/lib/validations/
└── hr-schemas.ts     # Employee, leave, payroll validation
```

---

## Performance Considerations

| Operation | Scale | Optimization |
|-----------|-------|--------------|
| **Payroll Calc** | 500+ employees | Batch processing, caching |
| **Attendance Sync** | 1000+ daily records | Biometric device integration |
| **Invoice Generation** | 100+ daily | Queued background job |
| **Leave Approvals** | 50+ pending | Database indexing |
| **Report Generation** | Large datasets | Aggregation queries |

---

## Error Handling

### Standard API Response
```typescript
{
  success: boolean,
  data?: any,
  error?: {
    code: string,
    message: string,
    details?: any
  },
  timestamp: string
}
```

### Common Error Codes
- `INSUFFICIENT_BALANCE` - Leave/budget balance insufficient
- `APPROVAL_REQUIRED` - Action pending approval
- `DATA_MISMATCH` - Inconsistent data across modules
- `INVALID_PERIOD` - Outside allowed date range
- `POLICY_VIOLATION` - Business rule violation

---

## Notification Triggers

| Event | Recipients | Channel |
|-------|-----------|---------|
| Leave Approved | Employee | Email |
| Leave Rejected | Employee, Manager | Email |
| Payroll Ready | Finance Team | Email, Dashboard |
| Payment Processed | Employees | Email, SMS |
| Invoice Overdue | Finance, Patient | Email |
| Recruitment Stage | Candidate | Email |
| Appointment Reminder | Patient, Doctor | Email, SMS |

---

## Report Types

### HR Reports
- Employee Directory
- Attendance Summary
- Leave Analytics
- Payroll Summary
- Recruitment Pipeline
- Performance Reviews
- Training Expiry

### Finance Reports
- Income Statement
- Patient Aging Report
- Budget vs Actual
- Invoice Register
- Insurance Claims
- Supplier Analysis
- Cash Flow

### Clinical Reports
- Patient Demographics
- Service Utilization
- Appointment Statistics
- Doctor Performance

---

## Integration Points

### External Systems
1. **Biometric Device** → Attendance recording
2. **OpenEHR** → Clinical data standards
3. **Banking System** → Payroll transfer
4. **Email Server** → Notifications
5. **Legacy Non-Medical DB** → Patient sync

### API Endpoints Pattern
```
GET    /api/[module]/[resource]           # List
GET    /api/[module]/[resource]/[id]      # Get detail
POST   /api/[module]/[resource]           # Create
PUT    /api/[module]/[resource]/[id]      # Update
DELETE /api/[module]/[resource]/[id]      # Delete
POST   /api/[module]/[resource]/action    # Custom action
```

---

## Deployment

### Development
```bash
npm run dev          # Start dev server (port 3000)
```

### Build & Production
```bash
npm run build        # Build Next.js app
npm start           # Start production server
```

### Database
```bash
# Migrations handled via Drizzle ORM
npm run migrate:hr  # HR-specific migrations
```

---

## Key Features Overview

| Feature | Status | Complexity |
|---------|--------|-----------|
| Multi-level approval workflows | ✅ | High |
| Complex payroll calculations | ✅ | High |
| Patient-Finance integration | ✅ | Medium |
| Biometric attendance | ✅ | Medium |
| Insurance management | ✅ | Medium |
| Recruitment engine | ✅ | Medium |
| OpenEHR sync | ✅ | Medium |
| Real-time notifications | ✅ | Low |

---

## Development Guidelines

### Code Organization
```
src/
├── app/              # Next.js routes & pages
├── components/       # React components
├── lib/              # Business logic & utilities
│   ├── services/     # Complex business logic
│   ├── supabase/     # DB client setup
│   └── validations/  # Zod schemas
├── types/            # TypeScript interfaces
├── data/             # Static data/fixtures
└── styles/           # Global CSS
```

### Naming Conventions
- Services: `{domain}-{purpose}.ts` (e.g., `payroll-calculation-engine.ts`)
- Types: `{entity}.ts` (e.g., `hr.ts`, `finance.ts`)
- Components: `PascalCase.tsx`
- Utils: `camelCase.ts`

---

## Troubleshooting Quick Guide

| Issue | Likely Cause | Solution |
|-------|-------------|----------|
| Leave approval stuck | Pending at manager level | Check manager's approval queue |
| Payroll mismatch | Attendance data incomplete | Verify attendance records |
| Patient not syncing | Bridge service error | Check patient-bridge-service logs |
| Invoice not generated | Missing service charges | Verify service was recorded |
| Bank file error | Format mismatch | Validate against bank specs |
| Biometric sync issue | Device connection lost | Reconnect biometric device |

---

## Contact & Support

**System Owner**: Hospital IT Department
**Database Admin**: Database team
**HR Module Lead**: HR Department
**Finance Module Lead**: Finance Department

---

*Last Updated*: System Analysis Complete
*Version*: 1.0
*System Status*: ✅ Operational

