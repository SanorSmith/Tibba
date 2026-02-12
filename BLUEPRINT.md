# Tibbna-EHR Hospital Management System — Project Blueprint

> **Version:** 1.0 | **Last Updated:** February 2026  
> **Live Demo:** [tibbna-hospital.vercel.app](https://tibbna-hospital.vercel.app)  
> **Repository:** [github.com/SanorSmith/Tibba](https://github.com/SanorSmith/Tibba)

---

## Table of Contents

1. [What Is This Project?](#1-what-is-this-project)
2. [Who Is It For?](#2-who-is-it-for)
3. [System Modules Overview](#3-system-modules-overview)
4. [End-User Workflow — How It Works](#4-end-user-workflow--how-it-works)
5. [Developer Architecture — How It's Built](#5-developer-architecture--how-its-built)
6. [Project File Structure](#6-project-file-structure)
7. [Data Architecture](#7-data-architecture)
8. [Action Flow Diagrams](#8-action-flow-diagrams)
9. [Page Inventory (102 Pages)](#9-page-inventory-102-pages)
10. [Technology Stack](#10-technology-stack)
11. [Deployment & DevOps](#11-deployment--devops)
12. [Future Roadmap](#12-future-roadmap)

---

## 1. What Is This Project?

**Tibbna-EHR** is a comprehensive **Hospital Management System (HMS)** designed for Iraqi hospitals and healthcare facilities. It is a web-based application that digitizes and unifies all core hospital operations into a single platform.

### The Problem It Solves

| Traditional Hospital | With Tibbna-EHR |
|---|---|
| Paper-based patient records | Digital patient profiles |
| Manual invoice calculations | Automated billing & invoicing |
| Disconnected departments | Unified dashboard across all departments |
| No real-time inventory tracking | Live stock levels, expiry alerts, auto-reorder |
| Payroll done in spreadsheets | Integrated payroll with Iraqi labor law compliance |
| No performance visibility | KPI dashboards for every module |

### Key Highlights

- **102 functional pages** across 13 modules
- **Iraqi localization** — Arabic names, Iraqi Dinar (IQD) currency, Iraqi labor law compliance
- **Role-based access** — Admin, Doctor, Nurse, Billing Staff
- **Fully responsive** — Works on desktop, tablet, and mobile
- **Zero backend dependency** — Runs entirely in the browser with local data storage

---

## 2. Who Is It For?

### End Users (Hospital Staff)

| Role | What They Use |
|---|---|
| **Hospital Administrator** | Dashboard, Finance, HR, Reports — full access to all modules |
| **Doctor** | Patient records, Appointments, Lab results, Prescriptions |
| **Nurse** | Patient care, Attendance, Scheduling |
| **Billing Staff** | Invoices, Payments, Insurance claims, Returns |
| **HR Manager** | Employees, Payroll, Attendance, Leaves, Recruitment |
| **Inventory Manager** | Stock levels, Procurement, Pharmacy, Lab supplies |
| **Finance Manager** | Accounting, Reports, Stakeholders, Suppliers |

### Developers

- **Frontend developers** extending or customizing the system
- **Integration engineers** connecting to backend APIs, FHIR/HL7 systems, or openEHR
- **DevOps** deploying and maintaining the production environment

---

## 3. System Modules Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    TIBBNA-EHR HOSPITAL SYSTEM                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ DASHBOARD│  │ SERVICES │  │INVENTORY │  │ FINANCE  │       │
│  │  1 page  │  │  3 pages │  │ 25 pages │  │ 12 pages │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │    HR    │  │INSURANCE │  │ BILLING  │  │ PATIENTS │       │
│  │ 44 pages │  │  1 page  │  │  1 page  │  │  1 page  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │APPOINT-  │  │  STAFF   │  │   LABS   │  │PHARMACIES│       │
│  │  MENTS   │  │  1 page  │  │  1 page  │  │  1 page  │       │
│  │  1 page  │  └──────────┘  └──────────┘  └──────────┘       │
│  └──────────┘                                                   │
│                                                                 │
│  ┌──────────┐  ┌──────────┐                                    │
│  │  DEPTS   │  │  LOGIN   │                                    │
│  │  1 page  │  │  1 page  │                                    │
│  └──────────┘  └──────────┘                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Module Descriptions

#### A. Dashboard (1 page)
The central command center. Shows hospital-wide KPIs: total patients, today's appointments, revenue, bed occupancy. Quick action cards let staff jump to common tasks.

#### B. Services Module (3 pages)
Manages the hospital's service catalog — 15+ pre-configured services (consultations, diagnostics, lab tests, surgeries). Each service has pricing tiers for Insurance, Self-Pay, and Government patients.

#### C. Inventory Module (25 pages)
Full supply chain management:
- **Items** — Master catalog of all hospital supplies (medicines, equipment, consumables)
- **Stock** — Real-time stock levels, batch tracking, location management, movement history
- **Pharmacy** — Drug dispensing, controlled substance tracking
- **Laboratory** — Reagent management, analyzer tracking
- **Procurement** — Purchase requisitions, supplier management
- **Reports** — Stock status, expiry, consumption, compliance, financial reports
- **Alerts** — Low stock, expiring items, reorder notifications
- **Transfers** — Inter-department and inter-warehouse transfers

#### D. Finance Module (12 pages)
Complete financial management:
- **Dashboard** — Revenue, expenses, outstanding balances, quick actions
- **Patients** — Patient billing accounts and balances
- **Insurance** — Provider management, policy tracking, annual budgets
- **Stakeholders** — Hospital partners, shareholders, profit distribution
- **Invoices** — Create, view, manage invoices with payment tracking
- **Returns** — Refund processing and return management
- **Purchases** — Purchase requests (PRs) and purchase orders (POs)
- **Inventory** — Financial view of stock values and warehouse management
- **Suppliers** — Supplier directory with credit limits and payment terms
- **Accounting** — Chart of Accounts, Cost Centers, Journal Entries
- **Reports** — Income Statement, Balance Sheet, Cash Flow, Trial Balance

#### E. HR Module (44 pages)
The most comprehensive module:
- **Employees** — Directory, profiles, create/edit forms (56 employees with Iraqi names)
- **Attendance** — Daily tracking, biometric simulation, exception management, processing
- **Leaves** — Request management, calendar view, balance tracking, approval workflows
- **Payroll** — 5-step processing wizard, salary grades (G1-G10), loans, bank transfers, social security (Iraqi 5%/12%), end-of-service calculations (Iraqi labor law)
- **Recruitment** — Vacancy management, candidate pipeline, hiring workflow
- **Training** — Program management, session scheduling, CME tracking
- **Performance** — Review cycles, goal tracking, star ratings for 8 competencies
- **Benefits** — Health insurance, transport, housing allowances
- **Organization** — Department chart (24 departments), tree view
- **Reports** — Employee, attendance, payroll reports with charts and CSV/PDF export
- **Integrations** — HR↔Inventory and HR↔openEHR connections

#### F. Other Modules (Stub Pages)
Appointments, Billing, Insurance, Patients, Staff, Laboratories, Pharmacies, Departments — each has a placeholder dashboard ready for expansion.

---

## 4. End-User Workflow — How It Works

### 4.1 Login & Authentication

```
User opens app → Login page → Enter credentials → Role assigned → Dashboard
                                                                      │
                              ┌───────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │    DASHBOARD       │
                    │  (Role-specific    │
                    │   KPIs & actions)  │
                    └─────────┬─────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
        ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
        │  Finance   │  │    HR     │  │ Inventory  │
        │  Module    │  │  Module   │  │  Module    │
        └───────────┘  └───────────┘  └───────────┘
```

**Demo Credentials:**

| Role | Username | Password |
|------|----------|----------|
| Administrator | `demo` | `demo123` |
| Doctor | `doctor` | `doctor123` |
| Nurse | `nurse` | `nurse123` |
| Billing Staff | `billing` | `billing123` |

### 4.2 Typical Daily Workflows

#### Workflow A: Billing Staff — Creating an Invoice

```
1. Login as billing staff
2. Navigate: Sidebar → Finance → Invoices
3. Click "New Invoice" (blue button)
4. Select patient from dropdown
5. Add services (consultation, lab test, etc.)
6. System auto-calculates:
   ├── Subtotal
   ├── Discount (if applicable)
   ├── Insurance coverage (auto-detected from patient's policy)
   └── Patient responsibility
7. Choose payment method (Cash / Card / Bank Transfer)
8. Click "Create Invoice"
9. Invoice saved → appears in invoice list
10. Record payments as they come in
```

#### Workflow B: HR Manager — Processing Monthly Payroll

```
1. Login as admin
2. Navigate: Sidebar → HR → Payroll → Process
3. 5-Step Wizard:
   ├── Step 1: Select pay period (e.g., March 2024)
   ├── Step 2: Review attendance data (auto-pulled)
   ├── Step 3: Calculate salaries
   │           ├── Base salary (from grade G1-G10)
   │           ├── + Allowances (housing, transport, etc.)
   │           ├── - Deductions (tax, social security 5%, loans)
   │           └── = Net pay
   ├── Step 4: Approve payroll
   └── Step 5: Generate outputs
               ├── Bank transfer file (CSV/TXT)
               ├── Pay slips
               └── Social security report (Iraqi 12% employer contribution)
```

#### Workflow C: Inventory Manager — Handling Low Stock

```
1. Login as admin
2. Navigate: Sidebar → Inventory → Alerts
3. See items flagged as LOW_STOCK or OUT_OF_STOCK
4. Click item → View details (current stock, consumption rate)
5. Navigate: Procurement → Requisitions → New
6. Create purchase requisition
   ├── Select supplier
   ├── Add items and quantities
   └── Submit for approval
7. Once approved → becomes Purchase Order
8. When goods arrive → Record receipt in Stock → Movements
9. Stock levels update automatically
```

#### Workflow D: Finance Manager — Monthly Financial Review

```
1. Navigate: Finance → Reports
2. Review tabs:
   ├── Income Statement — Revenue vs. Expenses → Net Income
   ├── Balance Sheet — Assets, Liabilities, Equity
   ├── Cash Flow — Operating, Investing, Financing activities
   └── Trial Balance — All accounts with debit/credit totals
3. Navigate: Finance → Accounting → Journal Entries
4. Review posted entries, verify balances
5. Navigate: Finance → Stakeholders
6. Review profit distribution and pending shares
```

### 4.3 Navigation Structure (What the User Sees)

```
┌─────────────────────────────────────────────────────────┐
│  NAVBAR (Top)                                           │
│  ┌─────────┐  ┌──────────────────────┐  ┌───────────┐  │
│  │ ☰ Menu  │  │ Search...            │  │ User Menu │  │
│  └─────────┘  └──────────────────────┘  └───────────┘  │
├──────────┬──────────────────────────────────────────────┤
│ SIDEBAR  │  MAIN CONTENT AREA                          │
│          │                                              │
│ Dashboard│  ┌──────────────────────────────────────┐   │
│          │  │  KPI Cards (4 across)                │   │
│ MODULES  │  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐       │   │
│ Services │  │  │ 📊 │ │ 📊 │ │ 📊 │ │ 📊 │       │   │
│ Inventory│  │  └────┘ └────┘ └────┘ └────┘       │   │
│ ▼Finance │  ├──────────────────────────────────────┤   │
│  Patients│  │  Filters / Tabs / Search Bar         │   │
│  Insur.. │  ├──────────────────────────────────────┤   │
│  Invoices│  │  Data Table                          │   │
│  ...     │  │  ┌──────┬──────┬──────┬──────┐      │   │
│ ▼HR      │  │  │ Name │ Date │Amount│Action│      │   │
│  Employ..│  │  ├──────┼──────┼──────┼──────┤      │   │
│  Attend..│  │  │ ...  │ ...  │ ...  │ 👁️🗑️ │      │   │
│  Leaves  │  │  └──────┴──────┴──────┴──────┘      │   │
│  Payroll │  └──────────────────────────────────────┘   │
│  ...     │                                              │
│          │                                              │
│ EXISTING │                                              │
│ Patients │                                              │
│ Appoint..│                                              │
│ Staff    │                                              │
│ Labs     │                                              │
│ Pharmacy │                                              │
│ Depts    │                                              │
└──────────┴──────────────────────────────────────────────┘
```

---

## 5. Developer Architecture — How It's Built

### 5.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      BROWSER (Client)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Next.js App Router (v13)                │   │
│  │                                                     │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │   │
│  │  │  Pages   │  │Components│  │   Middleware      │  │   │
│  │  │ (102)    │  │ (Layout, │  │ (Auth protection) │  │   │
│  │  │          │  │  UI, etc)│  │                   │  │   │
│  │  └────┬─────┘  └────┬─────┘  └──────────────────┘  │   │
│  │       │              │                               │   │
│  │  ┌────▼──────────────▼──────────────────────────┐   │   │
│  │  │              State Management                 │   │   │
│  │  │                                               │   │   │
│  │  │  ┌────────────┐  ┌────────────┐              │   │   │
│  │  │  │ Auth Store │  │Finance     │              │   │   │
│  │  │  │ (Zustand)  │  │Store       │              │   │   │
│  │  │  └────────────┘  └────────────┘              │   │   │
│  │  │  ┌────────────┐  ┌────────────┐              │   │   │
│  │  │  │ Data Store │  │ Local      │              │   │   │
│  │  │  │ (Inventory)│  │ Storage    │              │   │   │
│  │  │  └────────────┘  └────────────┘              │   │   │
│  │  └──────────────────────┬───────────────────────┘   │   │
│  │                         │                            │   │
│  │  ┌──────────────────────▼───────────────────────┐   │   │
│  │  │              JSON Data Files                  │   │   │
│  │  │  (Static demo data loaded at build time)      │   │   │
│  │  │                                               │   │   │
│  │  │  users.json  services.json  dashboard.json    │   │   │
│  │  │  hr/*.json   finance/*.json inventory/*.json  │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Styling: Tailwind CSS + shadcn/ui (Radix UI primitives)   │
│  Icons: Lucide React | Charts: Recharts | Forms: RHF + Zod │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Key Design Patterns

#### Pattern 1: Page Component Structure
Every page follows the same pattern:

```typescript
'use client';

// 1. Imports
import { useState, useEffect, useMemo } from 'react';
import { financeStore } from '@/lib/financeStore';

// 2. Component
export default function PageName() {
  // 3. Hydration guard (prevents SSR mismatch)
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // 4. Load data from store
  const data = financeStore.getInvoices();

  // 5. Local state for UI (filters, modals, search)
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'create' | 'view' | null>(null);

  // 6. Computed/filtered data
  const filtered = useMemo(() =>
    data.filter(d => d.name.includes(search)),
  [data, search]);

  // 7. Loading state
  if (!mounted) return <LoadingSkeleton />;

  // 8. Render: KPIs → Filters → Table → Modals
  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* KPI Cards */}
      {/* Filter Bar */}
      {/* Data Table (desktop) / Cards (mobile) */}
      {/* Modals (create, view, edit, delete) */}
    </div>
  );
}
```

#### Pattern 2: Data Store (Client-Side)
Data stores load JSON files and provide CRUD operations:

```typescript
// financeStore.ts — Singleton pattern
class FinanceStore {
  private invoices: Invoice[] = [];

  constructor() {
    this.loadFromJSON();        // Load static demo data
    this.loadFromLocalStorage(); // Override with user changes
  }

  getInvoices(): Invoice[] { return this.invoices; }
  createInvoice(inv: Invoice) { this.invoices.push(inv); this.persist(); }
  updateInvoice(id: string, data: Partial<Invoice>) { /* ... */ }
  deleteInvoice(id: string) { /* ... */ }

  private persist() { localStorage.setItem('finance', JSON.stringify(this.invoices)); }
}

export const financeStore = new FinanceStore();
```

#### Pattern 3: Responsive Layout
Every table has a dual layout:

```
Desktop (md+):  <table> with columns, sortable headers
Mobile (<md):   <div> cards stacked vertically
```

#### Pattern 4: Modal System
All CRUD operations use inline modals:

```
List Page → Click "New" → Create Modal (form)
         → Click row    → View Modal (read-only details)
         → Click edit   → Edit Modal (pre-filled form)
         → Click delete → Confirm Modal → Delete
```

### 5.3 Authentication Flow (Developer View)

```
middleware.ts
    │
    ├── Request to /dashboard/* or any protected route
    │   ├── Check cookie/localStorage for auth token
    │   ├── Token exists? → Allow request
    │   └── No token? → Redirect to /login
    │
    └── Request to /login
        ├── Already authenticated? → Redirect to /dashboard
        └── Not authenticated? → Show login form
                                    │
                                    ▼
                              auth-store.ts (Zustand)
                                    │
                                    ├── Validate against users.json
                                    ├── Set user in store
                                    ├── Persist to localStorage
                                    └── Redirect to /dashboard
```

---

## 6. Project File Structure

```
tibbna-hospital/
│
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (dashboard)/              # Protected layout group
│   │   │   ├── layout.tsx            # Dashboard shell (sidebar + navbar)
│   │   │   ├── dashboard/page.tsx    # Main dashboard
│   │   │   │
│   │   │   ├── finance/             # FINANCE MODULE (12 pages)
│   │   │   │   ├── page.tsx          # Finance dashboard
│   │   │   │   ├── patients/         # Patient billing
│   │   │   │   ├── insurance/        # Insurance providers
│   │   │   │   ├── stakeholders/     # Hospital stakeholders
│   │   │   │   ├── invoices/         # Invoice management
│   │   │   │   │   ├── page.tsx      # Invoice list
│   │   │   │   │   └── new/page.tsx  # Create invoice form
│   │   │   │   ├── returns/          # Returns & refunds
│   │   │   │   ├── purchases/        # PRs and POs
│   │   │   │   ├── inventory/        # Financial inventory view
│   │   │   │   ├── suppliers/        # Supplier management
│   │   │   │   ├── accounting/       # Chart of Accounts, Journals
│   │   │   │   └── reports/          # Financial statements
│   │   │   │
│   │   │   ├── hr/                  # HR MODULE (44 pages)
│   │   │   │   ├── page.tsx          # HR dashboard
│   │   │   │   ├── employees/        # Employee CRUD + profiles
│   │   │   │   ├── attendance/       # Daily, biometric, exceptions
│   │   │   │   ├── leaves/           # Requests, calendar, balances
│   │   │   │   ├── payroll/          # Process, loans, bank transfer
│   │   │   │   ├── recruitment/      # Vacancies, candidates
│   │   │   │   ├── training/         # Programs, sessions
│   │   │   │   ├── performance/      # Reviews, goals
│   │   │   │   ├── benefits/         # Insurance, transport, housing
│   │   │   │   ├── organization/     # Org chart
│   │   │   │   ├── reports/          # HR reports with charts
│   │   │   │   └── integrations/     # Inventory & openEHR links
│   │   │   │
│   │   │   ├── inventory/           # INVENTORY MODULE (25 pages)
│   │   │   │   ├── page.tsx          # Inventory dashboard
│   │   │   │   ├── items/            # Item catalog + CRUD
│   │   │   │   ├── stock/            # Batches, locations, movements
│   │   │   │   ├── pharmacy/         # Dispensing, controlled drugs
│   │   │   │   ├── laboratory/       # Reagents, analyzers
│   │   │   │   ├── procurement/      # Requisitions, suppliers
│   │   │   │   ├── reports/          # 6 report types
│   │   │   │   ├── alerts/           # Stock alerts
│   │   │   │   ├── transfers/        # Stock transfers
│   │   │   │   └── consumption/      # Usage tracking
│   │   │   │
│   │   │   ├── services/            # SERVICE MODULE (3 pages)
│   │   │   ├── appointments/        # Stub (1 page)
│   │   │   ├── billing/             # Stub (1 page)
│   │   │   ├── insurance/           # Stub (1 page)
│   │   │   ├── patients/            # Stub (1 page)
│   │   │   ├── staff/               # Stub (1 page)
│   │   │   ├── laboratories/        # Stub (1 page)
│   │   │   ├── pharmacies/          # Stub (1 page)
│   │   │   └── departments/         # Stub (1 page)
│   │   │
│   │   ├── login/page.tsx           # Login page
│   │   ├── layout.tsx               # Root layout
│   │   ├── page.tsx                 # Home (redirects to dashboard)
│   │   └── globals.css              # Global styles + Tailwind
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── sidebar.tsx          # Side navigation with expandable modules
│   │   │   ├── navbar.tsx           # Top navigation bar
│   │   │   ├── user-menu.tsx        # User dropdown (profile, logout)
│   │   │   └── idle-timer.tsx       # Auto-logout on inactivity
│   │   ├── ui/                      # shadcn/ui components (Button, Dialog, etc.)
│   │   ├── auth/                    # Auth-related components
│   │   ├── inventory/               # Inventory-specific components
│   │   └── modules/                 # Shared module components
│   │
│   ├── data/                        # Static JSON demo data
│   │   ├── users.json               # 5 demo user accounts
│   │   ├── services.json            # 15 hospital services
│   │   ├── dashboard.json           # Dashboard metrics
│   │   ├── finance/                 # 8 finance data files
│   │   │   ├── invoices.json        # 21 KB — invoices with line items
│   │   │   ├── accounting.json      # 19 KB — chart of accounts, journals
│   │   │   ├── inventory.json       # 16 KB — stock with financial values
│   │   │   ├── stakeholders.json    # 15 KB — stakeholder profiles
│   │   │   ├── purchases.json       # 12 KB — PRs and POs
│   │   │   ├── patients.json        # 6 KB — patient billing accounts
│   │   │   ├── insurance.json       # 5 KB — insurance providers/policies
│   │   │   └── suppliers.json       # 5 KB — supplier directory
│   │   ├── hr/                      # 18 HR data files (~2 MB total)
│   │   │   ├── attendance-transactions.json  # 771 KB — detailed records
│   │   │   ├── attendance.json               # 418 KB — daily summaries
│   │   │   ├── payroll-transactions.json     # 304 KB — pay records
│   │   │   ├── training-enrollments.json     # 89 KB
│   │   │   ├── leaves.json                   # 79 KB
│   │   │   ├── goals.json                    # 74 KB
│   │   │   ├── employees.json                # 58 KB — 56 employees
│   │   │   ├── performance-reviews.json      # 47 KB
│   │   │   ├── certificates.json             # 38 KB
│   │   │   └── ... (8 more files)
│   │   └── inventory/               # 9 inventory data files
│   │       ├── items.json           # 26 KB — item master catalog
│   │       └── ... (8 more files)
│   │
│   ├── lib/                         # Utilities & stores
│   │   ├── financeStore.ts          # Finance data CRUD (26 KB)
│   │   ├── dataStore.ts             # Inventory data CRUD (21 KB)
│   │   ├── utils.ts                 # Tailwind merge utility
│   │   └── constants.ts             # App-wide constants
│   │
│   ├── store/
│   │   └── auth-store.ts            # Zustand authentication store
│   │
│   ├── types/                       # TypeScript interfaces
│   │   ├── hr.ts                    # 50+ HR interfaces (20 KB)
│   │   ├── finance.ts               # Finance types (17 KB)
│   │   ├── inventory.ts             # Inventory types (12 KB)
│   │   ├── auth.ts                  # Auth types
│   │   └── service.ts               # Service types
│   │
│   └── middleware.ts                # Route protection middleware
│
├── public/                          # Static assets
├── tailwind.config.ts               # Tailwind + custom design tokens
├── tsconfig.json                    # TypeScript configuration
├── next.config.js                   # Next.js configuration
└── package.json                     # Dependencies
```

---

## 7. Data Architecture

### 7.1 Data Flow

```
┌──────────────┐     Build Time      ┌──────────────┐
│  JSON Files  │ ──────────────────► │  Data Stores │
│  (src/data/) │                     │  (Singleton) │
└──────────────┘                     └──────┬───────┘
                                            │
                                     Runtime│(in browser)
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
              ┌─────▼─────┐          ┌─────▼─────┐          ┌─────▼─────┐
              │   READ    │          │  CREATE   │          │  UPDATE   │
              │ (display  │          │ (new item │          │ (edit     │
              │  in UI)   │          │  → store) │          │  → store) │
              └───────────┘          └─────┬─────┘          └─────┬─────┘
                                           │                       │
                                     ┌─────▼───────────────────────▼─────┐
                                     │         localStorage              │
                                     │  (persists user changes across    │
                                     │   browser sessions)               │
                                     └───────────────────────────────────┘
```

### 7.2 Data Models (Key Entities)

```
FINANCE:
  Invoice ──────── has many ──── InvoiceLineItem
    │                               │
    ├── patient_id                  ├── service_id
    ├── total_amount                ├── quantity
    ├── insurance_coverage          ├── unit_price
    ├── balance_due                 └── line_total
    └── payments[]

  Stakeholder ──── has many ──── StakeholderShare
  Supplier ─────── has many ──── PurchaseOrder
  Account ──────── has many ──── JournalEntryLine

HR:
  Employee ─────── has many ──── AttendanceRecord
    │                               │
    ├── employee_id                 ├── date
    ├── department_id               ├── check_in / check_out
    ├── salary_grade                └── status
    ├── hire_date
    │
    ├── has many ──── LeaveRequest
    ├── has many ──── PayrollTransaction
    ├── has many ──── TrainingEnrollment
    └── has many ──── PerformanceReview

INVENTORY:
  Item ─────────── has many ──── StockBatch
    │                               │
    ├── item_id                     ├── batch_number
    ├── category                    ├── expiry_date
    ├── unit_of_measure             ├── quantity
    └── reorder_level               └── location_id
```

---

## 8. Action Flow Diagrams

### 8.1 Invoice Creation Flow

```
┌─────────┐    ┌──────────┐    ┌──────────────┐    ┌──────────────┐
│ Finance  │───►│ Invoices │───►│  New Invoice  │───►│   Summary    │
│Dashboard │    │   List   │    │    Form       │    │   Sidebar    │
└─────────┘    └──────────┘    │               │    │              │
                               │ Select Patient │    │ Subtotal     │
                               │ Add Services   │───►│ - Discount   │
                               │ Set Discount   │    │ = Total      │
                               │ Payment Method │    │ - Insurance  │
                               └───────┬────────┘    │ = Patient    │
                                       │             │   Pays       │
                                       │             │              │
                                       │             │ [Create      │
                                       │             │  Invoice]    │
                                       │             └──────┬───────┘
                                       │                    │
                                       ▼                    ▼
                               ┌──────────────────────────────┐
                               │  financeStore.createInvoice() │
                               │  → localStorage persisted     │
                               │  → Redirect to invoice list   │
                               └──────────────────────────────┘
```

### 8.2 Payroll Processing Flow

```
Step 1              Step 2              Step 3              Step 4              Step 5
┌──────────┐       ┌──────────┐       ┌──────────┐       ┌──────────┐       ┌──────────┐
│  Select   │──────►│  Review  │──────►│Calculate │──────►│ Approve  │──────►│ Generate │
│  Period   │       │Attendance│       │ Salaries │       │ Payroll  │       │ Outputs  │
│           │       │          │       │          │       │          │       │          │
│ Month     │       │ Present  │       │ Base     │       │ Review   │       │ Bank     │
│ Year      │       │ Absent   │       │+Allowance│       │ Summary  │       │ Transfer │
│ Department│       │ Late     │       │-Deduction│       │ Confirm  │       │ Pay Slips│
│           │       │ Leave    │       │=Net Pay  │       │          │       │ SS Report│
└──────────┘       └──────────┘       └──────────┘       └──────────┘       └──────────┘
```

### 8.3 Inventory Procurement Flow

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Low Stock │───►│   Create     │───►│   Approve    │───►│   Receive    │
│  Alert    │    │ Requisition  │    │   (becomes   │    │   Goods      │
│           │    │              │    │    PO)       │    │              │
└──────────┘    │ Items        │    │ Manager      │    │ Update stock │
                │ Quantities   │    │ reviews &    │    │ Record batch │
                │ Supplier     │    │ approves     │    │ Update value │
                └──────────────┘    └──────────────┘    └──────────────┘
```

### 8.4 Leave Request Flow

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Employee  │───►│   Submit     │───►│   Manager    │───►│   Balance    │
│ Checks    │    │   Request    │    │   Reviews    │    │   Updated    │
│ Balance   │    │              │    │              │    │              │
│           │    │ Type         │    │ Approve /    │    │ Days         │
│ Available │    │ Start date   │    │ Reject with  │    │ deducted     │
│ days      │    │ End date     │    │ comments     │    │ from balance │
│ shown     │    │ Reason       │    │              │    │              │
└──────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

---

## 9. Page Inventory (102 Pages)

### Dashboard (1 page)
| # | Page | Path | Description |
|---|------|------|-------------|
| 1 | Main Dashboard | `/dashboard` | Hospital-wide KPIs, activity, quick actions |

### Services Module (3 pages)
| # | Page | Path | Description |
|---|------|------|-------------|
| 2 | Service Catalog | `/services` | Browse 15+ services with filters |
| 3 | Add Service | `/services/add` | Create new service |
| 4 | Service Detail | `/services/[id]` | Full service info with pricing tiers |

### Finance Module (12 pages)
| # | Page | Path | Description |
|---|------|------|-------------|
| 5 | Finance Dashboard | `/finance` | Revenue, expenses, KPIs, quick actions |
| 6 | Patients | `/finance/patients` | Patient billing accounts |
| 7 | Insurance | `/finance/insurance` | Providers, policies, budgets |
| 8 | Stakeholders | `/finance/stakeholders` | Partners & profit distribution |
| 9 | Invoice List | `/finance/invoices` | All invoices with payment status |
| 10 | New Invoice | `/finance/invoices/new` | Create invoice with service lines |
| 11 | Returns | `/finance/returns` | Refund processing |
| 12 | Purchases | `/finance/purchases` | PRs and POs management |
| 13 | Inventory | `/finance/inventory` | Stock values & warehouses |
| 14 | Suppliers | `/finance/suppliers` | Supplier directory & credit |
| 15 | Accounting | `/finance/accounting` | CoA, Cost Centers, Journals |
| 16 | Reports | `/finance/reports` | Income, Balance Sheet, Cash Flow, Trial Balance |

### HR Module (44 pages)
| # | Page | Path | Description |
|---|------|------|-------------|
| 17 | HR Dashboard | `/hr` | Staff KPIs, alerts, payroll overview |
| 18 | Employee Directory | `/hr/employees` | Search, filter, table + cards |
| 19 | Employee Profile | `/hr/employees/[id]` | Full profile with tabs |
| 20 | New Employee | `/hr/employees/new` | 3-step creation form |
| 21 | Edit Employee | `/hr/employees/[id]/edit` | Edit form |
| 22 | Attendance Dashboard | `/hr/attendance` | Daily summary with KPIs |
| 23 | Daily Attendance | `/hr/attendance/daily` | Day-by-day records |
| 24 | Biometric | `/hr/attendance/biometric` | Fingerprint simulation |
| 25 | Exceptions | `/hr/attendance/exceptions` | Exception management |
| 26 | Process Attendance | `/hr/attendance/process` | Batch processing |
| 27 | Attendance Reports | `/hr/attendance/reports` | Charts & export |
| 28 | Leaves Dashboard | `/hr/leaves` | Types, policies, overview |
| 29 | Leave Requests | `/hr/leaves/requests` | Request list with filters |
| 30 | New Leave Request | `/hr/leaves/requests/new` | Submit with balance check |
| 31 | Leave Detail | `/hr/leaves/requests/[id]` | Request detail + history |
| 32 | Approve Leave | `/hr/leaves/requests/[id]/approve` | Approval workflow |
| 33 | Leave Calendar | `/hr/leaves/calendar` | Monthly calendar view |
| 34 | Leave Balances | `/hr/leaves/balances` | All employee balances |
| 35 | Payroll Dashboard | `/hr/payroll` | Periods, grades, loans |
| 36 | Process Payroll | `/hr/payroll/process` | 5-step wizard |
| 37 | Loan Detail | `/hr/payroll/loans/[id]` | Repayment schedule |
| 38 | New Loan | `/hr/payroll/loans/new` | Loan calculator form |
| 39 | Bank Transfer | `/hr/payroll/bank-transfer` | CSV/TXT file generation |
| 40 | Social Security | `/hr/payroll/social-security` | Iraqi SS contributions |
| 41 | End of Service | `/hr/payroll/end-of-service` | Iraqi labor law EOS |
| 42 | Recruitment | `/hr/recruitment` | Overview |
| 43 | Vacancies | `/hr/recruitment/vacancies` | Vacancy cards |
| 44 | Vacancy Detail | `/hr/recruitment/vacancies/[id]` | Pipeline + applicants |
| 45 | Candidate Profile | `/hr/recruitment/candidates/[id]` | Candidate detail |
| 46 | Training | `/hr/training` | Programs & sessions |
| 47 | New Program | `/hr/training/programs/new` | Create training program |
| 48 | New Session | `/hr/training/sessions/new` | Schedule session |
| 49 | Performance | `/hr/performance` | Reviews & recognitions |
| 50 | Goals | `/hr/performance/goals` | Goal tracking |
| 51 | New Review | `/hr/performance/reviews/new` | Star rating form |
| 52 | Benefits | `/hr/benefits` | Plans & enrollments |
| 53 | Health Insurance | `/hr/benefits/health-insurance` | Insurance plans |
| 54 | Transport | `/hr/benefits/transport` | Transport benefits |
| 55 | Housing | `/hr/benefits/housing` | Housing allowance |
| 56 | Organization | `/hr/organization` | Department structure |
| 57 | Org Chart | `/hr/organization/chart` | Tree + grid view |
| 58 | HR Reports | `/hr/reports` | Report catalog |
| 59 | Employee Report | `/hr/reports/employee` | Charts + export |
| 60 | Attendance Report | `/hr/reports/attendance` | Charts + export |
| 61 | Payroll Report | `/hr/reports/payroll` | Charts + export |
| 62 | Inventory Integration | `/hr/integrations/inventory` | HR↔Inventory |
| 63 | openEHR Integration | `/hr/integrations/openehr` | HR↔openEHR |

### Inventory Module (25 pages)
| # | Page | Path | Description |
|---|------|------|-------------|
| 64 | Inventory Dashboard | `/inventory` | Stock overview & KPIs |
| 65 | Items List | `/inventory/items` | Item catalog |
| 66 | New Item | `/inventory/items/new` | Create item |
| 67 | Item Detail | `/inventory/items/[id]` | Full item info |
| 68 | Edit Item | `/inventory/items/[id]/edit` | Edit item |
| 69 | Stock Overview | `/inventory/stock` | Current levels |
| 70 | Batches | `/inventory/stock/batches` | Batch tracking |
| 71 | Locations | `/inventory/stock/locations` | Warehouse locations |
| 72 | Movements | `/inventory/stock/movements` | Stock movement history |
| 73 | Pharmacy | `/inventory/pharmacy` | Pharmacy overview |
| 74 | Controlled Drugs | `/inventory/pharmacy/controlled` | Controlled substances |
| 75 | Dispensing | `/inventory/pharmacy/dispensing` | Drug dispensing |
| 76 | Laboratory | `/inventory/laboratory` | Lab overview |
| 77 | Analyzers | `/inventory/laboratory/analyzers` | Analyzer tracking |
| 78 | Reagents | `/inventory/laboratory/reagents` | Reagent management |
| 79 | Procurement | `/inventory/procurement` | Procurement overview |
| 80 | Requisitions | `/inventory/procurement/requisitions` | Purchase requisitions |
| 81 | New Requisition | `/inventory/procurement/requisitions/new` | Create requisition |
| 82 | Procurement Suppliers | `/inventory/procurement/suppliers` | Supplier list |
| 83 | Consumption | `/inventory/consumption` | Usage tracking |
| 84 | Patient-Linked | `/inventory/consumption/patient-linked` | Per-patient usage |
| 85 | Transfers | `/inventory/transfers` | Stock transfers |
| 86 | Alerts | `/inventory/alerts` | Low stock & expiry alerts |
| 87 | Reports Hub | `/inventory/reports` | Report index |
| 88 | Stock Status | `/inventory/reports/stock-status` | Current stock report |
| 89 | Expiry Report | `/inventory/reports/expiry` | Expiring items |
| 90 | Consumption Report | `/inventory/reports/consumption` | Usage analysis |
| 91 | Financial Report | `/inventory/reports/financial` | Stock valuation |
| 92 | Compliance Report | `/inventory/reports/compliance` | Regulatory compliance |

### Stub Modules (10 pages)
| # | Page | Path | Description |
|---|------|------|-------------|
| 93 | Appointments | `/appointments` | Appointment management (stub) |
| 94 | Billing | `/billing` | Billing overview (stub) |
| 95 | Insurance | `/insurance` | Insurance management (stub) |
| 96 | Patients | `/patients` | Patient records (stub) |
| 97 | Staff | `/staff` | Staff directory (stub) |
| 98 | Laboratories | `/laboratories` | Lab management (stub) |
| 99 | Pharmacies | `/pharmacies` | Pharmacy management (stub) |
| 100 | Departments | `/departments` | Department management (stub) |

### Authentication (1 page)
| # | Page | Path | Description |
|---|------|------|-------------|
| 101 | Login | `/login` | Authentication with role selection |
| 102 | Home | `/` | Redirects to dashboard |

---

## 10. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 13 (App Router) | Server-side rendering, routing, layouts |
| **Language** | TypeScript | Type safety across 50+ interfaces |
| **Styling** | Tailwind CSS | Utility-first CSS, responsive design |
| **UI Components** | shadcn/ui (Radix UI) | Accessible, composable primitives |
| **State** | Zustand | Lightweight auth state management |
| **Data** | JSON + localStorage | Demo data with client-side persistence |
| **Icons** | Lucide React | 40+ icons used across the app |
| **Charts** | Recharts | Bar, Pie, Donut charts in reports |
| **Forms** | React Hook Form + Zod | Form validation (ready to use) |
| **Deployment** | Vercel | Auto-deploy from GitHub main branch |
| **Repository** | GitHub | Version control |

### Design System

| Token | Value | Usage |
|-------|-------|-------|
| Primary Blue | `#5B7FE8` | Brand color, active states |
| Action Blue | `bg-blue-400` | All Add/New/Create buttons |
| Action Blue Hover | `bg-blue-500` | Button hover state |
| Delete Red | `bg-red-500` | Delete/destructive actions |
| Text Primary | `text-gray-900` | Primary numbers, headings |
| Text Secondary | `text-gray-600` | Secondary numbers, labels |
| Background | `#F5F5F5` | Page background |
| Card | `white` with `border` | Content containers |
| Font | Inter | System font family |

---

## 11. Deployment & DevOps

### Current Setup

```
Developer pushes to GitHub (main branch)
         │
         ▼
┌─────────────────┐
│   GitHub Repo   │
│   main branch   │
└────────┬────────┘
         │ (webhook)
         ▼
┌─────────────────┐
│     Vercel      │
│  Auto-deploy    │
│  Build: next    │
│  Output: static │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Production    │
│  tibbna-hospital│
│  .vercel.app    │
└─────────────────┘
```

### How to Deploy

```bash
# Option 1: Push to GitHub (auto-deploys)
git add -A
git commit -m "your changes"
git push origin main

# Option 2: Manual deploy via Vercel CLI
npx vercel --prod --yes
```

### Local Development

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at localhost:3000
npm run build        # Production build
npm run lint         # Run linter
```

---

## 12. Future Roadmap

### Phase 1: Backend Integration (Priority)
- [ ] Connect to REST API / GraphQL backend
- [ ] Replace JSON files with database (PostgreSQL / MongoDB)
- [ ] Real authentication with JWT tokens
- [ ] Role-based access control (RBAC) on server side

### Phase 2: Expand Stub Modules
- [ ] Full Patient Management (registration, medical history, visits)
- [ ] Appointment Scheduling (calendar, reminders, doctor availability)
- [ ] Laboratory Module (test orders, results, reference ranges)
- [ ] Pharmacy Module (prescriptions, drug interactions, dispensing)
- [ ] Billing Module (insurance claims, payment plans)

### Phase 3: Clinical Integration
- [ ] openEHR / FHIR / HL7 integration for clinical data
- [ ] Electronic Medical Records (EMR)
- [ ] Clinical Decision Support
- [ ] Medical imaging integration (DICOM)

### Phase 4: Advanced Features
- [ ] Real-time notifications (WebSocket)
- [ ] PDF report generation (server-side)
- [ ] Multi-language support (Arabic RTL + English LTR)
- [ ] Audit trail logging
- [ ] Data export (Excel, CSV, PDF)
- [ ] Mobile app (React Native)

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Pages** | 102 |
| **Fully Built Modules** | 4 (Finance, HR, Inventory, Services) |
| **Stub Modules** | 8 (ready for expansion) |
| **TypeScript Interfaces** | 50+ |
| **Demo Data Files** | 30+ JSON files (~2.5 MB) |
| **Demo Employees** | 56 (with Iraqi names & profiles) |
| **Demo Departments** | 24 |
| **Hospital Services** | 15+ |
| **User Roles** | 4 (Admin, Doctor, Nurse, Billing) |
| **Currency** | Iraqi Dinar (IQD) |
| **Compliance** | Iraqi labor law, social security |

---

**Built for Tibbna-EHR Hospital Management System**
