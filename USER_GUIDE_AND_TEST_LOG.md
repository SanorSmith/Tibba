# 🏥 Tibbna Hospital Management System
# User Guide & Acceptance-Test Log

**Version:** 1.0  **Tester name:** ______________  **Date:** ____________  **Environment:** ☐ Local ☐ Vercel (`tibbna-hospital.vercel.app`)

---

## How to use this document

This is **two things at once**:

1. **A user guide** — read the *Action* and *Expected result* columns to learn how to use each feature, step by step.
2. **A test log** — as you perform each step, mark **Pass/Fail** and write any problem in the **Notes / Bug for developer** column. Developers will read those notes to fix issues.

**Legend for the Pass/Fail column:** write **P** (works), **F** (fails/wrong), or **B** (blocked — couldn't reach this step).

> When you find a bug: in the Notes column write **what you expected, what actually happened, and (if shown) the error message**. Then copy it into the [Issue Log](#-issue-log-fill-as-you-test) at the end.

**Module test-case codes:** AUTH (login), DASH (dashboard), REC (reception), FIN (finance), INS (insurance), CLM (claims), ACC (accounting), RPT (reports), SHR (shareholders), STK (stakeholders/distributions), SUP (suppliers/payables), BUD (budget), INV (inventory), HR (human resources), STF (staff portal).

---

## Table of Contents

1. [Login & Access (AUTH)](#1-login--access-auth)
2. [Dashboard (DASH)](#2-dashboard-dash)
3. [Reception Desk (REC)](#3-reception-desk-rec)
4. [Finance — Invoices (FIN)](#4-finance--customer-invoices-fin)
5. [Insurance (INS)](#5-insurance-ins)
6. [Insurance Claims (CLM)](#6-insurance-claims-clm)
7. [Accounting / General Ledger (ACC)](#7-accounting--general-ledger-acc)
8. [Financial Reports (RPT)](#8-financial-reports-rpt)
9. [Shareholders (SHR)](#9-shareholders-shr)
10. [Stakeholders & Distributions (STK)](#10-stakeholders--distributions-stk)
11. [Suppliers & Payables (SUP)](#11-suppliers--payables-sup)
12. [Budget (BUD)](#12-budget-bud)
13. [Inventory (INV)](#13-inventory-inv)
14. [Human Resources (HR)](#14-human-resources-hr)
15. [Staff Portal (STF)](#15-staff-portal-stf)
16. [Issue Log](#-issue-log-fill-as-you-test)

---

## 1. Login & Access (AUTH)

**Purpose:** Sign in and reach the dashboard. **Where:** the system URL.

### TC-AUTH-01 — Sign in
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | Open the system URL | The Login page appears | | |
| 2 | Enter a valid username + password | Fields accept input | | |
| 3 | Click **Sign In** | You are taken to the Dashboard | | |
| 4 | Enter a **wrong** password and sign in | A clear error message appears; you stay on Login | | |

### TC-AUTH-02 — Navigation & roles
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | Look at the left sidebar | All modules you have access to are listed | | |
| 2 | Click a module with a **▾** arrow | It expands to show sub-pages | | |
| 3 | Open the system root `/` while logged out | You are redirected to Login | | |

---

## 2. Dashboard (DASH)

**Purpose:** At-a-glance overview. **Where:** Sidebar → **Dashboard**.

### TC-DASH-01 — View dashboard
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | Click **Dashboard** | Summary cards/figures load (no blank/0 everywhere) | | |
| 2 | Click a shortcut/card | You jump to the related module | | |

---

## 3. Reception Desk (REC)

**Where:** Sidebar → **Reception Desk ▾** (Patients · Appointments · Customer Billing · Returns · Staff Info · Todo List).

### TC-REC-01 — Register a new patient
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | Reception → **Manage Patients** | Patient list loads | | |
| 2 | Click **New Patient** | A form opens | | |
| 3 | Fill first name, last name, national ID, mobile, DOB, gender | Fields accept input | | |
| 4 | (Optional) add insurance details | Insurance fields accept input | | |
| 5 | Click **Save** | Patient is created and appears in the list | | |

### TC-REC-02 — Search for a patient
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | In the search box type a **name** (e.g. `Noor`) | Matching patients appear | | |
| 2 | Search by **national ID** | Correct patient appears | | |
| 3 | Search by **mobile number** | Correct patient appears | | |
| 4 | Click a patient | Their record opens | | |

### TC-REC-03 — Book an appointment
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | Reception → **Appointments** | Appointment table loads with All/Today/Upcoming/Past filters | | |
| 2 | Click **New Appointment** | The booking dialog opens | | |
| 3 | Search and select a **patient** | Patient is selected | | |
| 4 | Choose **medical staff** from dropdown | Staff selected | | |
| 5 | Pick a **date**, then an available **time slot** | Booked slots show red; selected slot highlights | | |
| 6 | Set name/type/indication/unit/location | Fields accept input | | |
| 7 | Click **Create Appointment** | Appointment appears in the table | | |

### TC-REC-04 — Edit / cancel / delete an appointment
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | **Click an appointment row** (or **Edit**) | The record opens **pre-filled** | | |
| 2 | Change the time slot → **Save Changes** | New time is saved and shown | | |
| 3 | Open it again → **Cancel Appointment** → confirm | Status becomes **Cancelled** | | |
| 4 | On a row, click the **🗑 trash** button → confirm | Appointment is removed from the list | | |
| 5 | Filter **Today / Upcoming / Past** | List filters correctly by date | | |

### TC-REC-05 — Returns & Todos
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | Reception → **Returns** → start a return → pick an invoice/line | Return is recorded; invoice balance adjusts | | |
| 2 | Reception → **Todo List** → add a task → tick it done | Task adds and toggles complete | | |

---

## 4. Finance — Customer Invoices (FIN)

**Purpose:** Bill patients, apply insurance, record payments. **Where:** Finance → **Customer Invoices**.

### TC-FIN-01 — Create a self-pay invoice
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | Click **New Invoice** | The invoice form opens | | |
| 2 | **Search Patient** and select one | Patient details fill in | | |
| 3 | Click **Add Service**, choose a service (e.g. CONS001) | Price auto-fills | | |
| 4 | Set quantity | Line total updates | | |
| 5 | Set Status = **Paid**, Method = **Cash** | Fields accept | | |
| 6 | Click **Create** | Invoice is created and listed | | |

### TC-FIN-02 — Insurance auto-fill & provider split
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | Select a patient who **has an insurance policy** | Insurance company + coverage % auto-fill | | |
| 2 | Add a service that has **multiple providers** | A **Provider** dropdown appears on that line | | |
| 3 | Pick the provider who performed it | Provider is selected | | |
| 4 | Review Patient Responsibility vs Coverage Amount | Split matches the coverage % | | |
| 5 | **Create** | Invoice saved; revenue posts to the ledger | | |

### TC-FIN-03 — Pre-approval at billing
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | Select a patient who has an **APPROVED** pre-approval | A green **"Pre-Approval on file"** banner appears (auth #, amount, expiry) | | |
| 2 | Add services exceeding the authorized amount | An **amber over-limit warning** shows | | |
| 3 | Try to save with an **expired** authorization | A confirmation/warning blocks accidental save | | |
| 4 | Save a valid one | Authorization number is attached to the invoice | | |

---

## 5. Insurance (INS)

**Where:** Finance → **Insurance**. Tabs: **Companies · Patient Policies · Pre-Approvals**.

### TC-INS-01 — Insurance companies
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | **Companies** tab → **Add Company** | Form opens | | |
| 2 | Enter name, email, phone, coverage % → **Save** | Company appears with the coverage % | | |
| 3 | Edit the company | Changes save | | |

### TC-INS-02 — Patient policies
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | **Patient Policies** tab → **Add Policy** | Form opens | | |
| 2 | Search & select a patient | Patient selected (no raw ID typing) | | |
| 3 | Choose **company** (dropdown) + **policy type** (dropdown) + number → **Save** | Policy saved and listed | | |
| 4 | Create an invoice for that patient | Insurance now auto-fills (links TC-FIN-02) | | |

### TC-INS-03 — Pre-approvals workflow
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | **Pre-Approvals** tab → **Request Pre-Approval** | Form opens | | |
| 2 | Select patient + insurer, enter CPT code(s) + authorized amount + justification → **Save** | Request created with status **PENDING** | | |
| 3 | On the row click **🖨 PDF** | A printable request document opens with all details | | |
| 4 | Click **✉ Email** | An email draft to the insurer opens (with details) | | |
| 5 | Click **Mark Approved** → set amount + expiry | Status becomes **APPROVED** | | |
| 6 | Click **Mark Rejected** on another | Status becomes **REJECTED** | | |

---

## 6. Insurance Claims (CLM)

**Where:** Finance → **Insurance Claims**.

### TC-CLM-01 — Claims pipeline
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | Open **Insurance Claims** | 5 KPI cards show (Total · Claimed · Approved · Paid · Pending) | | |
| 2 | Create an insured invoice (TC-FIN-02) | A claim appears as **Submitted** | | |
| 3 | Open a claim | Details show (patient, invoice, amount, authorization #) | | |
| 4 | Update Approved/Paid amount + status | Values + KPI cards update | | |
| 5 | Filter by status | Table filters correctly | | |

---

## 7. Accounting / General Ledger (ACC)

**Where:** Finance → **Accounting**.

### TC-ACC-01 — Chart of accounts & journals
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | Open **Accounting** | Account list with balances loads | | |
| 2 | Click an account (e.g. **1111 Cash & Bank**) | Its journal entries + running balance show | | |
| 3 | Create an invoice, then return here | A new journal entry exists (auto-posted) | | |
| 4 | Confirm each entry balances | Debit total = Credit total | | |

---

## 8. Financial Reports (RPT)

**Where:** Finance → **Reports**. Tabs: Income Statement · Balance Sheet · Trial Balance · AR Aging · AP Aging · Cash Flow. **Period selector** at the top.

### TC-RPT-01 — Period selector
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | Change preset to **This Year** | All tabs refresh for the year | | |
| 2 | Switch to **Last Year** | Figures change (likely 0 if no prior activity) | | |
| 3 | Enter custom **From/To** | Mode label updates ("Period activity" vs "As of") | | |

### TC-RPT-02 — Statements
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | **Income Statement** tab | Revenue − Expenses = Net Income shown | | |
| 2 | **Balance Sheet** tab | Assets = Liabilities + Equity (shows "Balanced ✓") | | |
| 3 | **Trial Balance** tab | Debit total = Credit total | | |

### TC-RPT-03 — Aging & cash flow
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | **AR Aging** tab | Unpaid invoices grouped by patient + buckets (Current/30/60/90/90+) | | |
| 2 | Cross-check AR total vs Balance Sheet AR line | They match | | |
| 3 | **AP Aging** tab | Supplier balances by overdue bucket (or "all settled") | | |
| 4 | **Cash Flow** tab | Opening → Operating/Investing/Financing → Closing balance | | |
| 5 | Cross-check Cash Flow closing vs Balance Sheet cash | They match | | |

### TC-RPT-04 — Print/PDF
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | Click **🖨 Print / PDF** | Print dialog opens, report formatted cleanly (no menus) | | |
| 2 | Save as PDF | A readable PDF is produced | | |

---

## 9. Shareholders (SHR)

**Where:** Finance → **Shareholders**.

### TC-SHR-01 — Manage shareholders & capital
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | **Add Shareholder** → name + share % → **Save** | Shareholder listed | | |
| 2 | Record a **capital contribution** | Posts DR Cash / CR Owner's Capital (check Accounting) | | |
| 3 | Open a shareholder's **account statement** | Capital + dividend history shows | | |

### TC-SHR-02 — Dividend distribution
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | Click **Distribute Dividend** | **Available to Distribute** figure shows | | |
| 2 | Enter an amount above available | Over-distribution warning appears | | |
| 3 | Enter a valid amount → confirm | Each shareholder gets pro-rata share; posts DR Retained Earnings / CR Cash | | |

---

## 10. Stakeholders & Distributions (STK)

**Where:** Finance → **Stakeholders** (setup) and **Distributions** (payouts).

### TC-STK-01 — Stakeholder setup
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | Finance → **Stakeholders** → add a provider (name, role, bank, share %) | Provider saved | | |
| 2 | Link the provider to a service (service config) | Link saved | | |

### TC-STK-02 — Pay a provider (with GL + statement)
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | Finance → **Distributions** | Each provider shows Pending/Paid/Total | | |
| 2 | (Optional) set a **period** filter | List/figures respect the period | | |
| 3 | Click **Pay [amount]** | Confirm-payment modal opens with bank info | | |
| 4 | Set date + notes → **Confirm Payment** | Success toast shows; shares marked PAID; **posted to GL** | | |
| 5 | Verify in **Accounting** | Entry DR Professional Fees / CR Cash exists | | |
| 6 | Click **🖨 Statement** on the provider | A PDF statement (paid + pending, totals, signature) opens | | |

---

## 11. Suppliers & Payables (SUP)

**Where:** Finance → **Suppliers** and **Payables (AP)**.

### TC-SUP-01 — Suppliers & AP
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | Finance → **Suppliers** → add/edit a supplier | Saved and listed | | |
| 2 | Finance → **Payables** | Open bills with due dates + balances load | | |
| 3 | Click **Pay** on a bill | Payment recorded; posts to GL; balance reduces | | |
| 4 | Check **AP Aging** report (TC-RPT-03) | The bill appears in the right bucket | | |

---

## 12. Budget (BUD)

**Where:** Finance → **Budget**.

### TC-BUD-01 — Budget vs actual
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | Open **Budget** | Budget dashboard loads | | |
| 2 | Create a fiscal period + category allocations | Saved | | |
| 3 | View budget vs actual + variance | Actuals come from the GL | | |

---

## 13. Inventory (INV)

**Where:** Sidebar → **Inventory** (`/hospital`). Departments are listed under Inventory in the sidebar. Tabs: Items · Stock · Stock Request · Storage · Create Order · Goods Receipt · Dispense · Wastage · History · Depts · Item Units · Reports · Manufacturers.

### TC-INV-01 — Browse items
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | Open **Inventory** | KPI cards (Total/Low/Out/Departments) + Items table load | | |
| 2 | **Search** an item (e.g. `Amoxicillin`) | Matching items show | | |
| 3 | Click **👁 (eye)** on a row | Item details + batches (lot, expiry) open | | |
| 4 | Click a **department** (sidebar) | Only that department's items show | | |

### TC-INV-02 — Procurement (order → receive)
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | Tab **Create Order** → add items to cart → choose supplier → submit | Order created | | |
| 2 | Tab **Goods Receipt** → match the order → enter received qty + batch/expiry → confirm | Stock increases | | |
| 3 | Verify a supplier **AP invoice** was created (Payables) | Bill appears | | |
| 4 | Verify GL posting (Accounting) | Inventory/AP entry exists | | |

### TC-INV-03 — Dispense & wastage
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | Tab **Dispense** → item + qty + destination → confirm | Stock decreases | | |
| 2 | Tab **Wastage** → record expired/damaged | Stock decreases; logged | | |
| 3 | Tab **History** | All movements are listed | | |
| 4 | Tab **Reports** | Valuation / low-stock / movement reports show | | |

---

## 14. Human Resources (HR)

**Where:** Sidebar → **HR ▾**.

### TC-HR-01 — HR dashboard
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | Open **HR** | KPIs load from real data (Employees, Present Today, Pending Leaves, Open Vacancies) | | |
| 2 | View **Staff by Category** chart | Chart reflects real category counts | | |
| 3 | Check **HR Alerts** + **Recent Activity** | Show real items (or "no recent activity") | | |
| 4 | Check **Payroll Overview** | Shows the latest period + gross/net | | |

### TC-HR-02 — Employees
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | HR → **Employees** | Employee list loads | | |
| 2 | **Add Employee** → fill details → **Save** | Employee created | | |
| 3 | Open an employee → **Edit** → save | Profile updates | | |

### TC-HR-03 — Attendance
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | HR → **Attendance → Daily** | Today's records load | | |
| 2 | **Process** | Hours/overtime calculated | | |
| 3 | **Exceptions** | Late/absent issues listed | | |

### TC-HR-04 — Leaves
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | HR → **Leaves → Requests** → **New Request** → employee, type, dates → **Submit** | Request created | | |
| 2 | **Approvals** → open → **Approve**/**Reject** | Status updates (multi-level) | | |
| 3 | **Balances** | Remaining days correct | | |
| 4 | **Calendar** | Shows who is off when | | |

### TC-HR-05 — Payroll
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | HR → **Payroll** → open current period | Period loads | | |
| 2 | **Attendance Review** | Hours confirmed | | |
| 3 | **Process** | Gross/deductions/net calculated | | |
| 4 | **Approvals** → approve | Salaries post to GL (DR Salaries / CR Payables) | | |
| 5 | **Bank Transfer** | Payment file generated; paying posts DR Payables / CR Cash | | |

### TC-HR-06 — Recruitment
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | **Requisitions → New** → submit → approve | Requisition flows through approval | | |
| 2 | **Vacancies → Create** | Job published | | |
| 3 | **Applicants** add candidate → move through **Pipeline** | Candidate advances stages | | |
| 4 | **Interviews → Schedule** then **Evaluate** | Interview booked + scored | | |
| 5 | Create + send an **Offer** | Offer recorded | | |

### TC-HR-07 — Performance / Training / Benefits
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | HR → **Performance** → create a review/goal | Saved | | |
| 2 | HR → **Training** → add a program/session | Saved | | |
| 3 | HR → **Benefits** (health/housing/transport) | Pages load + edit | | |
| 4 | HR → **Reports** (employee/attendance/payroll) | Reports render | | |

---

## 15. Staff Portal (STF)

**Where:** Sidebar → **Staff Portal ▾**.

### TC-STF-01 — Self-service
| # | Action | Expected result | P/F | Notes / Bug for developer |
|---|---|---|---|---|
| 1 | **Staff Portal → Payslips** | Your payslips list; can view/download | | |
| 2 | **My Compensation** | Your salary breakdown shows | | |

---

## 🐞 Issue Log (fill as you test)

Copy every **Fail (F)** here so developers have one consolidated list.

| # | Test case (e.g. TC-FIN-02) | Page / URL | What you did | What you expected | What actually happened (+ error text) | Severity (High/Med/Low) | Status |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | Open |
| 2 | | | | | | | Open |
| 3 | | | | | | | Open |
| 4 | | | | | | | Open |
| 5 | | | | | | | Open |
| 6 | | | | | | | Open |
| 7 | | | | | | | Open |
| 8 | | | | | | | Open |
| 9 | | | | | | | Open |
| 10 | | | | | | | Open |

---

### Test run summary
- Total test cases attempted: ______
- Passed (P): ______  Failed (F): ______  Blocked (B): ______
- Overall result: ☐ Accepted ☐ Accepted with issues ☐ Rejected
- Tester signature: __________________  Date: __________

*Tibbna Hospital Management System — User Guide & Acceptance-Test Log. Work through one module at a time; record results as you go.*
