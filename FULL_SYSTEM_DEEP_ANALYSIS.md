# ═══════════════════════════════════════════════════════════════════
# TIBBNA HOSPITAL — FULL SYSTEM DEEP ANALYSIS
# Models · Data Layer · Functionality · Workflows
# ═══════════════════════════════════════════════════════════════════

---

## 🔍 CRITICAL FINDING: DUAL DATA ARCHITECTURE

The system operates on TWO parallel data layers:

```
┌────────────────────────────────────────────────────────────────┐
│            DATA LAYER MAP                                       │
├─────────────────────────────┬──────────────────────────────────┤
│   MOCK DATA (Static JSON)   │   REAL DATABASE (PostgreSQL)     │
├─────────────────────────────┼──────────────────────────────────┤
│ src/data/hr/*.json          │ DATABASE_URL → Neon/pg Pool      │
│ src/data/finance/*.json     │ SUPABASE_URL → Supabase SDK      │
│ src/data/users.json         │                                   │
├─────────────────────────────┼──────────────────────────────────┤
│ HR Dashboard & most pages   │ /api/staff → staff table         │
│ Finance Dashboard           │ /api/invoices → invoices table   │
│ Leave Calendar / Balances   │ /api/hr/leaves → leave_requests  │
│ Payroll Summary display     │ /api/hr/payroll/* → payroll DB   │
│ Performance / Training      │ /api/departments → departments   │
│ Benefits / Org Chart        │ /api/appointments → appointments │
│ Recruitment page display    │ /api/tibbna-openehr-patients     │
│ User Authentication login   │ /api/hr/attendance → daily_att  │
└─────────────────────────────┴──────────────────────────────────┘
```

**SUMMARY**: The system is in **active migration** from mock to real data.
- Most UI pages still read from `localStorage` (seeded from JSON)
- Backend API routes now query real PostgreSQL/Supabase
- Some pages are fully migrated (Employees list, Invoices, Leaves)
- Others still use the JSON-seeded in-memory store

---

## 📦 MODULE-BY-MODULE ANALYSIS

---

### 1. 🔐 AUTHENTICATION MODULE

| Attribute | Detail |
|-----------|--------|
| **Data Source** | 🟡 Mock JSON (`src/data/users.json`) |
| **Engine** | Zustand persist store (`auth-store.ts`) |
| **Session Storage** | `localStorage` → key: `auth-storage` |
| **Backend Guard** | Supabase JWT (`lib/auth/middleware.ts`) — used in API, NOT in login UI |

**Available Mock Users**:
```
username: demo       password: demo123    role: HR Administrator
username: admin      password: admin123   role: Administrator
username: doctor     password: doctor123  role: Doctor
username: nurse      password: nurse123   role: Nurse
username: billing    password: billing123 role: Finance Administrator
username: pharmacist password: pharmacist123  role: Pharmacist
username: labtech    password: labtech123 role: Lab Technician
username: procurement password: procurement123 role: Procurement Officer
```

**Auth Roles & Permissions**:
```
admin        → all modules
HR Admin     → hr, employees, attendance, leaves, payroll, recruitment, training, performance, benefits, organization
Finance Admin→ finance, billing, insurance, invoices, payments, purchases, reports, suppliers
Doctor       → patients, appointments, services
Nurse        → patients, appointments
Pharmacist   → inventory, pharmacy, dispensing, billing
Procurement  → inventory, suppliers, finance
```

**Problem Areas**:
- ⚠️ Passwords stored in PLAIN TEXT in JSON file
- ⚠️ Login does NOT use Supabase Auth (bypasses real auth)
- ⚠️ API middleware (`middleware.ts`) checks Supabase token, but no route enforces it consistently
- ⚠️ Role-based access on UI is checked via `useAuth()` hook but UI components can bypass

---

### 2. 👥 EMPLOYEES MODULE

| Attribute | Detail |
|-----------|--------|
| **Data Source** | 🟢 Real DB (`/api/staff` → `staff` table) |
| **Also Has** | 🟡 Mock JSON (`src/data/hr/employees.json`) used in HR Dashboard |
| **DB Table** | `staff` (PostgreSQL) |
| **Key Fields** | `staffid`, `custom_staff_id`, `firstname`, `lastname`, `role`, `unit`, `specialty`, `workspaceid` |

**Functionality**:
- ✅ **List staff** with search, filter by department/occupation, pagination (10/page)
- ✅ **Create employee** — inserts into `staff` + `employee_compensation` tables (transaction)
- ✅ **Custom Staff ID** generated as `[Dept1][Spec3][YY][DD][SEQ3]` e.g. `CCAR26151001`
- ✅ **Edit employee** — navigates to `/hr/employees/[id]/edit`
- ✅ **Delete employee** (with role permission check)
- ✅ **Download** button exists (likely exports to Excel/CSV)
- ⚠️ EHR sync field (`practitioner_id`, `ehr_synced`) defined in types but not wired in UI

**HR Dashboard vs Employees List**:
```
HR Dashboard page.tsx     → reads mock JSON via dataStore.getEmployees()
Employees list page.tsx   → fetches from /api/staff (real DB)
```
This means **the dashboard shows stale/fake counts** while the list shows real data.

**Employee ID Format (Real DB)**:
```
Generated: [DeptChar][Specialty3Chars][YY][DD][Sequence]
Example:   CCAR26150001   (Cardiology, CAR, 2026, 15th, #001)
Fallback:  UUID substring if generation fails
```

---

### 3. 🏢 DEPARTMENTS MODULE

| Attribute | Detail |
|-----------|--------|
| **Data Source** | 🟢 Real DB (`/api/departments` → `departments` table) |
| **DB Table** | `departments` |
| **Key Fields** | `departmentid`, `name`, `description`, `createdat`, `updatedat` |
| **Also Has** | 🟡 Mock JSON (`src/data/hr/departments.json`) used in forms |

**Functionality**:
- ✅ List departments from live DB
- ✅ Create new departments (form at `/hr/departments/add`)
- ✅ Edit departments (`/hr/departments/[id]/edit`)
- ✅ Specialties management (`/hr/departments/specialties/`)
- ✅ Department orders (`/hr/departments/orders/`)
- ⚠️ `head_of_department`, `location`, `capacity` fields mapped as `null` — not in DB schema

**Code Note**: department data auto-generates a 3-char `code` from name:
```javascript
code: dept.name.substring(0, 3).toUpperCase()  // "Cardiology" → "CAR"
```

---

### 4. 📅 ATTENDANCE MODULE

| Attribute | Detail |
|-----------|--------|
| **Data Source** | 🟢 Real DB (`/api/hr/attendance` → `daily_attendance` table) |
| **Also Has** | 🟡 Mock JSON (`src/data/hr/attendance.json`) |
| **DB Tables** | `daily_attendance`, `staff`, `shifts`, `leave_requests` |

**Real Attendance Query** (joins 4 tables):
```sql
SELECT da.*, s.custom_staff_id, s.firstname, s.lastname, s.unit,
       sh.code as shift_code, sh.name as shift_name,
       lr.status as leave_status, lr.leave_type_code
FROM daily_attendance da
INNER JOIN staff s ON da.employee_id = s.staffid
LEFT JOIN shifts sh ON da.shift_id = sh.id
LEFT JOIN leave_requests lr ON s.staffid = lr.employee_id
   AND da.date BETWEEN lr.start_date AND lr.end_date
```

**Functionality**:
- ✅ View daily attendance log with leave overlay
- ✅ Filter by date, status, employee
- ✅ Biometric attendance page (`/hr/attendance/biometric/`)
- ✅ Exception handling (`/hr/attendance/exceptions/`)
- ✅ Process attendance (`/hr/attendance/process/`)
- ✅ Reports (`/hr/attendance/reports/`)
- ✅ Staff history (`/hr/attendance/staff-history/`)

**Tracked Fields per Day**:
```
date, shift_id, first_in, last_out,
total_hours, regular_hours, overtime_hours,
late_arrival_minutes, status (PRESENT/ABSENT/HALF_DAY/LEAVE)
```

---

### 5. 🏖️ LEAVE MANAGEMENT MODULE

| Attribute | Detail |
|-----------|--------|
| **Data Source** | 🟢 Real DB (`/api/hr/leaves`) |
| **DB Tables** | `leave_requests`, `leave_types` |
| **Leave Requests List** | Fetches from `/api/hr/leaves` (real) |
| **Employee data for display** | `dataStore.getEmployees()` (mock) — hybrid! |

**Leave Request Schema**:
```sql
leave_requests:
  id, employee_id, employee_name, employee_number,
  leave_type_id, leave_type_code,
  start_date, end_date, return_date,
  days_count, working_days_count,
  reason, emergency_contact, emergency_reason,
  status (PENDING/APPROVED/REJECTED/CANCELLED),
  approved_by, approved_by_name, approved_at,
  rejection_reason, replacement_employee,
  replacement_name, handover_notes
```

**Approval Workflow** (leave-approval-workflow.ts + workflow-service.ts):
```
Entity Types Handled: leave_request, overtime_request, 
                       expense_claim, loan_request, advance_request

Workflow Steps:
1. Employee submits → status: PENDING
2. Workflow initialized in Supabase (approval_workflows table)
3. Steps created (approval_steps table)
4. Level 1 approver notified
5. Level 1 approves/rejects → advance to level 2 or close
6. Level 2+ approves → final status set to APPROVED
7. Leave balance deducted via attendance-leave-integration

Auto-approve rules:
- entity type determines total approval levels
- 0 levels = auto-approve immediately
```

**Leave Types Loaded From**:
```
/api/hr/leave-types → leave_types table
Leave types configured: Annual, Sick, Emergency, Maternity, 
                        Paternity, Unpaid, Hajj, Study
```

**Functionality**:
- ✅ Submit leave request
- ✅ Multi-level approval workflow
- ✅ Leave balances tracking (`/hr/leaves/balances/`)
- ✅ Calendar view (`/hr/leaves/calendar/`)
- ✅ Analytics (`/hr/leaves/analytics/`)
- ✅ Leave type configuration (`/hr/leaves/types/`)
- ✅ Approval management (`/hr/leaves/approvals/`)
- ✅ Delegation support
- 🔄 Leave-payroll integration in `leave-payroll-calculator.ts`

---

### 6. 💰 PAYROLL MODULE

| Attribute | Detail |
|-----------|--------|
| **Data Source** | 🟢 Real DB for calculation/approval |
| **Display data** | 🟡 Mock JSON (`src/data/hr/payroll.json`) in HR Dashboard |
| **DB Tables** | `payroll_periods`, `payroll_transactions`, `employee_compensation`, `loans`, `advances` |
| **Engine** | `lib/services/payroll-calculation-engine.ts` |

**API Endpoints**:
```
GET  /api/hr/payroll/periods          → list payroll cycles
GET  /api/hr/payroll/transactions     → get payroll for a period
POST /api/hr/payroll/calculate        → trigger calculation engine
POST /api/hr/payroll/approvals        → approve payroll period
GET  /api/hr/payroll/loans            → employee loans list
POST /api/hr/payroll/loans            → create loan
GET  /api/hr/payroll/advances         → salary advances
POST /api/hr/payroll/bank-transfer    → generate bank file
GET  /api/hr/payroll/attendance       → attendance review for payroll
```

**Payroll Calculation Engine** (full real implementation):
```
createPayrollCalculationEngine(pool) returns:
├── processPayrollForPeriod(period_id, employee_ids?)
│   ├── Fetch payroll period from DB
│   ├── Get employees with compensation
│   ├── For each employee:
│   │   ├── Get attendance data
│   │   ├── Get approved leaves
│   │   ├── Get loans (monthly installments)
│   │   ├── Get advances (deduction amounts)
│   │   ├── calculateEarnings() → gross, overtime, allowances
│   │   ├── calculateDeductions() → SS, health, tax, loans
│   │   └── Build PayrollCalculation record
│   └── Return results summary
│
└── savePayrollTransactions(period_id, records)
    └── Bulk insert into payroll_transactions table
```

**Tax Calculation** (Iraq-specific, `iraq-tax-calculator.ts`):
```
Taxable Income = Gross - Standard Deductions
Bracket 1: 0-5,000,000 IQD @ 3%
Bracket 2: 5,000,001-10,000,000 IQD @ 5%
Bracket 3: 10,000,001+ IQD @ 7%
```

**Deduction Rates** (hardcoded in engine):
```
OVERTIME_RATE_REGULAR  = 1.5×
OVERTIME_RATE_WEEKEND  = 2.0×
OVERTIME_RATE_HOLIDAY  = 2.0×
NIGHT_SHIFT_ALLOWANCE  = $50 per shift
SOCIAL_SECURITY_RATE   = 10%
HEALTH_INSURANCE_RATE  = 5%
```

**Functionality**:
- ✅ View payroll periods + status
- ✅ Trigger full payroll calculation from DB
- ✅ Multi-factor earnings: salary, allowances, overtime, shifts, bonuses
- ✅ Multi-factor deductions: SS, insurance, Iraq tax, loans, absences
- ✅ Payroll approval workflow (2-level)
- ✅ Bank transfer file generation (`bank-file-generator.ts`)
- ✅ Loan management (`/payroll/loans/`)
- ✅ Social security tracking (`/payroll/social-security/`)
- ✅ Tax calculator UI (`/payroll/tax-calculator/`)
- ✅ End-of-service calculation (`/payroll/end-of-service/`)
- ✅ Compensation setup (`/payroll/compensation/`)
- 🔄 Attendance review integration (`/payroll/attendance-review/`)

---

### 7. 🎯 RECRUITMENT MODULE

| Attribute | Detail |
|-----------|--------|
| **Data Source** | 🟡 Mock JSON (`src/data/hr/candidates.json`) + Real DB partially |
| **API** | `/api/hr/candidates` (real DB) |
| **DB** | `candidates`, `job_vacancies` tables |

**Vacancy Statuses**: `DRAFT → OPEN → CLOSED → FILLED`
**Candidate Statuses**: `APPLIED → SHORTLISTED → INTERVIEW_SCHEDULED → INTERVIEWED → OFFER_EXTENDED → OFFER_ACCEPTED → HIRED / REJECTED`

**Functionality**:
- ✅ Job vacancy posting (`/recruitment/vacancies/`)
- ✅ Applicant management (`/recruitment/applicants/`)
- ✅ Candidate pipeline (`/recruitment/candidates/`)
- ✅ Interview scheduling
- ✅ Decision engine (custom scoring algorithm)
- ✅ Analytics dashboard (`/recruitment/analytics/`)
- ⚠️ Most data still comes from mock JSON for display

**Decision Engine Scoring Factors**:
```
Qualifications Match:  0-10
Interview Score:       0-10 (average of rounds)
Experience Level:      0-10
References:            0-10
Cultural Fit:          0-10
FINAL SCORE = Weighted average → threshold to recommend
```

---

### 8. 📊 PERFORMANCE MODULE

| Attribute | Detail |
|-----------|--------|
| **Data Source** | 🟡 Mock JSON (`src/data/hr/performance.json`) |
| **API** | `/api/hr/performance` (uses DB via `performance-calculator.ts`) |
| **Service** | `src/services/performance-calculator.ts` |

**Functionality**:
- ✅ Performance reviews (`/performance/reviews/new/`)
- ✅ Goals management (`/performance/goals/`)
- ✅ Review analytics
- ⚠️ `performance-calculator.ts` exists but integration depth is partial

---

### 9. 🎓 TRAINING MODULE

| Attribute | Detail |
|-----------|--------|
| **Data Source** | 🟡 Mock JSON (`src/data/hr/training.json`) |
| **Key Features** | Program tracking, certifications, expiry alerts |

**Functionality**:
- ✅ Training programs directory
- ✅ Enrollment tracking (`src/data/hr/training-enrollments.json`)
- ✅ Certification expiry tracking (shown in HR Dashboard)
- ✅ Session scheduling

---

### 10. 💎 BENEFITS MODULE

| Attribute | Detail |
|-----------|--------|
| **Data Source** | 🟡 Mock JSON (`src/data/hr/benefits.json`) |

**Sub-sections**:
- `/benefits/health-insurance/` — Health plan enrollment
- `/benefits/housing/` — Housing allowance
- `/benefits/transport/` — Transport allowance

---

### 11. 🏥 PATIENT MANAGEMENT MODULE

| Attribute | Detail |
|-----------|--------|
| **Data Source** | 🟢 Real DB → Neon/PostgreSQL via `/api/tibbna-openehr-patients` |
| **Also Reads** | Legacy Non-Medical DB (`patientid`, `firstname`, `lastname`, `phone`, `nationalid`) |
| **Finance Patients** | 🟡 Mock JSON (`src/data/finance/patients.json`) for Finance store |
| **Caching** | `TibbnaPatientService` caches for 5 min |

**Database Schema** (Non-Medical DB `patients` table):
```sql
patientid, firstname, lastname, phone, email,
nationalid, address, dateofbirth, gender,
workspaceid, createdat, ehrid
```

**Patient Bridge Service** (patient-bridge-service.ts):
```
Purpose: Mirror patients from Non-Medical DB into Finance context
         Also manages sync between Supabase and legacy DB

Flow:
1. Patient registered in Non-Medical DB (source of truth)
2. Patient Sync Service copies to Supabase
3. Finance module fetches from Supabase
4. Bridge maintains reference IDs cross-system
```

**Phone Normalization** (Iraq numbers):
```
"07703171017"   → "9647703171017"
"00964770..."   → "9647703171017"
"+964-770-..."  → "9647703171017"
```

**Functionality**:
- ✅ Full patient list with search
- ✅ Create patient (`/api/tibbna-openehr-patients` POST)
- ✅ Edit patient (PUT endpoint)
- ✅ Sync from Non-Medical DB to Supabase
- ✅ OpenEHR ID assignment (`crypto.randomUUID()`)
- ✅ Patient number generation: `P-{YEAR}-{RANDOM4}`
- ✅ Insurance assignment (`/patient-insurance`)
- ✅ Balance tracking in Finance

---

### 12. 🗓️ APPOINTMENTS MODULE

| Attribute | Detail |
|-----------|--------|
| **Data Source** | 🟢 Real DB (`/api/appointments` → `appointments` table) |
| **DB Check** | API checks if table exists before querying — graceful fallback |
| **Tables** | `appointments`, `patients`, `staff` (joined) |

**Appointment Schema**:
```sql
appointments:
  appointmentid, workspaceid, patientid, doctorid, staff_id,
  starttime, endtime, location, status, notes,
  unit, appointmentname, appointmenttype,
  clinicalindication, reasonforrequest,
  createdat, updatedat
```

**Functionality**:
- ✅ List appointments with patient and doctor info
- ✅ Create new appointment (with conflict check)
- ✅ Schedule conflict detection (`schedule-conflict-checker.ts`)
- ✅ Doctor availability API (`/api/doctor-availability`)
- ✅ Appointment status updates
- ⚠️ Table existence check suggests this module was added later

---

### 13. 🧾 INVOICING MODULE

| Attribute | Detail |
|-----------|--------|
| **Data Source** | 🟢 Real DB → `invoices`, `invoice_items` tables |
| **Also Has** | 🟡 Mock JSON (`src/data/finance/invoices.json`) in Finance store |
| **Finance Store** | Used for older Finance Dashboard pages |
| **API** | `/api/invoices` (full CRUD + pagination) |

**Invoice DB Schema**:
```sql
invoices:
  id, invoice_number, invoice_date,
  patient_id, patient_name, patient_name_ar,
  subtotal, discount_percentage, discount_amount,
  total_amount,
  insurance_company_id, insurance_coverage_amount,
  insurance_coverage_percentage,
  patient_responsibility, amount_paid, balance_due,
  status (DRAFT/ISSUED/PARTIAL/PAID/OVERDUE),
  payment_method, payment_date, notes,
  createdat, updatedat

invoice_items:
  id, invoice_id, service_id, service_name, service_name_ar,
  quantity, unit_price, total_price
```

**Pricing Logic** (smart service price lookup):
```javascript
// Items without unit_price → auto-fetch from services table
servicePrices = await pool.query(
  'SELECT code, id, price FROM services WHERE code = ANY($1) OR id = ANY($1)'
)
// Falls back to 0 if service not found
```

**Calculation Chain**:
```
subtotal = Σ(quantity × unit_price per item)
discount_amount = subtotal × discount_percentage / 100
total_amount = subtotal - discount_amount
insurance_coverage_amount = total_amount × insurance_coverage_percentage / 100
patient_responsibility = total_amount - insurance_coverage_amount
amount_paid = collected payment
balance_due = patient_responsibility - amount_paid
```

**Functionality**:
- ✅ Create invoice with line items (transaction-safe)
- ✅ View invoice with items detail
- ✅ Edit invoice (update status, amounts)
- ✅ Apply discount (modal)
- ✅ Update payment status
- ✅ Insurance company linkage
- ✅ Patient search with live autocomplete
- ✅ Service catalog integration
- ✅ Paginated invoice list (10/page)
- ✅ Delete with cascading invoice_items deletion

---

### 14. 🛡️ INSURANCE MODULE

| Attribute | Detail |
|-----------|--------|
| **Data Source** | 🟡 Mock JSON (`src/data/finance/insurance.json`) via Finance Store |
| **Also Real** | `/api/insurance-companies` & `/api/patient-insurance` → DB |

**Insurance Types**: `PRIVATE_INSURANCE`, `GOVERNMENT`, `MOH`
**Coverage Types**: `FULL`, `PARTIAL`, `SPECIFIC_SERVICES`
**Status Types**: `ACTIVE`, `EXPIRED`, `SUSPENDED`, `CANCELLED`

**Functionality**:
- ✅ Insurance company management
- ✅ Patient insurance policies
- ✅ Coverage percentage tracking
- ✅ Coverage limit & usage tracking
- ✅ Primary vs secondary insurance
- ✅ Covered services list
- ✅ Insurance exclusions

---

### 15. 🏪 PURCHASE ORDERS MODULE

| Attribute | Detail |
|-----------|--------|
| **Data Source** | 🟡 Mock JSON (`src/data/finance/purchases.json`) via Finance Store |
| **API** | `/api/purchase-requests` (real DB) |

**Workflow Stages**:
```
DRAFT → SUBMITTED → APPROVED → ORDERED → 
PARTIALLY_RECEIVED → RECEIVED → INVOICED → COMPLETED
```

**Functionality**:
- ✅ Purchase request creation
- ✅ Multi-line item requests
- ✅ Supplier assignment
- ✅ Approval workflow
- ✅ Goods receipt
- ✅ Invoice matching
- ✅ Supplier management

---

### 16. 📦 INVENTORY MODULE

| Attribute | Detail |
|-----------|--------|
| **Data Source** | 🟡 Mock JSON (`src/data/finance/inventory.json`) via Finance Store |

**Tracked Entities**:
```
Warehouses, InventoryItems, Stock levels, StockMovements
Stock Types: MEDICINE, MEDICAL_SUPPLY, EQUIPMENT, CONSUMABLE
```

**Functionality**:
- ✅ Stock level monitoring
- ✅ Re-order point alerts
- ✅ Stock movements (in/out)
- ✅ Warehouse management
- ✅ HR integration page (`/hr/integrations/inventory/`)

---

### 17. 📈 ACCOUNTING MODULE

| Attribute | Detail |
|-----------|--------|
| **Data Source** | 🟡 Mock JSON (`src/data/finance/accounting.json`) via Finance Store |

**Tracked Entities**:
```
ChartOfAccounts, CostCenters, JournalEntries, JournalEntryLines
Account Types: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
```

**Functionality**:
- ✅ Chart of accounts management
- ✅ Journal entries
- ✅ Cost center tracking
- ✅ GL posting integration with payroll/invoices

---

### 18. 📊 BUDGET MODULE

| Attribute | Detail |
|-----------|--------|
| **Data Source** | 🟡 Finance Store (mock) + real API `/api/budget` |
| **Entities** | BudgetPeriod, BudgetDetail |

**Budget Period Schema**:
```
period_name, fiscal_year,
total_revenue_budget, total_expense_budget,
total_capital_budget, total_operational_budget,
total_revenue_actual, total_expense_actual,
total_capital_actual, total_operational_actual,
status (DRAFT/ACTIVE/CLOSED)
```

---

## 🔄 DATA FLOW — WHERE EACH PAGE GETS ITS DATA

```
Page                            Data Source                  Status
─────────────────────────────── ──────────────────────────── ──────────
/dashboard                      data/dashboard.json          🟡 MOCK
/hr                             data/hr/*.json (via store)   🟡 MOCK
/hr/employees                   /api/staff → DB              🟢 REAL
/hr/employees/[id]              /api/staff/[id] → DB         🟢 REAL
/hr/attendance                  /api/hr/attendance → DB      🟢 REAL
/hr/attendance/biometric        Biometric device API         🟢 REAL
/hr/leaves/requests             /api/hr/leaves → DB          🟢 REAL
/hr/leaves/approvals            /api/hr/leaves (workflow)    🟢 REAL
/hr/leaves/balances             dataStore (mock)             🟡 MOCK
/hr/leaves/calendar             dataStore (mock)             🟡 MOCK
/hr/payroll                     /api/hr/payroll/periods      🟢 REAL
/hr/payroll/process             /api/hr/payroll/calculate    🟢 REAL
/hr/payroll/loans               /api/hr/payroll/loans        🟢 REAL
/hr/recruitment                 data/hr/candidates.json      🟡 MOCK
/hr/performance                 data/hr/performance.json     🟡 MOCK
/hr/training                    data/hr/training.json        🟡 MOCK
/hr/benefits                    data/hr/benefits.json        🟡 MOCK
/hr/departments                 /api/departments → DB        🟢 REAL
/hr/organization                dataStore (mock)             🟡 MOCK
/finance                        financeStore (localStorage)  🟡 MOCK
/finance/invoices               /api/invoices → DB           🟢 REAL
/finance/patients               financeStore + /api/tibbna   🔀 HYBRID
/finance/insurance              financeStore (mock)          🟡 MOCK
/finance/purchases              financeStore (mock)          🟡 MOCK
/finance/inventory              financeStore (mock)          🟡 MOCK
/finance/accounting             financeStore (mock)          🟡 MOCK
/finance/budget                 /api/budget → DB             🟢 REAL
/finance/suppliers              /api/finance/suppliers → DB  🟢 REAL
/appointments                   /api/appointments → DB       🟢 REAL
/hospital                       /api/departments + staff     🟢 REAL
```

**Legend**: 🟢 Real DB | 🟡 Mock JSON | 🔀 Hybrid

---

## 🗃️ DATABASE SCHEMA — ALL CONFIRMED TABLES

### HR Schema Tables (PostgreSQL)
```sql
staff                   ← Core employee records
  staffid UUID, firstname, lastname, email, role, unit,
  specialty, workspaceid, custom_staff_id, dateofbirth,
  phone, createdat, updatedat

employee_compensation   ← Salary and allowances
  id, employee_id (→staff.staffid), basic_salary,
  housing_allowance, transport_allowance, meal_allowance,
  payment_frequency, currency, salary_grade,
  effective_from, is_active

daily_attendance        ← Daily time records
  id, employee_id, date, shift_id, first_in, last_out,
  total_hours, regular_hours, overtime_hours,
  late_arrival_minutes, status

shifts                  ← Work shift definitions
  id, code, name, start_time, end_time

leave_types             ← Leave policy
  id, name, code, color, max_days_per_year,
  carry_forward, is_paid

leave_requests          ← Leave applications
  id, employee_id, employee_name, employee_number,
  leave_type_id, leave_type_code,
  start_date, end_date, return_date,
  days_count, working_days_count,
  reason, status, approved_by, approved_by_name,
  approved_at, rejection_reason,
  replacement_employee, handover_notes

payroll_periods         ← Payroll cycles
  id, period_name, period_code, start_date, end_date,
  payment_date, status, total_employees,
  total_gross, total_deductions, total_net

payroll_transactions    ← Per-employee payroll records
  id, period_id, employee_id, employee_name, employee_number,
  department, basic_salary, housing_allowance,
  transport_allowance, meal_allowance,
  overtime_pay, gross_salary, social_security,
  health_insurance, income_tax, loan_deduction,
  advance_deduction, absence_deduction,
  total_deductions, net_salary, status, warnings

loans                   ← Employee loans
  id, employee_id, loan_amount, monthly_installment,
  remaining_balance, start_date, end_date, status

advances                ← Salary advances
  id, employee_id, advance_amount, deduction_amount,
  remaining_balance, status

departments             ← Hospital departments
  departmentid, name, description, createdat, updatedat
```

### Finance/Clinical Schema Tables (PostgreSQL)
```sql
invoices                ← Billing records
  id, invoice_number, invoice_date,
  patient_id, patient_name, patient_name_ar,
  subtotal, discount_percentage, discount_amount,
  total_amount, insurance_company_id,
  insurance_coverage_amount, insurance_coverage_percentage,
  patient_responsibility, amount_paid, balance_due,
  status, payment_method, payment_date, notes

invoice_items           ← Invoice line items
  id, invoice_id, service_id, service_name, service_name_ar,
  quantity, unit_price, total_price

services                ← Medical service catalog
  id, code, name, price, category

insurance_companies     ← Insurance providers
  id, company_code, company_name, company_name_ar

appointments            ← Patient appointments
  appointmentid, workspaceid, patientid, doctorid, staff_id,
  starttime, endtime, location, status, notes, unit,
  appointmentname, appointmenttype,
  clinicalindication, reasonforrequest
```

### Supabase Schema Tables (Auth + Workflows)
```sql
patients                ← Patient master (Supabase)
  id, patient_id, patient_number,
  first_name_ar, last_name_ar, full_name_ar,
  first_name_en, last_name_en, full_name_en,
  date_of_birth, gender, phone, email, national_id,
  governorate, total_balance, is_active,
  non_medical_patient_id (reference to legacy DB)

approval_workflows      ← Workflow engine state
  id, organization_id, entity_type, entity_id,
  current_level, total_levels, status,
  submitted_by, created_at

approval_steps          ← Individual approval steps
  id, workflow_id, level, approver_id,
  approver_role, status, acted_at, comments

audit_logs              ← Audit trail
  id, user_id, action, entity_type, entity_id,
  changes (jsonb), timestamp
```

### Non-Medical (Legacy) DB Tables
```sql
patients (Legacy)       ← Source of truth for patients
  patientid, firstname, lastname, phone, email,
  nationalid, address, dateofbirth, gender,
  workspaceid, createdat, ehrid
```

---

## ⚡ CRITICAL WORKFLOWS (TRACED END-TO-END)

### WORKFLOW A: Leave Request Full Cycle
```
1. Employee navigates to /hr/leaves/requests
2. Clicks "New Request"
3. Fills form: leave_type, from/to dates, reason
4. Submit → POST /api/hr/leaves
   ├─ Insert into leave_requests (status: PENDING)
   └─ Call initializeApprovalWorkflow(leaveRequestId, employeeId, ...)
      ├─ Queries staff table for department
      ├─ Gets approval levels from DB config
      ├─ Creates approval_requests records
      └─ Sets first approver

5. Dept Manager opens /hr/leaves/approvals
   ├─ Sees pending requests (GET /api/hr/leaves?status=PENDING)
   └─ Clicks Approve/Reject
      ├─ PUT /api/hr/leaves/[id]/approve
      ├─ Updates approval_request status
      ├─ If more levels: creates next level request
      └─ Triggers notification-service.ts (email alert)

6. If final level approved:
   ├─ Leave request status → APPROVED
   ├─ Leave balance deducted
   ├─ Attendance-leave integration syncs data
   └─ Payroll engine reads leave during payroll calc

DATA PATH: UI → /api/hr/leaves → PostgreSQL leave_requests
                             → Supabase approval_workflows
                             → notification-service (email)
```

### WORKFLOW B: Payroll End-to-End
```
1. Finance navigates to /hr/payroll
2. Selects payroll period (GET /api/hr/payroll/periods)
3. Reviews attendance data (/hr/payroll/attendance-review)
   └─ GET /api/hr/payroll/attendance → daily_attendance
4. Clicks "Calculate Payroll"
   ├─ POST /api/hr/payroll/calculate { period_id }
   ├─ createPayrollCalculationEngine(pool)
   ├─ processPayrollForPeriod(period_id)
   │   ├─ For each employee in staff table:
   │   │   ├─ Get compensation from employee_compensation
   │   │   ├─ Get attendance from daily_attendance
   │   │   ├─ Get approved leaves from leave_requests
   │   │   ├─ Get loan installments from loans
   │   │   ├─ Get advance deductions from advances
   │   │   ├─ calculateEarnings() → gross
   │   │   ├─ calculateIraqiTax(gross) → tax
   │   │   └─ calculateDeductions() → net
   │   └─ Return: { total_employees, total_gross, total_net }
   └─ savePayrollTransactions() → insert into payroll_transactions

5. Approval workflow:
   └─ POST /api/hr/payroll/approvals { period_id, action: APPROVE }
      ├─ Dept Manager → Finance Manager → APPROVED
      └─ Status updated in payroll_periods table

6. Bank file generation:
   └─ POST /api/hr/payroll/bank-transfer { period_id }
      ├─ bank-file-generator.ts builds payment file
      └─ Returns file for download

DATA PATH: UI → calculate API → payroll_calculation_engine
                             → DB (staff, compensation, attendance, leaves, loans)
                             → payroll_transactions table
                             → bank-file-generator → Download
```

### WORKFLOW C: Patient Invoice Creation
```
1. Finance staff opens /finance/invoices
2. Clicks "New Invoice"
3. Searches for patient (live autocomplete)
   ├─ GET /api/tibbna-openehr-patients?search=Ahmed
   └─ Returns patient list from Non-Medical DB
4. Selects patient, adds services from catalog
   └─ GET /api/services → services table
5. System auto-prices services
   └─ Prices fetched from services table (by code or id)
6. Adds insurance if applicable
   └─ GET /api/insurance-companies → insurance_companies table
7. Submits invoice
   └─ POST /api/invoices {
        patient_id, patient_name, invoice_date,
        insurance_company_id, items: [...]
      }
      ├─ Auto-generates invoice_number (INV-2025-XXXXXX)
      ├─ Calculates all amounts (subtotal, insurance, patient share)
      ├─ Transaction: INSERT invoices + INSERT invoice_items
      └─ Returns new invoice record

8. Payment collection:
   └─ PUT /api/invoices/[id] { amount_paid, status: PAID }
      └─ Updates balance_due, status

DATA PATH: UI → /api/invoices (POST) → PostgreSQL
                             (transaction: invoices + invoice_items)
```

### WORKFLOW D: New Employee Hire
```
1. HR opens /hr/employees/new
2. Fills employee form (name, DOB, role, dept, salary)
3. Submits
   └─ POST /api/staff {
        first_name, last_name, email, job_title,
        department_id, basic_salary, payment_frequency,
        housing_allowance, transport_allowance
      }
      ├─ Transaction BEGIN
      ├─ INSERT into staff table
      │   └─ custom_staff_id auto-generated: CCAR26150001
      ├─ INSERT into employee_compensation table
      ├─ Transaction COMMIT
      └─ Returns employee_id

4. Employee now appears in:
   ├─ /hr/employees list (via /api/staff)
   ├─ Payroll engine (processed next cycle)
   └─ Leave management (can submit leaves)
```

---

## 🚨 GAPS & ISSUES IDENTIFIED

### Critical Gaps
```
1. AUTHENTICATION SPLIT
   - Login uses JSON mock users (no real auth)
   - API middleware checks Supabase tokens
   - APIs are NOT protected (no middleware applied)
   → Anyone can call any API without authentication

2. DATA INCONSISTENCY
   - HR Dashboard reads mock JSON (fake counts)
   - Employees list reads real DB (actual counts)
   - These numbers WILL differ

3. FINANCE STORE IS ISOLATED
   - financeStore writes to localStorage
   - API writes to PostgreSQL
   - No sync between the two
   - Finance Dashboard shows stale mock data

4. LEAVE BALANCES FROM MOCK
   - /hr/leaves/balances reads dataStore (mock)
   - But leave requests are in real DB
   - Approval deducts from DB but display reads mock

5. RECRUITMENT 100% MOCK
   - All recruitment pages read from JSON
   - No DB writes for recruitment actions
```

### Minor Issues
```
6. Partial HR module using `unit` vs `department_id`
   - staff.unit is a string department name
   - departments.departmentid is the real FK
   - No foreign key enforced

7. Password in plain text (users.json)

8. workspaceid hardcoded in employee create:
   'b227528d-ca34-4850-9b72-94a220365d7f'  ← Baghdad health center

9. Sequence number for staff ID always = 1
   → Duplicate IDs possible if same dept/spec/DOB

10. 60+ debug/test routes in /api/*
    (test-pg, debug-db, test-patients-simple, etc.)
    → Should be removed before production
```

---

## 📊 MOCK vs REAL SUMMARY TABLE

| Module              | UI Display     | Write Action   | Migration Status |
|---------------------|---------------|----------------|-----------------|
| Authentication      | 🟡 Mock JSON  | 🟡 Mock Store  | ❌ Not migrated  |
| Dashboard           | 🟡 Mock JSON  | Read-only      | ❌ Not migrated  |
| Employees List      | 🟢 Real DB    | 🟢 Real DB     | ✅ Migrated      |
| Departments         | 🟢 Real DB    | 🟢 Real DB     | ✅ Migrated      |
| Attendance          | 🟢 Real DB    | 🟢 Real DB     | ✅ Migrated      |
| Leave Requests      | 🟢 Real DB    | 🟢 Real DB     | ✅ Migrated      |
| Leave Balances      | 🟡 Mock JSON  | 🟡 Mock Store  | 🔄 Partial       |
| Leave Calendar      | 🟡 Mock JSON  | 🟡 Mock Store  | 🔄 Partial       |
| Payroll Periods     | 🟢 Real DB    | 🟢 Real DB     | ✅ Migrated      |
| Payroll Calculate   | 🟢 Real DB    | 🟢 Real DB     | ✅ Migrated      |
| Payroll HR Dash     | 🟡 Mock JSON  | —              | ❌ Not migrated  |
| Recruitment         | 🟡 Mock JSON  | 🟡 Mock Store  | ❌ Not migrated  |
| Performance         | 🟡 Mock JSON  | 🟡 Mock Store  | ❌ Not migrated  |
| Training            | 🟡 Mock JSON  | 🟡 Mock Store  | ❌ Not migrated  |
| Benefits            | 🟡 Mock JSON  | 🟡 Mock Store  | ❌ Not migrated  |
| Organization Chart  | 🟡 Mock JSON  | —              | ❌ Not migrated  |
| Patients            | 🟢 Real DB    | 🟢 Real DB     | ✅ Migrated      |
| Appointments        | 🟢 Real DB    | 🟢 Real DB     | ✅ Migrated      |
| Invoices            | 🟢 Real DB    | 🟢 Real DB     | ✅ Migrated      |
| Finance Dashboard   | 🟡 Mock JSON  | 🟡 LocalStore  | ❌ Not migrated  |
| Insurance           | 🟡 Mock JSON  | 🟡 LocalStore  | 🔄 API exists   |
| Purchase Orders     | 🟡 Mock JSON  | 🟡 LocalStore  | 🔄 API exists   |
| Inventory           | 🟡 Mock JSON  | 🟡 LocalStore  | ❌ Not migrated  |
| Accounting          | 🟡 Mock JSON  | 🟡 LocalStore  | ❌ Not migrated  |
| Budget              | 🔀 Hybrid     | 🟢 Real DB     | 🔄 Partial       |
| Suppliers           | 🟢 Real DB    | 🟢 Real DB     | ✅ Migrated      |

---

## 🏗️ ARCHITECTURE CONCLUSION

```
CURRENT STATE: TRANSITIONAL SYSTEM

Frontend (React/Next.js)
    │
    ├──────────────────────────────────────────────
    │  LAYER 1: Mock Data (Original / Prototype)
    │  ├─ src/data/*.json  ← Static data files
    │  ├─ dataStore.ts     ← In-memory + localStorage
    │  ├─ financeStore.ts  ← In-memory + localStorage
    │  └─ auth-store.ts    ← localStorage session
    │  Used by: HR Dashboard, Finance Dash, Recruitment,
    │           Performance, Training, Benefits, Org Chart
    │
    ├──────────────────────────────────────────────
    │  LAYER 2: Real Database (In Progress)
    │  ├─ /api/staff          → staff (PostgreSQL)
    │  ├─ /api/hr/attendance  → daily_attendance
    │  ├─ /api/hr/leaves      → leave_requests
    │  ├─ /api/hr/payroll/*   → payroll tables
    │  ├─ /api/invoices       → invoices/invoice_items
    │  ├─ /api/appointments   → appointments
    │  ├─ /api/tibbna-*       → patients (Non-Medical)
    │  └─ /api/departments    → departments
    │  Used by: Employee pages, Leave requests, Payroll,
    │           Invoices, Patients, Appointments
    │
    ├──────────────────────────────────────────────
    │  LAYER 3: Supabase Cloud (Auth + Workflows)
    │  ├─ Auth middleware     ← JWT validation
    │  ├─ approval_workflows  ← Leave approval engine
    │  ├─ audit_logs          ← Security trail
    │  └─ patients (mirror)   ← Synced from Non-Medical
    │
    └──────────────────────────────────────────────

DATABASES CONNECTED:
├─ DATABASE_URL → Neon PostgreSQL (primary real data)
├─ SUPABASE_URL → Supabase (auth, workflows, mirrors)
└─ Non-Medical DB → Legacy patient source
```

---

## 🎯 RECOMMENDED NEXT STEPS

### Priority 1 — Critical
1. **Fix Authentication** — Wire real Supabase Auth to login UI
2. **Protect API routes** — Apply auth middleware consistently
3. **Sync Dashboard data** — Replace mock JSON reads with real API calls
4. **Remove debug routes** — 60+ test routes should be in dev-only mode

### Priority 2 — Data Completeness
5. **Migrate Recruitment** — Wire candidate create/update to real DB
6. **Migrate Leave Balances** — Compute from DB instead of mock JSON
7. **Sync Finance Store** — Replace localStorage with real API for Finance Dash
8. **Fix Staff ID Sequence** — Implement real sequence counter to avoid duplicates

### Priority 3 — Enhancements
9. **HR/Finance Dashboard** — Replace static JSON widgets with real API
10. **Performance/Training modules** — Connect to real DB
11. **Benefits module** — Store benefits in DB

---

*Analysis Date: 2026-05-27*
*Codebase: tibbna-hospital v1.0*
*Analysis Type: Full logical, data-layer, and workflow analysis*
