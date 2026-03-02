# 🏥 TIBBNA HOSPITAL MANAGEMENT SYSTEM - DEVELOPMENT ROADMAP

## 📋 Executive Summary

This document provides a comprehensive development roadmap for building a fully functional Hospital Management System with proper integration sequence, data flow, and module dependencies.

---

## 🎯 Development Philosophy

### Core Principles:
1. **Foundation First**: Build core infrastructure before dependent modules
2. **Data Flow**: Ensure smooth data flow from input to output
3. **Integration Points**: Define clear APIs between modules
4. **Incremental Development**: Each phase delivers working functionality
5. **Testing at Each Stage**: Validate before moving to next phase

---

## 🏗️ SYSTEM ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER (UI)                       │
│  Reception | Finance | HR | Inventory | Lab | Pharmacy | Dept   │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER (APIs)                      │
│  Patient APIs | Billing APIs | HR APIs | Inventory APIs         │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                          │
│  Validation | Workflows | Rules | Calculations                  │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                    DATA LAYER (Database)                         │
│  Supabase (Operational) | Tibbna OpenEHR (Clinical)             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 MODULE DEPENDENCY MAP

```
PHASE 1: FOUNDATION (Core Infrastructure)
    ├── Organizations & Locations
    ├── Departments
    └── System Configuration

PHASE 2: HUMAN RESOURCES (People Management)
    ├── Employees (depends on: Departments)
    ├── Attendance (depends on: Employees)
    ├── Leaves (depends on: Employees)
    └── Payroll (depends on: Employees, Attendance)

PHASE 3: PATIENT MANAGEMENT (Clinical Foundation)
    ├── Patients (depends on: Organizations)
    ├── Insurance Providers (independent)
    ├── Insurance Policies (depends on: Patients, Providers)
    └── Medical Records (depends on: Patients)

PHASE 4: RECEPTION DESK (Front Office)
    ├── Patient Registration (depends on: Patients)
    ├── Appointments (depends on: Patients, Employees)
    ├── Check-in/Check-out (depends on: Appointments)
    └── Queue Management (depends on: Appointments)

PHASE 5: SERVICE CATALOG (Revenue Foundation)
    ├── Service Catalog (depends on: Departments)
    ├── Service Pricing (depends on: Service Catalog)
    └── Service Providers (independent)

PHASE 6: FINANCE & BILLING (Revenue Cycle)
    ├── Invoicing (depends on: Patients, Services, Insurance)
    ├── Payments (depends on: Invoices)
    ├── Returns (depends on: Invoices)
    ├── Service Payments (depends on: Invoices, Providers)
    ├── Budget Management (depends on: Departments)
    └── Financial Reports (depends on: All Finance)

PHASE 7: INVENTORY MANAGEMENT (Supply Chain)
    ├── Inventory Items (depends on: Organizations)
    ├── Suppliers (independent)
    ├── Purchase Requisitions (depends on: Items, Departments)
    ├── Purchase Orders (depends on: Requisitions, Suppliers)
    ├── Inventory Batches (depends on: Items, POs)
    ├── Inventory Movements (depends on: Batches, Locations)
    └── Stock Reports (depends on: All Inventory)

PHASE 8: PHARMACY (Medication Management)
    ├── Pharmacy Setup (depends on: Inventory, Locations)
    ├── Prescriptions (depends on: Patients, Employees)
    ├── Medication Dispensing (depends on: Prescriptions, Inventory)
    └── Pharmacy Billing (depends on: Dispensing, Finance)

PHASE 9: LABORATORY (Diagnostics)
    ├── Lab Setup (depends on: Departments, Locations)
    ├── Lab Tests Catalog (depends on: Service Catalog)
    ├── Lab Orders (depends on: Patients, Employees)
    ├── Lab Results (depends on: Lab Orders)
    └── Lab Billing (depends on: Lab Orders, Finance)

PHASE 10: DEPARTMENTS (Clinical Operations)
    ├── Department Workflows (depends on: All Previous)
    ├── Clinical Documentation (depends on: Patients, Employees)
    ├── Department Reports (depends on: All Operations)
    └── Quality Metrics (depends on: All Operations)
```

---

## 🚀 DETAILED DEVELOPMENT SEQUENCE

### **PHASE 1: FOUNDATION (Week 1-2)**
**Priority: CRITICAL - Everything depends on this**

#### 1.1 Database Schema Setup
- ✅ **Status**: Schema exists in `supabase/schema.sql`
- **Tasks**:
  - [ ] Deploy schema to Supabase
  - [ ] Create database indexes for performance
  - [ ] Set up Row Level Security (RLS) policies
  - [ ] Create database views for common queries

#### 1.2 Organizations & Locations
- **Database Tables**: `organizations`, `departments`, `locations`
- **API Endpoints**:
  - `GET/POST /api/organizations`
  - `GET/POST /api/departments`
  - `GET/POST /api/locations`
- **UI Pages**:
  - `/settings/organizations` - Organization management
  - `/settings/departments` - Department hierarchy
  - `/settings/locations` - Location management (wards, rooms, beds)

#### 1.3 System Configuration
- **Tasks**:
  - [ ] Authentication & Authorization (Supabase Auth)
  - [ ] User roles and permissions
  - [ ] System settings management
  - [ ] Audit logging setup

**OUTPUT**: Working organization structure, departments, and locations

---

### **PHASE 2: HUMAN RESOURCES (Week 3-4)**
**Priority: HIGH - Required for all operations**

#### 2.1 Employee Management
- **Database Tables**: `employees`, `salary_grades`
- **API Endpoints**:
  - `GET/POST/PUT/DELETE /api/employees`
  - `GET /api/employees/search`
  - `GET /api/salary-grades`
- **UI Pages**:
  - `/hr/employees` - Employee list with search/filter
  - `/hr/employees/new` - Add new employee
  - `/hr/employees/[id]` - Employee details & edit
  - `/hr/organization` - Organization chart

**Data Flow**:
```
INPUT: Employee personal info, job details, salary
  ↓
VALIDATION: Check required fields, unique employee number
  ↓
DATABASE: Save to employees table
  ↓
OUTPUT: Employee profile, employee number
```

#### 2.2 Attendance Management
- **Database Tables**: `attendance_records`
- **API Endpoints**:
  - `GET/POST /api/attendance`
  - `GET /api/attendance/daily-summary`
  - `GET /api/attendance/employee/[id]`
- **UI Pages**:
  - `/hr/attendance` - Daily attendance dashboard
  - `/hr/attendance/mark` - Mark attendance (check-in/out)
  - `/hr/attendance/reports` - Attendance reports

**Data Flow**:
```
INPUT: Employee check-in/check-out
  ↓
VALIDATION: Verify employee exists, check duplicate entries
  ↓
CALCULATION: Calculate total hours, late minutes, overtime
  ↓
DATABASE: Save to attendance_records
  ↓
OUTPUT: Attendance summary, reports
```

#### 2.3 Leave Management
- **Database Tables**: `leave_types`, `leave_balances`, `leave_requests`
- **API Endpoints**:
  - `GET/POST /api/leave-types`
  - `GET/POST /api/leave-requests`
  - `GET /api/leave-balances/[employee_id]`
  - `PATCH /api/leave-requests/[id]/approve`
- **UI Pages**:
  - `/hr/leaves` - Leave requests dashboard
  - `/hr/leaves/request` - Submit leave request
  - `/hr/leaves/approve` - Approve/reject leaves
  - `/hr/leaves/balances` - Leave balances

**Data Flow**:
```
INPUT: Leave request (dates, type, reason)
  ↓
VALIDATION: Check leave balance, date conflicts
  ↓
WORKFLOW: Multi-level approval process
  ↓
DATABASE: Update leave_requests, leave_balances
  ↓
OUTPUT: Leave status, updated balance
```

#### 2.4 Payroll Management
- **Database Tables**: `payroll_periods`, `payroll_transactions`
- **API Endpoints**:
  - `GET/POST /api/payroll/periods`
  - `GET/POST /api/payroll/transactions`
  - `POST /api/payroll/calculate`
  - `POST /api/payroll/approve`
- **UI Pages**:
  - `/hr/payroll` - Payroll dashboard
  - `/hr/payroll/periods` - Payroll periods
  - `/hr/payroll/calculate` - Calculate payroll
  - `/hr/payroll/reports` - Payroll reports

**Data Flow**:
```
INPUT: Payroll period, employee list
  ↓
FETCH: Base salary, attendance data, leave data
  ↓
CALCULATION: Gross salary, deductions, net salary
  ↓
DATABASE: Save to payroll_transactions
  ↓
OUTPUT: Payslips, payroll reports
```

**OUTPUT**: Complete HR system with employees, attendance, leaves, and payroll

---

### **PHASE 3: PATIENT MANAGEMENT (Week 5-6)**
**Priority: CRITICAL - Core clinical foundation**

#### 3.1 Patient Registration
- **Database Tables**: `patients`
- **Integration**: Tibbna OpenEHR database (existing)
- **API Endpoints**:
  - `GET/POST/PUT /api/patients`
  - `GET /api/patients/search`
  - `GET /api/patients/[mrn]`
  - `GET /api/tibbna-openehr-patients` (existing)
- **UI Pages**:
  - `/reception/patients` - Patient list (✅ exists)
  - `/reception/patients/new` - Register new patient
  - `/reception/patients/[id]` - Patient profile

**Data Flow**:
```
INPUT: Patient demographics, contact info, insurance
  ↓
VALIDATION: Check duplicate MRN, required fields
  ↓
DATABASE: Save to Tibbna OpenEHR + Supabase
  ↓
GENERATE: Medical Record Number (MRN)
  ↓
OUTPUT: Patient profile, MRN card
```

#### 3.2 Insurance Management
- **Database Tables**: `insurance_providers`, `insurance_policies`
- **API Endpoints**:
  - `GET/POST /api/insurance-providers`
  - `GET/POST /api/insurance-policies`
  - `GET /api/insurance-policies/patient/[id]`
  - `POST /api/insurance-policies/verify`
- **UI Pages**:
  - `/insurance` - Insurance dashboard
  - `/insurance/providers` - Insurance companies
  - `/insurance/policies` - Patient policies
  - `/insurance/verify` - Verify coverage

**Data Flow**:
```
INPUT: Insurance policy details
  ↓
VALIDATION: Verify policy dates, coverage limits
  ↓
DATABASE: Save to insurance_policies
  ↓
LINK: Associate with patient record
  ↓
OUTPUT: Active insurance coverage
```

**OUTPUT**: Complete patient registry with insurance integration

---

### **PHASE 4: RECEPTION DESK (Week 7-8)**
**Priority: HIGH - Front office operations**

#### 4.1 Appointment Management
- **Database Tables**: `appointments`, `appointment_slots`
- **API Endpoints**:
  - `GET/POST/PUT /api/appointments`
  - `GET /api/appointments/available-slots`
  - `GET /api/doctor-availability` (existing)
  - `PATCH /api/appointments/[id]/status`
- **UI Pages**:
  - `/reception/appointments` - Appointment calendar
  - `/reception/appointments/book` - Book appointment
  - `/reception/appointments/today` - Today's appointments

**Data Flow**:
```
INPUT: Patient, doctor, date/time, service
  ↓
CHECK: Doctor availability, slot conflicts
  ↓
DATABASE: Save to appointments table
  ↓
NOTIFY: Send confirmation (SMS/Email)
  ↓
OUTPUT: Appointment confirmation
```

#### 4.2 Patient Check-in/Check-out
- **API Endpoints**:
  - `POST /api/appointments/[id]/check-in`
  - `POST /api/appointments/[id]/check-out`
  - `GET /api/reception/queue`
- **UI Pages**:
  - `/reception` - Reception dashboard
  - `/reception/check-in` - Patient check-in
  - `/reception/queue` - Waiting queue

**Data Flow**:
```
INPUT: Patient arrival (check-in)
  ↓
UPDATE: Appointment status to "CHECKED_IN"
  ↓
ADD: Patient to waiting queue
  ↓
NOTIFY: Doctor about patient arrival
  ↓
OUTPUT: Queue position, estimated wait time
```

**OUTPUT**: Working reception desk with appointments and queue management

---

### **PHASE 5: SERVICE CATALOG (Week 9)**
**Priority: HIGH - Required for billing**

#### 5.1 Service Catalog Management
- **Database Tables**: `service_catalog`
- **API Endpoints**:
  - `GET/POST/PUT /api/services`
  - `GET /api/services/category/[category]`
  - `GET /api/services/search`
- **UI Pages**:
  - `/services` - Service catalog
  - `/services/new` - Add new service
  - `/services/[id]` - Service details

**Data Flow**:
```
INPUT: Service details, pricing, category
  ↓
VALIDATION: Unique service code, valid pricing
  ↓
DATABASE: Save to service_catalog
  ↓
OUTPUT: Service available for billing
```

#### 5.2 Service Pricing
- **Pricing Types**:
  - Self-pay pricing
  - Insurance pricing
  - Government pricing
- **Tasks**:
  - [ ] Price list management
  - [ ] Bulk price updates
  - [ ] Price history tracking

**OUTPUT**: Complete service catalog with multi-tier pricing

---

### **PHASE 6: FINANCE & BILLING (Week 10-12)**
**Priority: CRITICAL - Revenue cycle management**

#### 6.1 Invoice Generation
- **Database Tables**: `invoices`, `invoice_line_items`
- **API Endpoints**:
  - `GET/POST /api/invoices` (✅ exists)
  - `GET /api/invoices/[id]`
  - `POST /api/invoices/generate`
  - `PATCH /api/invoices/[id]/status`
- **UI Pages**:
  - `/finance/invoices` - Invoice list
  - `/finance/invoices/new` - Create invoice
  - `/finance/invoices/[id]` - Invoice details

**Data Flow**:
```
INPUT: Patient, services rendered, insurance info
  ↓
FETCH: Service prices based on payment category
  ↓
CALCULATE: Subtotal, insurance coverage, patient responsibility
  ↓
GENERATE: Invoice number
  ↓
DATABASE: Save to invoices + invoice_line_items
  ↓
OUTPUT: Invoice document (PDF), patient bill
```

#### 6.2 Payment Processing
- **Database Tables**: `payments`
- **API Endpoints**:
  - `GET/POST /api/payments`
  - `POST /api/invoices/[id]/pay`
  - `GET /api/payments/daily-summary`
- **UI Pages**:
  - `/finance/payments` - Payment processing
  - `/finance/payments/history` - Payment history
  - `/finance/cashier` - Cashier dashboard

**Data Flow**:
```
INPUT: Invoice, payment amount, payment method
  ↓
VALIDATION: Verify payment amount ≤ balance due
  ↓
UPDATE: Invoice paid_amount, balance_due, status
  ↓
DATABASE: Save to payments table
  ↓
PRINT: Payment receipt
  ↓
OUTPUT: Updated invoice status, receipt
```

#### 6.3 Invoice Returns
- **Database Tables**: `returns`
- **API Endpoints**:
  - `GET/POST /api/invoice-returns`
  - `PATCH /api/invoice-returns/[id]/approve`
- **UI Pages**:
  - `/finance/returns` - Returns management
  - `/finance/returns/new` - Create return

**Data Flow**:
```
INPUT: Invoice, return reason, return amount
  ↓
VALIDATION: Verify invoice exists, amount valid
  ↓
WORKFLOW: Approval process
  ↓
UPDATE: Create credit note, update invoice
  ↓
PROCESS: Refund to patient
  ↓
OUTPUT: Credit note, refund receipt
```

#### 6.4 Service Provider Payments
- **Database Tables**: `service_providers`, `provider_payments`
- **API Endpoints**:
  - `GET /api/service-payments` (✅ exists)
  - `POST /api/service-payments/batch-pay`
  - `GET /api/service-provider-reports`
- **UI Pages**:
  - `/finance/service-payments` - Provider payments
  - `/finance/service-provider-reports` - Provider reports

**Data Flow**:
```
INPUT: Service provider, invoice items
  ↓
FETCH: All unpaid services by provider
  ↓
CALCULATE: Total provider fees
  ↓
GENERATE: Batch payment
  ↓
UPDATE: Mark invoice items as PAID
  ↓
OUTPUT: Provider payment report
```

#### 6.5 Budget Management
- **Database Tables**: `budget_periods`, `budget_categories`, `budget_allocations`, `budget_transactions`
- **API Endpoints**:
  - `GET/POST /api/budget` (✅ exists)
  - `GET /api/budget/periods`
  - `GET /api/budget/allocations`
  - `POST /api/budget/transactions`
- **UI Pages**:
  - `/finance/budget` - Budget dashboard
  - `/finance/budget/periods` - Budget periods
  - `/finance/budget/allocations` - Department budgets

**Data Flow**:
```
INPUT: Fiscal year, budget categories, allocations
  ↓
ALLOCATE: Budget to departments/categories
  ↓
TRACK: Actual spending vs budget
  ↓
CALCULATE: Utilization, variance
  ↓
OUTPUT: Budget reports, variance analysis
```

#### 6.6 Financial Reports
- **Reports**:
  - Daily revenue report
  - Outstanding invoices (AR aging)
  - Payment collection report
  - Service provider payables
  - Budget utilization report
  - Profit & loss statement
- **UI Pages**:
  - `/finance/reports` - Financial reports dashboard

**OUTPUT**: Complete finance system with invoicing, payments, and reporting

---

### **PHASE 7: INVENTORY MANAGEMENT (Week 13-15)**
**Priority: HIGH - Supply chain management**

#### 7.1 Inventory Items Setup
- **Database Tables**: `inventory_items`
- **API Endpoints**:
  - `GET/POST/PUT /api/inventory/items`
  - `GET /api/inventory/items/search`
  - `GET /api/inventory/items/category/[category]`
- **UI Pages**:
  - `/inventory/items` - Item master list
  - `/inventory/items/new` - Add new item
  - `/inventory/items/[id]` - Item details

**Data Flow**:
```
INPUT: Item details, category, unit of measure
  ↓
VALIDATION: Unique item code, valid category
  ↓
DATABASE: Save to inventory_items
  ↓
OUTPUT: Item master record
```

#### 7.2 Supplier Management
- **Database Tables**: `suppliers`
- **API Endpoints**:
  - `GET/POST/PUT /api/suppliers`
  - `GET /api/suppliers/search`
- **UI Pages**:
  - `/inventory/suppliers` - Supplier list
  - `/inventory/suppliers/new` - Add supplier

**Data Flow**:
```
INPUT: Supplier details, contact, payment terms
  ↓
VALIDATION: Unique supplier code
  ↓
DATABASE: Save to suppliers table
  ↓
OUTPUT: Supplier profile
```

#### 7.3 Purchase Requisitions
- **Database Tables**: `purchase_requisitions`, `purchase_requisition_items`
- **API Endpoints**:
  - `GET/POST /api/purchase-requisitions`
  - `PATCH /api/purchase-requisitions/[id]/approve`
- **UI Pages**:
  - `/inventory/requisitions` - Requisition list
  - `/inventory/requisitions/new` - Create requisition
  - `/inventory/requisitions/approve` - Approve requisitions

**Data Flow**:
```
INPUT: Department, items needed, quantities
  ↓
VALIDATION: Check requesting authority
  ↓
WORKFLOW: Approval process
  ↓
DATABASE: Save to purchase_requisitions
  ↓
OUTPUT: Approved requisition for PO creation
```

#### 7.4 Purchase Orders
- **Database Tables**: `purchase_orders`, `purchase_order_items`
- **API Endpoints**:
  - `GET/POST /api/purchase-orders`
  - `PATCH /api/purchase-orders/[id]/send`
  - `POST /api/purchase-orders/[id]/receive`
- **UI Pages**:
  - `/inventory/purchase-orders` - PO list
  - `/inventory/purchase-orders/new` - Create PO
  - `/inventory/purchase-orders/receive` - Receive goods

**Data Flow**:
```
INPUT: Requisition, supplier, items, prices
  ↓
CALCULATE: Subtotal, tax, total
  ↓
GENERATE: PO number
  ↓
DATABASE: Save to purchase_orders
  ↓
SEND: PO to supplier (email/print)
  ↓
OUTPUT: Purchase order document
```

#### 7.5 Goods Receipt & Batches
- **Database Tables**: `inventory_batches`, `inventory_movements`
- **API Endpoints**:
  - `POST /api/inventory/receive`
  - `GET /api/inventory/batches`
  - `GET /api/inventory/movements`
- **UI Pages**:
  - `/inventory/receive` - Goods receipt
  - `/inventory/batches` - Batch tracking

**Data Flow**:
```
INPUT: PO, received quantities, batch details
  ↓
VALIDATION: Verify PO, check quantities
  ↓
CREATE: Inventory batches with expiry dates
  ↓
UPDATE: PO received quantities
  ↓
RECORD: Inventory movement (RECEIPT)
  ↓
OUTPUT: Updated stock levels
```

#### 7.6 Stock Management
- **API Endpoints**:
  - `GET /api/inventory/stock-levels`
  - `POST /api/inventory/adjust`
  - `POST /api/inventory/transfer`
  - `GET /api/inventory/low-stock`
  - `GET /api/inventory/expiring`
- **UI Pages**:
  - `/inventory` - Inventory dashboard
  - `/inventory/stock` - Stock levels
  - `/inventory/adjustments` - Stock adjustments
  - `/inventory/transfers` - Inter-location transfers

**Data Flow**:
```
STOCK ISSUE (to patient/department):
INPUT: Item, quantity, destination
  ↓
CHECK: Available stock (FIFO)
  ↓
UPDATE: Reduce batch quantity
  ↓
RECORD: Inventory movement (ISSUE)
  ↓
OUTPUT: Updated stock levels

STOCK TRANSFER:
INPUT: Item, quantity, from/to locations
  ↓
CHECK: Available stock at source
  ↓
UPDATE: Reduce source, increase destination
  ↓
RECORD: Inventory movement (TRANSFER)
  ↓
OUTPUT: Transfer document
```

#### 7.7 Inventory Reports
- **Reports**:
  - Stock levels by location
  - Low stock alerts
  - Expiring items
  - Stock valuation
  - Movement history
  - Consumption analysis
- **UI Pages**:
  - `/inventory/reports` - Inventory reports

**OUTPUT**: Complete inventory system with procurement and stock management

---

### **PHASE 8: PHARMACY (Week 16-17)**
**Priority: MEDIUM - Medication management**

#### 8.1 Pharmacy Setup
- **Database Tables**: Uses `inventory_items` (category='MEDICATION')
- **Tasks**:
  - [ ] Configure pharmacy locations
  - [ ] Set up medication categories
  - [ ] Define controlled substance rules
  - [ ] Configure prescription templates

#### 8.2 Prescription Management
- **Database Tables**: `prescriptions`, `prescription_items`
- **API Endpoints**:
  - `GET/POST /api/prescriptions`
  - `GET /api/prescriptions/patient/[id]`
  - `PATCH /api/prescriptions/[id]/dispense`
- **UI Pages**:
  - `/pharmacies` - Pharmacy dashboard
  - `/pharmacies/prescriptions` - Prescription queue
  - `/pharmacies/dispense` - Dispense medications

**Data Flow**:
```
INPUT: Doctor prescription (patient, medications, dosage)
  ↓
VALIDATION: Check drug interactions, allergies
  ↓
DATABASE: Save to prescriptions table
  ↓
QUEUE: Add to pharmacy dispensing queue
  ↓
DISPENSE: Pharmacist dispenses medications
  ↓
UPDATE: Reduce inventory stock (ISSUE movement)
  ↓
BILLING: Create invoice for medications
  ↓
OUTPUT: Dispensed medications, patient instructions
```

#### 8.3 Pharmacy Billing Integration
- **Integration**: Links to Finance module
- **Data Flow**:
```
Prescription → Dispense → Generate Invoice → Payment → Stock Update
```

**OUTPUT**: Working pharmacy with prescription management and inventory integration

---

### **PHASE 9: LABORATORY (Week 18-19)**
**Priority: MEDIUM - Diagnostic services**

#### 9.1 Lab Setup
- **Database Tables**: `lab_tests`, `lab_departments`
- **Tasks**:
  - [ ] Configure lab departments (Hematology, Chemistry, Microbiology, etc.)
  - [ ] Set up test catalog
  - [ ] Define normal ranges
  - [ ] Configure result templates

#### 9.2 Lab Test Management
- **Database Tables**: `lab_orders`, `lab_results`
- **API Endpoints**:
  - `GET/POST /api/lab/tests`
  - `GET/POST /api/lab/orders`
  - `GET/POST /api/lab/results`
  - `GET /api/lab/orders/patient/[id]`
- **UI Pages**:
  - `/laboratories` - Lab dashboard
  - `/laboratories/orders` - Lab orders queue
  - `/laboratories/results` - Enter results
  - `/laboratories/reports` - Lab reports

**Data Flow**:
```
INPUT: Doctor orders lab tests for patient
  ↓
GENERATE: Lab order number
  ↓
COLLECT: Sample collection (barcode)
  ↓
PROCESS: Lab technician performs tests
  ↓
ENTER: Lab results with normal ranges
  ↓
REVIEW: Pathologist reviews results
  ↓
APPROVE: Release results to doctor
  ↓
BILLING: Create invoice for lab tests
  ↓
OUTPUT: Lab report (PDF), results in patient record
```

#### 9.3 Lab Billing Integration
- **Integration**: Links to Finance module
- **Data Flow**:
```
Lab Order → Sample Collection → Results Entry → Generate Invoice → Payment
```

**OUTPUT**: Working laboratory with test management and billing integration

---

### **PHASE 10: DEPARTMENTS (Week 20-22)**
**Priority: LOW - Advanced clinical operations**

#### 10.1 Department-Specific Workflows
- **Departments**:
  - Emergency Department (ED)
  - Outpatient Department (OPD)
  - Inpatient Department (IPD)
  - Operating Room (OR)
  - Radiology
  - Cardiology
  - etc.

#### 10.2 Clinical Documentation
- **Database Tables**: `encounters`, `clinical_notes`, `vital_signs`, `diagnoses`
- **Features**:
  - SOAP notes
  - Vital signs tracking
  - Diagnosis coding (ICD-10)
  - Procedure coding (CPT)
  - Clinical orders

#### 10.3 Department Reports
- **Reports**:
  - Department performance metrics
  - Patient flow analysis
  - Service utilization
  - Quality indicators
  - Clinical outcomes

**OUTPUT**: Department-specific workflows and clinical documentation

---

## 🔄 DATA FLOW & INTEGRATION MATRIX

### **Cross-Module Data Flow**

```
┌─────────────┐
│  RECEPTION  │ → Patient Registration → PATIENT DB
└─────────────┘                              ↓
                                    ┌────────────────┐
                                    │  APPOINTMENTS  │
                                    └────────────────┘
                                             ↓
┌─────────────┐                    ┌────────────────┐
│  SERVICES   │ ← Service Catalog ← │   ENCOUNTER    │
└─────────────┘                    └────────────────┘
       ↓                                     ↓
┌─────────────┐                    ┌────────────────┐
│   FINANCE   │ ← Invoice Items   ← │   LAB/PHARMACY │
└─────────────┘                    └────────────────┘
       ↓                                     ↓
┌─────────────┐                    ┌────────────────┐
│  PAYMENTS   │                    │   INVENTORY    │
└─────────────┘                    └────────────────┘
       ↓                                     ↓
┌─────────────┐                    ┌────────────────┐
│   REPORTS   │ ← All Data        ← │   PROCUREMENT  │
└─────────────┘                    └────────────────┘
```

### **Key Integration Points**

| Source Module | Target Module | Data Exchanged | Integration Type |
|--------------|---------------|----------------|------------------|
| Reception | Patients | Patient demographics | Direct DB |
| Reception | Appointments | Appointment booking | API |
| Appointments | Finance | Service charges | API |
| Finance | Patients | Invoice, payment | Direct DB |
| Finance | Insurance | Coverage verification | API |
| Pharmacy | Inventory | Stock consumption | Direct DB |
| Pharmacy | Finance | Medication billing | API |
| Laboratory | Inventory | Reagent consumption | Direct DB |
| Laboratory | Finance | Test billing | API |
| HR | Finance | Payroll, expenses | Direct DB |
| Inventory | Finance | Purchase costs | Direct DB |
| All Modules | Reports | Operational data | API/Views |

---

## 📈 DEVELOPMENT TIMELINE SUMMARY

| Phase | Duration | Modules | Dependencies | Priority |
|-------|----------|---------|--------------|----------|
| **Phase 1** | 2 weeks | Foundation | None | CRITICAL |
| **Phase 2** | 2 weeks | HR | Phase 1 | HIGH |
| **Phase 3** | 2 weeks | Patients | Phase 1 | CRITICAL |
| **Phase 4** | 2 weeks | Reception | Phase 2, 3 | HIGH |
| **Phase 5** | 1 week | Services | Phase 1 | HIGH |
| **Phase 6** | 3 weeks | Finance | Phase 3, 4, 5 | CRITICAL |
| **Phase 7** | 3 weeks | Inventory | Phase 1, 2 | HIGH |
| **Phase 8** | 2 weeks | Pharmacy | Phase 6, 7 | MEDIUM |
| **Phase 9** | 2 weeks | Laboratory | Phase 6, 7 | MEDIUM |
| **Phase 10** | 3 weeks | Departments | All Previous | LOW |
| **TOTAL** | **22 weeks** (~5.5 months) | | | |

---

## ✅ TESTING STRATEGY

### **Testing at Each Phase**

1. **Unit Testing**
   - Test individual API endpoints
   - Test database operations
   - Test business logic functions

2. **Integration Testing**
   - Test data flow between modules
   - Test API integrations
   - Test database relationships

3. **User Acceptance Testing (UAT)**
   - Test with real users
   - Validate workflows
   - Gather feedback

4. **Performance Testing**
   - Load testing for concurrent users
   - Database query optimization
   - API response time testing

---

## 🎯 SUCCESS CRITERIA

### **Phase Completion Checklist**

Each phase is considered complete when:
- ✅ All database tables created and tested
- ✅ All API endpoints functional
- ✅ All UI pages responsive and working
- ✅ Data validation implemented
- ✅ Integration with dependent modules working
- ✅ Unit tests passing
- ✅ User documentation created
- ✅ UAT completed and approved

---

## 🚨 RISK MITIGATION

### **Common Risks & Solutions**

| Risk | Impact | Mitigation |
|------|--------|------------|
| Database schema changes | HIGH | Use migrations, version control |
| API breaking changes | HIGH | API versioning, backward compatibility |
| Data inconsistency | HIGH | Database constraints, transactions |
| Performance issues | MEDIUM | Indexing, caching, query optimization |
| Integration failures | MEDIUM | Error handling, retry logic, logging |
| User adoption | MEDIUM | Training, documentation, support |

---

## 📚 RECOMMENDED DEVELOPMENT PRACTICES

### **1. Code Organization**
```
src/
├── app/
│   ├── api/              # API routes
│   └── (dashboard)/      # UI pages
├── components/           # Reusable components
├── lib/                  # Business logic
├── types/                # TypeScript types
└── utils/                # Helper functions
```

### **2. API Design**
- RESTful endpoints
- Consistent response format
- Proper HTTP status codes
- Error handling
- Input validation
- Authentication/Authorization

### **3. Database Design**
- Proper indexes
- Foreign key constraints
- Audit fields (created_at, updated_at)
- Soft deletes where appropriate
- JSONB for flexible data

### **4. UI/UX Design**
- Responsive design (mobile-first)
- Consistent styling
- Loading states
- Error messages
- Success feedback
- Accessibility (ARIA labels)

---

## 🎓 RECOMMENDED LEARNING PATH FOR DEVELOPERS

### **Skills Required**

1. **Frontend**: React, Next.js, TypeScript, Tailwind CSS
2. **Backend**: Next.js API routes, Node.js
3. **Database**: PostgreSQL, Supabase, SQL
4. **Healthcare**: FHIR, HL7, openEHR basics
5. **Tools**: Git, VS Code, Postman, pgAdmin

---

## 📊 CURRENT STATUS

### **✅ Completed Modules**
- Foundation (Organizations, Departments, Locations) - Partial
- Patient Management (Tibbna OpenEHR integration) - Partial
- Finance (Budget, Invoices, Payments) - ✅ **CONNECTED TO DB**
- Reception (Patients page) - Partial

### **❌ Not Connected to Database**
- HR Module (using static JSON data)
- Inventory Module (not implemented)
- Pharmacy Module (not implemented)
- Laboratory Module (not implemented)

### **🎯 Recommended Next Steps**

1. **Immediate Priority**: Connect HR module to database (Phase 2)
2. **Short-term**: Complete Reception module (Phase 4)
3. **Medium-term**: Build Inventory module (Phase 7)
4. **Long-term**: Implement Pharmacy and Lab (Phases 8-9)

---

## 📞 SUPPORT & RESOURCES

### **Documentation**
- Database Schema: `supabase/schema.sql`
- API Documentation: Create OpenAPI/Swagger docs
- User Guides: Create per module

### **Development Tools**
- Database: Supabase Dashboard
- API Testing: Postman/Thunder Client
- Version Control: Git/GitHub
- Project Management: GitHub Issues/Projects

---

## 🎉 CONCLUSION

This roadmap provides a structured approach to building a complete Hospital Management System. By following the phased approach and respecting module dependencies, you'll build a robust, integrated system with smooth data flow between all components.

**Key Takeaways:**
1. Build foundation first (Organizations, Departments, Locations)
2. HR and Patients are core - prioritize them
3. Finance depends on Services and Patients
4. Inventory supports Pharmacy and Lab
5. Test thoroughly at each phase
6. Document as you build

**Estimated Timeline**: 22 weeks for full system
**Current Progress**: ~20% complete (Foundation + Finance partial)
**Next Focus**: HR Module database integration

---

*Last Updated: February 26, 2026*
*Version: 1.0*
