# ══════════════════════════════════════════════════════════════════════
# TIBBNA HOSPITAL — FULL ROADMAP vs. IMPLEMENTATION AUDIT
# Combined Roadmap · Current State · DB Reality · Gaps
# ══════════════════════════════════════════════════════════════════════

---

## SECTION 1 — COMBINED SYSTEM ROADMAP (All Specs Unified)

```
TIBBNA HOSPITAL PLATFORM
│
├── APP 1: RECEPTION DESK
│   ├── Manage Patients (registration + insurance link)
│   ├── Appointments (scheduling, doctor availability)
│   ├── Customer Billing (invoice creation)
│   ├── Returns (service returns / refunds)
│   ├── Staff Info / Contacts (linked to HR staff DB)
│   └── Todo List (daily planner for receptionist)
│
├── APP 2: FINANCE
│   ├── Dashboard (budget overview, charts, KPIs)
│   ├── Services (service catalog + provider pricing)
│   ├── Insurance (companies + patient policies)
│   ├── Purchases (PR/PO review, approval, linked to Inventory)
│   ├── Inventory (warehouse overview, linked to Inventory DB)
│   ├── Suppliers (directory + registration, shared with Inventory)
│   ├── Budget (annual budget, allocations, variances)
│   ├── Accounting (CoA, journal entries, cost centers)
│   ├── Reports (cash flow, income stmt, balance sheet, trial balance)
│   ├── Shareholders (equity registry + profit invoice)
│   ├── Stakeholders (external providers + service invoicing)
│   ├── Service Payments (pay external service providers)
│   └── Service Provider Reports (per-provider analytics)
│
├── APP 3: INSURANCE (standalone)
│   ├── Patient & Policy Verification
│   ├── Pre-Authorization
│   ├── Claims Management
│   ├── Contract-Based Pricing
│   ├── Fraud Detection & Audit
│   ├── Outcomes Monitoring
│   └── Interoperability (FHIR/HL7)
│
├── APP 4: HR
│   ├── Employees (profiles, credentials, files)
│   ├── Schedules & Shifts
│   ├── Attendance (biometric, exceptions, reports)
│   ├── Leaves (multi-type, multi-rule)
│   ├── Payroll (salary, allowances, deductions, bank transfer)
│   ├── Recruitment (hiring pipeline, credential verification)
│   ├── Training & Development
│   ├── Performance Management
│   ├── Benefits (insurance, housing, transport)
│   ├── Departments & Specialties
│   ├── Organization Chart
│   ├── Job Categories & Grades
│   └── HR Reports
│
├── APP 5: INVENTORY (separate app)
│   ├── Item Master (drugs, supplies, consumables, assets)
│   ├── Multi-Warehouse (main + sub-warehouses per dept)
│   ├── Pharmacy Inventory (expiry, batch, controlled drugs)
│   ├── Lab Inventory (reagents, LOINC codes)
│   ├── Radiology Inventory (contrast media, films)
│   ├── Procurement (PR → PO → GRN flow)
│   ├── Patient-linked consumption
│   ├── Inter-warehouse transfers
│   ├── Billing integration (charge capture)
│   └── Reports (ABC/XYZ analysis, expiry, waste)
│
├── APP 6: SERVICES CATALOG (global)
│   ├── Service type, category, price
│   ├── Provider assignment (1 service → multiple providers)
│   ├── Provider price (fixed or %)
│   ├── Insurance approval flag
│   └── Hospital equity share per service
│
├── APP 7: BILLING (advanced)
│   ├── Invoice Generation (automated, multi-currency)
│   ├── Shareholder equity distribution per invoice
│   ├── Insurance coverage calculation
│   ├── Return / Refund transactions
│   ├── Payment processing (cash, card, bank transfer)
│   ├── Accounts Receivable & dunning
│   └── Revenue recognition reporting
│
├── APP 8: APPOINTMENTS
│   ├── Patient appointment booking
│   ├── Doctor availability check
│   ├── Conflict detection
│   ├── Today's schedule view
│   └── Appointment status management
│
└── WEBSITE (Landing Page)
    ├── Home: "Advancing the future of health."
    ├── About (Tibbna description)
    └── Services (EHR, LIS, CDS, ERP, Interoperability, etc.)
```

---

## SECTION 2 — CURRENT APP STRUCTURE (What Is Built)

```
SIDEBAR MODULES:
├── Reception Desk (/reception)
│   ├── Manage Patients    (/reception/patients)
│   ├── Appointments       (/reception/appointments)
│   ├── Customer Billing   (/reception/invoices)
│   ├── Returns            (/reception/returns)
│   ├── Staff Info         (/reception/staff)
│   └── Todo List          (/reception/todos)
│
├── Inventory              (/hospital)         ← mislabeled!
│
├── Finance (/finance)
│   ├── Services           (/services)         ← wrong route!
│   ├── Insurance          (/finance/insurance)
│   ├── Purchases          (/finance/purchases)
│   ├── Inventory          (/finance/inventory)
│   ├── Suppliers          (/finance/suppliers)
│   ├── Budget             (/finance/budget)
│   ├── Accounting         (/finance/accounting)
│   ├── Reports            (/finance/reports)
│   ├── Shareholders       (/finance/shareholders)
│   ├── Stakeholders       (/finance/stakeholders)
│   ├── Service Payments   (/finance/service-payments)
│   └── Service Prov. Rpts (/finance/service-provider-reports)
│
├── Insurance              (/insurance)         ← standalone page
├── HR                     (/hr/...)            ← full sub-module
├── Billing                (/billing)           ← separate entry
└── Staff Portal           (/staff/...)
```

---

## SECTION 3 — FULL AUDIT: ROADMAP vs IMPLEMENTATION

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### MODULE A: RECEPTION DESK
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Roadmap Feature | Page Exists | Data Source | Real DB? | Gap |
|-----------------|-------------|-------------|----------|-----|
| Manage Patients (register, view) | ✅ `/reception/patients` | `/api/tibbna-openehr-patients` | ✅ Real DB (Neon) | ⚠️ No insurance name/ID fields in form |
| Patient insurance link (name + policy) | ⚠️ Partial | `financeStore` for insurance | 🟡 Mock list | ❌ Not linked to Insurance DB |
| Appointments (schedule/view) | ✅ `/reception/appointments` | `/api/appointments` | ✅ Real DB | ⚠️ No "available doctors" filter |
| Customer Billing / Invoice | ✅ `/reception/invoices` | `/api/invoices` + `/api/services` | ✅ Real DB | ⚠️ Service picker: no multi-provider selection |
| Returns / Refunds | ✅ `/reception/returns` | `/api/invoice-returns` | ✅ Real DB | ⚠️ Return items detail partially wired |
| Staff Info / Contacts | ✅ `/reception/staff` | `/api/staff` | ✅ Real DB | ✅ Properly linked to HR staff table |
| Todo List | ✅ `/reception/todos` | `/api/todos` | ✅ Real DB (`todos` table) | ⚠️ userId hardcoded (`00000000-...0001`) |
| Reception Dashboard stats | ⚠️ `/reception/page.tsx` | Hardcoded numbers | ❌ MOCK | ❌ No real API for dashboard stats |

**RECEPTION VERDICT**:
- ✅ All 6 sidebar sections exist
- ✅ Most pages use real DB APIs
- ❌ Patient form missing insurance_name + insurance_id fields (roadmap: "add two fields referring to insurance name and insurance ID")
- ❌ Multi-provider service selection in billing missing
- ❌ Reception dashboard stats are hardcoded (24 patients, 8 payments, etc.)

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### MODULE B: SERVICES CATALOG
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Roadmap Feature | Page Exists | Data Source | Real DB? | Gap |
|-----------------|-------------|-------------|----------|-----|
| Service listing (name, category, price) | ✅ `/services` | `/api/services` | ⚠️ Fallback to mock | ❌ No `services` DB table confirmed |
| Service registration (add/edit) | ✅ `/services/add` + `/services/[id]` | `/api/services` (POST/PUT) | ⚠️ Partial | ❌ No confirmed DB table creation |
| Provider assignment per service | ⚠️ provider_id field in model | Schema only | ❌ No `service_providers` table | ❌ Multi-provider per service not built |
| Provider price (fixed or %) | ❌ Not in form | — | ❌ | ❌ `service_fee` field exists, but not provider_price or price_type |
| Insurance-approved flag | ❌ Not in form | — | ❌ | ❌ No `approved_by_insurance` field |
| Hospital equity per service | ❌ Not in form | — | ❌ | ❌ Missing |
| Multi-provider selection at billing | ❌ | — | ❌ | ❌ Completely absent |

**SERVICES VERDICT**:
- ✅ Basic service list/view page exists
- ❌ The `services` DB table may not exist (API falls back to hardcoded mock)
- ❌ Provider pricing, insurance approval, hospital equity — NOT in any form or DB schema
- ❌ Multi-provider logic for billing is the biggest unbuilt piece of the system

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### MODULE C: FINANCE — DASHBOARD
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Roadmap Feature | Page Exists | Data Source | Real DB? | Gap |
|-----------------|-------------|-------------|----------|-----|
| Budget overview widget | ✅ Part of `/finance` | `/api/budget` (partial) | 🔀 Hybrid | ❌ Budget overview uses mock budget period |
| Revenue vs expense chart | ✅ `/finance` page | `financeStore` mock | ❌ MOCK | ❌ No live revenue from invoices DB |
| KPI metrics (patients, invoices) | ✅ UI exists | Mixed: invoice count real, others mock | 🔀 Hybrid | ❌ Inconsistent sources |
| Statistics diagrams/tables | ⚠️ Basic stats only | Mock `financeStore` | ❌ MOCK | ❌ No Recharts connected to real DB |

**FINANCE DASHBOARD VERDICT**:
- ❌ Dashboard widget data is mostly from `financeStore` (localStorage/mock)
- ❌ No chart visualization wired to real invoice, budget, or payroll DB

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### MODULE D: FINANCE — BILLING / INVOICING
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Roadmap Feature | Page Exists | Data Source | Real DB? | Gap |
|-----------------|-------------|-------------|----------|-----|
| Create invoice (services + patient) | ✅ `/reception/invoices` + `/finance/invoices` | `/api/invoices` POST | ✅ Real DB | ✅ Working |
| Auto invoice number | ✅ | Server-generated | ✅ | ✅ |
| Discount field | ✅ | Real DB field | ✅ | ✅ |
| Insurance coverage calculation | ✅ | Real DB field | ✅ | ✅ |
| Payment status (paid/unpaid/pending/cancelled/refund) | ✅ | Real DB `status` field | ✅ | ✅ |
| Unpaid invoice → specify target entity | ⚠️ `notes` field only | Real DB | ✅ Partial | ❌ No dedicated "billing entity" field for unpaid |
| Payment date + method (cash/card) | ✅ | Real DB fields | ✅ | ✅ |
| Stakeholder share distribution per invoice | ❌ | — | ❌ | ❌ NO invoice_shares table or UI |
| Shareholder profit distribution invoice | ❌ | — | ❌ | ❌ Not built |
| Multi-currency + VAT | ❌ | IQD only | ❌ | ❌ Currency field defined but no multi-currency UI |
| Deferred revenue / revenue recognition | ❌ | — | ❌ | ❌ Not built |
| Payment reminders / dunning | ❌ | — | ❌ | ❌ Not built |
| Credit notes | ⚠️ Returns page exists | `/api/invoice-returns` | ✅ Real DB | ⚠️ Not formally called "credit note" |
| Accounts receivable aging | ❌ | — | ❌ | ❌ Not built |
| Reports by status / payer / service | ❌ (mock only) | `financeStore` | ❌ MOCK | ❌ No real reporting engine |

**BILLING VERDICT**:
- ✅ Core invoice CRUD works with real DB
- ✅ Insurance coverage, discounts, payment status all in real DB
- ❌ Stakeholder/shareholder share distribution per invoice — COMPLETELY MISSING
- ❌ The roadmap's most critical billing requirement (share distribution) is not built

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### MODULE E: FINANCE — RETURNS
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Roadmap Feature | Page Exists | Data Source | Real DB? | Gap |
|-----------------|-------------|-------------|----------|-----|
| Return transaction on same date as return | ✅ `/reception/returns` | `/api/invoice-returns` | ✅ Real DB | ✅ `return_date` is today |
| Link return to original invoice | ✅ | `invoice_id` FK | ✅ | ✅ |
| Create "Service Return" record | ✅ | `invoice_returns` table | ✅ | ✅ |
| Return amount adjustment | ✅ | `return_amount` field | ✅ | ⚠️ No automatic balance re-calculation in invoice |
| Refund method (cash/card) | ✅ | `refund_method` field | ✅ | ✅ |
| Return appears in reports | ❌ | Reports use mock only | ❌ | ❌ Returns not in financial reports |

**RETURNS VERDICT**:
- ✅ Returns module is real DB, properly built
- ❌ Return does not auto-adjust parent invoice balance
- ❌ Returns not reflected in finance reports

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### MODULE F: FINANCE — INSURANCE
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Roadmap Feature | Page Exists | Data Source | Real DB? | Gap |
|-----------------|-------------|-------------|----------|-----|
| Insurance company list + registration | ✅ `/finance/insurance` | `/api/insurance-companies` | ✅ Real DB | ✅ |
| Insurance company CRUD | ✅ | Real DB | ✅ | ✅ |
| Patient policy registration | ❌ No tab in UI | `/api/patient-insurance` exists | ✅ API ready | ❌ UI tab missing in finance/insurance page |
| Policy number, validity dates | ❌ Not in finance UI | — | — | ❌ |
| Coverage limits, co-pay | ❌ Not in finance UI | — | — | ❌ |
| Pre-authorization management | ❌ | — | ❌ | ❌ Not built |
| Claims management | ❌ | — | ❌ | ❌ Not built |
| ICD-10 / CPT coding | ❌ | — | ❌ | ❌ Not built |
| Contract-based pricing per insurer | ❌ | — | ❌ | ❌ Not built |
| Fraud detection / audit trail | ❌ | — | ❌ | ❌ Not built |
| FHIR / HL7 interoperability | ❌ | — | ❌ | ❌ Not built |
| Eligibility real-time check | ❌ | — | ❌ | ❌ Not built |
| Claims submission + status | ❌ | — | ❌ | ❌ Not built |

**INSURANCE VERDICT**:
- ✅ Insurance company CRUD works with real DB
- ❌ The standalone `/insurance` app page — minimal/shell only
- ❌ Entire clinical insurance workflow (pre-auth, claims, ICD coding, interoperability) — NOT BUILT
- ❌ Patient policy UI tab missing from finance insurance page

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### MODULE G: FINANCE — PURCHASES (PR/PO)
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Roadmap Feature | Page Exists | Data Source | Real DB? | Gap |
|-----------------|-------------|-------------|----------|-----|
| View Purchase Requests (PR) | ✅ `/finance/purchases` | `/api/purchase-requests` | ❌ Returns MOCK data | ❌ API returns hardcoded mock array |
| Approve / Reject PR | ✅ Approval modal exists | API call | ❌ No DB table | ❌ Approval writes to non-existent table |
| PR linked to Inventory app | ❌ | — | ❌ | ❌ No inventory app integration |
| Purchase Order (PO) creation | ❌ No PO page | — | ❌ | ❌ PO module completely missing |
| GRN (Goods Receipt Note) | ❌ | — | ❌ | ❌ Not built |
| Triple matching PO ↔ GRN ↔ Invoice | ❌ | — | ❌ | ❌ Not built |
| Budget availability check on PR | ❌ | — | ❌ | ❌ Not built |
| Spending reports by dept/supplier | ❌ | — | ❌ | ❌ Not built |
| Payment terms + bank reference | ❌ | — | ❌ | ❌ Not built |

**PURCHASES VERDICT**:
- ⚠️ PR list page exists but API returns MOCK data (hardcoded)
- ❌ No `purchase_requests` DB table confirmed
- ❌ PO workflow (PO → GRN → Invoice → Payment) entirely missing
- ❌ Inventory link completely absent

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### MODULE H: FINANCE — INVENTORY (overview)
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Roadmap Feature | Page Exists | Data Source | Real DB? | Gap |
|-----------------|-------------|-------------|----------|-----|
| Stock overview | ✅ `/finance/inventory` | `financeStore` (localStorage) | ❌ MOCK | ❌ Reads from mock JSON |
| Warehouse list | ✅ | `financeStore` | ❌ MOCK | ❌ |
| Stock movements | ✅ | `financeStore` | ❌ MOCK | ❌ |
| Link to Inventory App DB | ❌ | — | ❌ | ❌ No cross-app DB link |
| Low-stock alerts | ⚠️ Status badge only | Mock data | ❌ MOCK | ❌ |

**INVENTORY OVERVIEW VERDICT**:
- ❌ Entire inventory overview is mock localStorage data
- ❌ No real inventory DB tables
- ❌ No link to a separate Inventory App

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### MODULE I: FINANCE — SUPPLIERS
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Roadmap Feature | Page Exists | Data Source | Real DB? | Gap |
|-----------------|-------------|-------------|----------|-----|
| Supplier list | ✅ `/finance/suppliers` | `/api/finance/suppliers` | ✅ Real DB | ✅ |
| Supplier registration | ✅ | Real DB | ✅ | ✅ |
| Shared with Inventory App | ❌ | — | ❌ | ❌ No Inventory app link |

**SUPPLIERS VERDICT**: ✅ Best-implemented Finance module. Real DB, CRUD working.

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### MODULE J: FINANCE — BUDGET
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Roadmap Feature | Page Exists | Data Source | Real DB? | Gap |
|-----------------|-------------|-------------|----------|-----|
| Budget periods overview | ✅ `/finance/budget` | `/api/budget` | ✅ Real DB | ✅ |
| Budget allocations by dept | ✅ | Real DB | ✅ | ✅ |
| Budget vs actual | ✅ | Real DB | ✅ | ✅ |
| Finance Dashboard budget widget | ⚠️ | `financeStore` mock | ❌ MOCK | ❌ Dashboard doesn't use budget API |
| Budget creation / new period | ❌ No create form | — | — | ❌ Read-only, no new budget entry |
| Monthly comparison | ❌ | — | ❌ | ❌ Not built |

**BUDGET VERDICT**: ✅ Good read implementation. ❌ No create/edit form and Finance Dashboard still uses mock.

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### MODULE K: FINANCE — ACCOUNTING
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Roadmap Feature | Page Exists | Data Source | Real DB? | Gap |
|-----------------|-------------|-------------|----------|-----|
| Chart of Accounts | ✅ `/finance/accounting` | `financeStore` | ❌ MOCK | ❌ localStorage only |
| Journal Entries | ✅ | `financeStore` | ❌ MOCK | ❌ |
| Cost Centers | ✅ | `financeStore` | ❌ MOCK | ❌ |
| GL posting from invoices/payroll | ❌ | — | ❌ | ❌ No auto-posting to GL |
| Trial Balance | ❌ | — | ❌ | ❌ Only in Reports mock |
| Balance Sheet | ❌ | — | ❌ | ❌ Only in Reports mock |
| Income Statement | ❌ | — | ❌ | ❌ Only in Reports mock |
| Cash Flow | ❌ | — | ❌ | ❌ Only in Reports mock |

**ACCOUNTING VERDICT**: ❌ Everything is mock. No real accounting DB tables or GL engine.

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### MODULE L: FINANCE — REPORTS
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Roadmap Feature | Page Exists | Data Source | Real DB? | Gap |
|-----------------|-------------|-------------|----------|-----|
| Income Statement | ✅ `/finance/reports` | `financeStore` mock calc | ❌ MOCK | ❌ |
| Balance Sheet | ✅ | `financeStore` mock calc | ❌ MOCK | ❌ |
| Cash Flow | ✅ | `financeStore` mock calc | ❌ MOCK | ❌ |
| Trial Balance | ✅ | `financeStore` mock calc | ❌ MOCK | ❌ |
| Monthly comparison | ❌ | — | ❌ | ❌ Not built |
| Doctor operations analysis | ❌ | — | ❌ | ❌ Not built |
| Revenue per cost center | ❌ | — | ❌ | ❌ Not built |
| Stakeholder share analysis | ❌ | — | ❌ | ❌ Not built |
| Filter by payer/service/date | ⚠️ UI only | Mock | ❌ MOCK | ❌ Filters don't query DB |

**REPORTS VERDICT**: ❌ All reports derive from mock `financeStore`. No real financial reporting.

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### MODULE M: FINANCE — SHAREHOLDERS
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Roadmap Feature | Page Exists | Data Source | Real DB? | Gap |
|-----------------|-------------|-------------|----------|-----|
| Shareholder registry | ✅ `/finance/shareholders` | `/api/shareholders` | ✅ Real DB | ✅ |
| Shareholder CRUD | ✅ | Real DB | ✅ | ✅ |
| Share percentage + investment | ✅ | Real DB fields | ✅ | ✅ |
| Board member info | ✅ | Real DB fields | ✅ | ✅ |
| Equity transactions (issuance, transfer) | ❌ | — | ❌ | ❌ Not built |
| Dividend calculation & distribution | ❌ | — | ❌ | ❌ Not built |
| Profit invoice for shareholders | ❌ | — | ❌ | ❌ Not built |
| Equity statement report | ❌ | — | ❌ | ❌ Not built |
| Ownership visualization | ❌ | — | ❌ | ❌ No chart |

**SHAREHOLDERS VERDICT**: ✅ Registry with real DB. ❌ All equity management, dividend logic, and profit invoices missing.

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### MODULE N: FINANCE — STAKEHOLDERS
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Roadmap Feature | Page Exists | Data Source | Real DB? | Gap |
|-----------------|-------------|-------------|----------|-----|
| Stakeholder list (doctors, nurses, outsource) | ✅ `/finance/stakeholders` | `financeStore` | ❌ MOCK | ❌ localStorage only |
| Stakeholder CRUD | ✅ | `financeStore` | ❌ MOCK | ❌ No DB persistence |
| Service type + price per stakeholder | ⚠️ | `financeStore` schema | ❌ MOCK | ❌ |
| Share type (% or currency) | ✅ schema | `financeStore` | ❌ MOCK | ❌ |
| Create invoice for stakeholder services | ❌ | — | ❌ | ❌ Not built |
| Link to insurance table | ❌ | — | ❌ | ❌ Not wired |

**STAKEHOLDERS VERDICT**: ❌ Entirely mock. No DB table, no API, no invoice creation.

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### MODULE O: FINANCE — SERVICE PAYMENTS
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Roadmap Feature | Page Exists | Data Source | Real DB? | Gap |
|-----------------|-------------|-------------|----------|-----|
| Service lines by provider | ✅ `/finance/service-payments` | `/api/service-payments` | ⚠️ API exists but... | ❌ No `/api/service-payments` route file found! |
| Pay providers | ✅ UI button | — | ❌ | ❌ API route missing |
| Provider list | ⚠️ Hardcoded PROVIDERS constant | Static JS array | ❌ MOCK | ❌ Not from DB |
| Payment batch tracking | ✅ Schema | — | ❌ | ❌ No payment_batches table |

**SERVICE PAYMENTS VERDICT**: ❌ The `/api/service-payments` route does not exist (no route.ts file). Page will always fail to load.

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### MODULE P: FINANCE — SERVICE PROVIDER REPORTS
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Roadmap Feature | Page Exists | Data Source | Real DB? | Gap |
|-----------------|-------------|-------------|----------|-----|
| Per-provider revenue summary | ✅ | `/api/service-provider-reports` | ✅ Real DB | ✅ Queries real invoice_items |
| Payment history per provider | ✅ | Real DB | ✅ | ✅ |
| Filter by provider / date / status | ✅ | Real DB | ✅ | ⚠️ Provider list is derived, not from providers table |

**SERVICE PROVIDER REPORTS VERDICT**: ✅ This works with real data from invoices.

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### MODULE Q: HR MODULE
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Roadmap Feature | Page Exists | Data Source | Real DB? | Gap |
|-----------------|-------------|-------------|----------|-----|
| Employee profiles (CV, education, licenses) | ✅ `/hr/employees` | `/api/staff` | ✅ Real DB | ⚠️ CV/education fields in type but not in staff table |
| Custom Staff ID generation | ✅ | `/api/staff` POST | ✅ Real DB | ⚠️ Sequence always = 1 (duplicate risk) |
| Attendance tracking (biometric) | ✅ `/hr/attendance` | `/api/hr/attendance` | ✅ Real DB | ✅ |
| Leave management (multi-type) | ✅ `/hr/leaves` | `/api/hr/leaves` | ✅ Real DB | ✅ |
| Multi-level leave approval | ✅ | Supabase workflows | ✅ Real DB | ✅ |
| Payroll calculation | ✅ `/hr/payroll` | `/api/hr/payroll/calculate` | ✅ Real DB | ✅ |
| Iraq tax calculation | ✅ | `iraq-tax-calculator.ts` | ✅ | ✅ |
| Bank file generation | ✅ | `bank-file-generator.ts` | ✅ | ✅ |
| Loan & advance management | ✅ | `/api/hr/payroll/loans` | ✅ Real DB | ✅ |
| Recruitment pipeline | ✅ `/hr/recruitment` | JSON mock | ❌ MOCK | ❌ No real DB for candidates |
| Performance reviews | ✅ `/hr/performance` | JSON mock | ❌ MOCK | ❌ |
| Training / certifications | ✅ `/hr/training` | JSON mock | ❌ MOCK | ❌ |
| Benefits (insurance, housing) | ✅ `/hr/benefits` | JSON mock | ❌ MOCK | ❌ |
| Organization chart | ✅ `/hr/organization/chart` | JSON mock | ❌ MOCK | ❌ |
| Job categories / grades | ✅ `/hr/job-categories` | JSON mock | ❌ MOCK | ❌ |
| End of service calculation | ✅ `/hr/payroll/end-of-service` | Real DB (payroll engine) | ✅ Real DB | ✅ |
| HR Dashboard metrics | ✅ | JSON mock | ❌ MOCK | ❌ Shows fake employee counts |
| Schedules / shifts | ✅ `/hr/schedules` | `shifts` DB table | ✅ Real DB | ✅ |
| Departments | ✅ `/hr/departments` | `/api/departments` | ✅ Real DB | ✅ |
| Specialties | ✅ `/specialties` | `/api/specialties` | ✅ Real DB | ✅ |

**HR VERDICT**:
- ✅ Core workflow (attendance, leave, payroll) — fully real DB
- ❌ Recruitment, performance, training, benefits — still mock JSON
- ❌ HR Dashboard shows mock stats

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### MODULE R: APPOINTMENTS
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Roadmap Feature | Page Exists | Data Source | Real DB? | Gap |
|-----------------|-------------|-------------|----------|-----|
| Schedule appointment | ✅ `/reception/appointments` | `/api/appointments` | ✅ Real DB | ✅ |
| Today's appointments view | ✅ | Real DB | ✅ | ✅ |
| Doctor availability check | ⚠️ | `/api/doctor-availability` | ✅ Real DB | ⚠️ Basic check only |
| Conflict detection | ✅ | `schedule-conflict-checker.ts` | ✅ | ✅ |
| Appointment status management | ✅ | Real DB | ✅ | ✅ |
| Appointment calendar | ✅ | `AppointmentCalendar` component | ✅ | ✅ |

**APPOINTMENTS VERDICT**: ✅ Well implemented with real DB.

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### MODULE S: PATIENTS (Manage)
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Roadmap Feature | Page Exists | Data Source | Real DB? | Gap |
|-----------------|-------------|-------------|----------|-----|
| Patient registration | ✅ Multiple pages | `/api/tibbna-openehr-patients` | ✅ Real DB (Neon) | ✅ |
| Demographics (DOB, gender, ID) | ✅ | Real DB | ✅ | ✅ |
| Insurance name + policy ID fields | ❌ Not in form | — | ❌ | ❌ Roadmap says: "add two fields referring to insurance name and insurance ID" |
| Medical history, allergies | ✅ Schema | `medicalhistory` field | ✅ | ⚠️ Stored as JSON blob |
| Emergency contact | ✅ | Real DB | ✅ | ✅ |
| Patient search by name/phone | ✅ | `/api/patient-search` | ✅ Real DB | ✅ |
| Patient balance tracking | ✅ Schema | Real DB | ✅ | ⚠️ Not updated automatically |

**PATIENTS VERDICT**: ✅ Core registration real DB. ❌ Insurance name/ID fields in patient form missing.

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### MODULE T: STANDALONE INSURANCE APP
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Roadmap Feature | Page Exists | Data Source | Real DB? | Gap |
|-----------------|-------------|-------------|----------|-----|
| Standalone `/insurance` page | ✅ | Unknown | ❓ | ❌ Needs investigation |
| Full claims management system | ❌ | — | ❌ | ❌ Not built |
| Pre-authorization workflows | ❌ | — | ❌ | ❌ Not built |
| ICD-10 / CPT integration | ❌ | — | ❌ | ❌ Not built |
| FHIR / HL7 APIs | ❌ | — | ❌ | ❌ Not built |

**STANDALONE INSURANCE VERDICT**: ❌ Shell page only. The full insurance system described in roadmap does not exist.

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### MODULE U: FULL INVENTORY APP (Separate)
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Roadmap Feature | Page Exists | Data Source | Real DB? | Gap |
|-----------------|-------------|-------------|----------|-----|
| Full inventory app | ❌ | — | ❌ | ❌ Not built as separate app |
| Multi-warehouse | ❌ | — | ❌ | ❌ Finance mock only |
| Pharmacy inventory | ✅ `/pharmacies` page | Unknown | ❓ | ❌ Needs investigation |
| Lab inventory | ✅ `/laboratories` page | Unknown | ❓ | ❌ Needs investigation |
| Patient-linked consumption | ❌ | — | ❌ | ❌ |
| Expiry / batch tracking | ❌ | — | ❌ | ❌ |
| PR → PO → GRN workflow | ❌ | — | ❌ | ❌ |

**INVENTORY APP VERDICT**: ❌ Not built as a standalone app. Pharmacy and Lab pages exist as shells.

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### MODULE V: MAIN DASHBOARD
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Roadmap Feature | Page Exists | Data Source | Real DB? | Gap |
|-----------------|-------------|-------------|----------|-----|
| Key metrics (patients, staff, appts, depts) | ✅ `/dashboard` | `data/dashboard.json` | ❌ MOCK | ❌ All hardcoded static JSON |
| Statistics diagram/table | ✅ Cards UI | MOCK JSON | ❌ MOCK | ❌ |
| "Advancing the future of health." homepage statement | ❌ | — | — | ❌ Not on any visible page |

**DASHBOARD VERDICT**: ❌ All mock data. No real metrics.

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### MODULE W: AUTHENTICATION
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Roadmap Feature | Page Exists | Data Source | Real DB? | Gap |
|-----------------|-------------|-------------|----------|-----|
| Login | ✅ `/login` | `users.json` | ❌ MOCK | ❌ Plain text passwords in JSON |
| Role-based access | ✅ `useAuth` hook | Mock `auth-store` | ❌ MOCK | ❌ |
| Real Supabase Auth | ❌ (API middleware only) | Supabase | ✅ Backend | ❌ Login form doesn't call Supabase |
| Audit logging | ✅ `logAudit()` in middleware | Supabase `audit_logs` | ✅ | ❌ No route enforces it |

---

## SECTION 4 — THE 3 BROKEN DB CONNECTIONS THAT MATTER MOST

```
PROBLEM 1: Service Payments page → no API route
────────────────────────────────────────────────
Page: /finance/service-payments
Calls: fetch('/api/service-payments')
Reality: No src/app/api/service-payments/route.ts exists
Result: Every page load returns 404, lines = [], page shows empty


PROBLEM 2: Finance Inventory → mock isolated from billing
────────────────────────────────────────────────────────
Page: /finance/inventory
Reads: financeStore.getStock() → localStorage
Reality: Invoice DB has no connection to stock levels
Result: Stock shown is demo data, not real hospital supplies
        When items are issued to patients, no stock deduction happens


PROBLEM 3: Stakeholders → localStorage only, no DB
────────────────────────────────────────────────────────
Page: /finance/stakeholders
Writes: financeStore.addStakeholder() → localStorage
Reality: No stakeholders table in DB, no API route
Result: Creating a stakeholder clears on browser refresh
        Invoice shares cannot reference real stakeholders
```

---

## SECTION 5 — CROSS-MODULE DATA CORRECTNESS CHECK

```
CROSS CHECK 1: Patient used in Invoice
───────────────────────────────────────
Source of patient data for invoices:
  → Invoice form: uses /api/tibbna-openehr-patients (Non-Medical DB patients)
  → Invoice record stores: patient_name (string), patient_id
  → Problem: patient_id in invoices table references patientid in patients table
  → RISK: If patient is deleted from Non-Medical DB, invoice has orphan patient_id
  → STATUS: ⚠️ FK exists but cross-system integrity not enforced


CROSS CHECK 2: Staff used in Appointments
──────────────────────────────────────────
Source: appointments.doctorid references staff.staffid
  → staff table is in the SAME PostgreSQL DB
  → JOIN works: appointments query joins staff by staff_id
  → STATUS: ✅ Correctly linked


CROSS CHECK 3: Leave Requests used in Payroll
──────────────────────────────────────────────
Source: payroll engine reads leave_requests from same DB
  → payroll-calculation-engine.ts queries leave_requests table
  → Attendance integration reads approved leaves
  → STATUS: ✅ Correctly linked


CROSS CHECK 4: Insurance used in Invoices
──────────────────────────────────────────
Source: invoices.insurance_company_id references insurance_companies.id
  → Both in same PostgreSQL DB
  → Invoice form fetches from /api/insurance-companies
  → STATUS: ✅ Correctly linked


CROSS CHECK 5: Services used in Invoice Items
───────────────────────────────────────────────
Source: invoice_items.service_id references services.id
  → BUT: /api/services returns mock data if services table doesn't exist
  → If services table is empty, invoice items have no real service reference
  → STATUS: ❌ RISK — services table may not exist in DB


CROSS CHECK 6: Departments used in Staff
─────────────────────────────────────────
Source: staff.unit (string name) ≠ departments.departmentid (UUID)
  → No FK between staff.unit and departments
  → staff.unit = "Cardiology" string, not a department UUID
  → STATUS: ❌ No referential integrity between staff and departments


CROSS CHECK 7: HR Employees vs HR Dashboard
────────────────────────────────────────────
HR Dashboard reads: employeesData from JSON → shows fake count
Employees page reads: /api/staff → real DB count
  → These numbers WILL be different
  → STATUS: ❌ Inconsistent data sources for same entity


CROSS CHECK 8: Finance Dashboard vs Real Invoices
───────────────────────────────────────────────────
Finance Dashboard reads: financeStore (mock invoices) for revenue figures
Invoices page reads: /api/invoices (real DB)
  → Revenue shown in dashboard ≠ actual revenue in DB
  → STATUS: ❌ Critical financial inconsistency


CROSS CHECK 9: Stakeholder shares in Invoices
───────────────────────────────────────────────
Invoice has no invoice_shares table or column
Stakeholders are in localStorage, not DB
  → No mechanism to distribute invoice revenue to stakeholders
  → STATUS: ❌ Core financial requirement completely absent
```

---

## SECTION 6 — MASTER STATUS SUMMARY TABLE

```
FEATURE                              BUILT  REAL DB  CORRECT   PRIORITY
─────────────────────────────────────────────────────────────────────────
Reception Dashboard (stats)          ⚠️      ❌       ❌        HIGH
Manage Patients (core)               ✅      ✅       ✅        ✅ DONE
Patient Insurance fields             ❌      ❌       ❌        HIGH
Appointments                         ✅      ✅       ✅        ✅ DONE
Customer Billing (invoices)          ✅      ✅       ✅        ✅ DONE
Returns / Refunds                    ✅      ✅       ⚠️        MEDIUM
Staff Info / Contacts                ✅      ✅       ✅        ✅ DONE
Todo List                            ✅      ✅       ⚠️        MEDIUM
Services Catalog (basic)             ✅      ⚠️       ❌        HIGH
Services multi-provider billing      ❌      ❌       ❌        CRITICAL
Provider price / equity per service  ❌      ❌       ❌        CRITICAL
Finance Dashboard (live data)        ❌      ❌       ❌        HIGH
Stakeholder share per invoice        ❌      ❌       ❌        CRITICAL
Insurance companies                  ✅      ✅       ✅        ✅ DONE
Patient insurance policy UI          ❌      ⚠️       ❌        HIGH
Full insurance workflow (claims)     ❌      ❌       ❌        FUTURE
Purchase Requests (PR)               ⚠️      ❌       ❌        HIGH
Purchase Orders (PO)                 ❌      ❌       ❌        HIGH
GRN / Triple matching                ❌      ❌       ❌        HIGH
Finance Inventory overview           ✅      ❌       ❌        HIGH
Inventory App (full)                 ❌      ❌       ❌        FUTURE
Suppliers                            ✅      ✅       ✅        ✅ DONE
Budget overview                      ✅      ✅       ✅        ✅ DONE
Budget on Finance Dashboard          ❌      ❌       ❌        HIGH
Accounting (CoA, journals)           ✅      ❌       ❌        HIGH
Financial Reports (real data)        ❌      ❌       ❌        HIGH
Cash Flow / Income Stmt / BS/TB      ✅ UI   ❌       ❌        HIGH
Shareholders (registry)              ✅      ✅       ✅        ✅ DONE
Shareholder equity management        ❌      ❌       ❌        HIGH
Dividend / profit invoice            ❌      ❌       ❌        HIGH
Stakeholders (registry)              ✅      ❌       ❌        CRITICAL
Stakeholder invoice creation         ❌      ❌       ❌        CRITICAL
Service Payments                     ✅UI    ❌       ❌        CRITICAL (API missing!)
Service Provider Reports             ✅      ✅       ✅        ✅ DONE
HR — Employees (list/create)         ✅      ✅       ✅        ✅ DONE
HR — Attendance                      ✅      ✅       ✅        ✅ DONE
HR — Leave Management                ✅      ✅       ✅        ✅ DONE
HR — Payroll (full engine)           ✅      ✅       ✅        ✅ DONE
HR — Recruitment                     ✅      ❌       ❌        MEDIUM
HR — Performance                     ✅      ❌       ❌        MEDIUM
HR — Training                        ✅      ❌       ❌        MEDIUM
HR — Benefits                        ✅      ❌       ❌        MEDIUM
HR — Organization Chart              ✅      ❌       ❌        LOW
HR Dashboard (real data)             ❌      ❌       ❌        HIGH
Authentication (real Supabase)       ❌      ❌       ❌        HIGH
Admin Dashboard (real data)          ❌      ❌       ❌        MEDIUM
staff.unit ↔ departments FK          ❌      ❌       ❌        MEDIUM
Patient insurance link in form       ❌      ❌       ❌        HIGH
Homepage: "Advancing health..."      ❌      —        —         LOW
About / Landing page                 ❌      —        —         LOW
```

---

## SECTION 7 — PRIORITIZED ACTION LIST

### 🔴 CRITICAL — System Breaks Without These
```
1. Create /api/service-payments/route.ts
   → Service Payments page shows empty/error right now

2. Create stakeholders DB table + API
   → All stakeholder data lost on browser refresh
   → Invoice share distribution impossible

3. Build invoice_shares table + UI
   → Core business requirement: distribute invoice revenue
   → Needed for: shareholder dividends, doctor fees, lab fees

4. Create services DB table (confirmed schema)
   → /api/services falls back to hardcoded mock
   → Invoice items have no real service references
   → Add: provider_price, price_type, insurance_approved, hospital_equity fields
```

### 🟠 HIGH — Major Roadmap Gaps
```
5. Add insurance_name + insurance_id to patient registration form
   → Roadmap explicitly requires: "add two fields referring to insurance name and insurance ID"

6. Build purchase_requests DB table + fix API (currently returns hardcoded mock)
   → Build full PR → PO → GRN → Invoice → Payment workflow

7. Wire Finance Dashboard to real DB
   → Replace financeStore widgets with API calls for revenue, invoices, budget

8. Migrate stakeholders to real DB
   → Create /api/stakeholders, stakeholders table

9. Build accounting real DB
   → chart_of_accounts, cost_centers, journal_entries tables + APIs
   → Wire invoice creation to auto-post GL entries

10. Wire finance/reports to real DB
    → Income statement from real invoices
    → Cash flow from real payments
    → Trial balance from real GL entries

11. Fix staff.unit → departments FK
    → Use department_id UUID instead of string name in staff table

12. Fix authentication to use Supabase Auth in login form

13. Multi-provider service selection in invoice billing
    → When service has multiple providers, show provider selector
    → Requires service_providers join table
```

### 🟡 MEDIUM — Important but Not Breaking
```
14. Migrate HR Dashboard to real API data (real employee, attendance counts)
15. Migrate Recruitment module to real DB
16. Add patient insurance policy UI tab in /finance/insurance
17. Fix Todo userId (hardcoded to dummy UUID)
18. Add budget create/edit form in /finance/budget
19. Shareholder equity transactions + dividend distribution
20. Wired return → auto-adjust parent invoice balance
```

### 🟢 LOW — Future / Enhancement
```
21. Full Insurance App (claims, pre-auth, ICD-10, FHIR)
22. Full Inventory App (separate multi-warehouse system)
23. HR Performance / Training / Benefits → real DB
24. Homepage "Advancing the future of health." statement
25. About / Landing page for Tibbna website
26. Remove 60+ debug/test API routes before production
```

---

## SECTION 8 — HOW TO CONVERT EACH MOCK MODULE TO REAL DB

### Pattern (Same for all modules):

```
STEP 1: DB Table
─────────────────
CREATE TABLE stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_id VARCHAR(50) UNIQUE NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  role VARCHAR(50),           -- DOCTOR, NURSE, LAB_TECH, etc.
  service_type VARCHAR(100),  -- OPERATION, CONSULTATION, etc.
  mobile VARCHAR(20),
  default_share_type VARCHAR(20),  -- PERCENTAGE or FIXED
  default_share_percentage DECIMAL(5,2),
  is_active BOOLEAN DEFAULT true,
  createdat TIMESTAMPTZ DEFAULT NOW(),
  updatedat TIMESTAMPTZ DEFAULT NOW()
);

STEP 2: API Route (src/app/api/stakeholders/route.ts)
──────────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

GET  → pool.query('SELECT * FROM stakeholders ORDER BY name_ar')
POST → pool.query('INSERT INTO stakeholders (...) VALUES (...) RETURNING *')
PUT  → pool.query('UPDATE stakeholders SET ... WHERE id=$1 RETURNING *')
DEL  → pool.query('DELETE FROM stakeholders WHERE id=$1')

STEP 3: Swap page data source
──────────────────────────────
// BEFORE:
financeStore.initialize();
setList(financeStore.getStakeholders());
financeStore.addStakeholder(current);

// AFTER:
useEffect(() => {
  fetch('/api/stakeholders').then(r => r.json()).then(setList);
}, []);

const handleSave = () => {
  fetch('/api/stakeholders', {
    method: modal === 'create' ? 'POST' : 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(current)
  }).then(() => { loadData(); setModal(null); });
};

STEP 4: Seed from existing mock JSON (one time)
────────────────────────────────────────────────
INSERT INTO stakeholders SELECT ... FROM json_populate_recordset(
  null::stakeholders, '[...JSON content from stakeholders.json...]'
);
```

**Apply this same 4-step pattern to**:
- `stakeholders` (CRITICAL)
- `purchase_requests` + `purchase_orders` (HIGH)
- `chart_of_accounts` + `journal_entries` (HIGH)
- `invoice_shares` (CRITICAL — new table needed)
- `service_providers` (CRITICAL — new join table for services)
- `candidates` + `job_vacancies` (MEDIUM)
- `performance_reviews` + `goals` (MEDIUM)
- `training_programs` + `enrollments` (MEDIUM)
- `benefit_plans` + `enrollments` (MEDIUM)

---

## SECTION 9 — NEW TABLES NEEDED (Not in any current schema)

```sql
-- 1. SERVICE PROVIDERS (service multi-provider support)
CREATE TABLE service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id VARCHAR(50) REFERENCES services(id),
  provider_id VARCHAR(50),          -- stakeholder or staff ID
  provider_type VARCHAR(20),        -- STAKEHOLDER, STAFF
  provider_price DECIMAL(12,2),
  price_type VARCHAR(20),           -- FIXED or PERCENTAGE
  price_value DECIMAL(10,4),
  is_active BOOLEAN DEFAULT true,
  createdat TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INVOICE SHARES (stakeholder distribution)
CREATE TABLE invoice_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id),
  stakeholder_id VARCHAR(50),
  stakeholder_name VARCHAR(255),
  share_type VARCHAR(20),           -- PERCENTAGE or FIXED
  share_percentage DECIMAL(5,2),
  share_amount DECIMAL(12,2),
  payment_status VARCHAR(20) DEFAULT 'PENDING',
  amount_paid DECIMAL(12,2) DEFAULT 0,
  payment_date TIMESTAMPTZ,
  createdat TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PURCHASE ORDERS (PO workflow)
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number VARCHAR(50) UNIQUE,
  pr_id UUID,                       -- links to purchase_requests
  supplier_id UUID,
  order_date DATE,
  delivery_date DATE,
  total_amount DECIMAL(12,2),
  status VARCHAR(30),               -- DRAFT/SENT/CONFIRMED/RECEIVED/INVOICED/PAID
  payment_terms VARCHAR(100),
  createdat TIMESTAMPTZ DEFAULT NOW()
);

-- 4. GOODS RECEIPT NOTES (GRN)
CREATE TABLE goods_receipt_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_number VARCHAR(50) UNIQUE,
  po_id UUID REFERENCES purchase_orders(id),
  received_date DATE,
  received_by VARCHAR(255),
  notes TEXT,
  status VARCHAR(20),               -- COMPLETE, PARTIAL, DISCREPANCY
  createdat TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CHART OF ACCOUNTS (real accounting)
CREATE TABLE chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number VARCHAR(20) UNIQUE,
  account_name VARCHAR(255),
  account_name_ar VARCHAR(255),
  account_type VARCHAR(20),         -- ASSET/LIABILITY/EQUITY/REVENUE/EXPENSE
  parent_account_id UUID,
  balance DECIMAL(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  createdat TIMESTAMPTZ DEFAULT NOW()
);

-- 6. JOURNAL ENTRIES (GL)
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number VARCHAR(50) UNIQUE,
  entry_date DATE,
  description TEXT,
  reference_type VARCHAR(50),       -- INVOICE, PAYMENT, PAYROLL, etc.
  reference_id UUID,
  total_debit DECIMAL(15,2),
  total_credit DECIMAL(15,2),
  status VARCHAR(20) DEFAULT 'POSTED',
  createdat TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID REFERENCES journal_entries(id),
  account_id UUID REFERENCES chart_of_accounts(id),
  debit DECIMAL(15,2) DEFAULT 0,
  credit DECIMAL(15,2) DEFAULT 0,
  description TEXT
);
```

---

*Analysis Date: 2026-05-27*
*Scope: Full roadmap comparison across all modules*
*Codebase: tibbna-hospital v1.0*
