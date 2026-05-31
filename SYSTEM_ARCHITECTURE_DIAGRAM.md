# 🏥 TIBBNA HOSPITAL — SYSTEM ARCHITECTURE (Registration → Reports)

> Drawn from the customer workflow documents:
> `HOSPITAL_WORKFLOW_ANALYSIS.md`, `DEVELOPMENT_ROADMAP.md`,
> `.windsurf/workflows/finance-system-analysis.md`, and the Finance roadmap brief.
>
> **Purpose:** End-to-end view of how every module's workflow flows from
> registration through to financial reports, with the General Ledger as the
> single source of truth.

---

## PART 1 — Layered Architecture

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                        PRESENTATION LAYER (UI)                            ║
║  Reception │ Inventory │ Finance │ Insurance │ HR │ Billing │ Staff Portal ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                        APPLICATION LAYER (API routes)                     ║
║  /api/patients  /api/invoices  /api/hr/*  /api/hospital/*  /api/finance/*  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                        BUSINESS LOGIC LAYER                                ║
║  Validation │ Workflows │ GL-Posting │ Payroll Engine │ Tax/Leave/Overtime ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                        DATA LAYER (PostgreSQL / Neon)                      ║
║  Operational DB (staff, invoices, fin_*)  ║  Tibbna OpenEHR (patients)     ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## PART 2 — THE MASTER FLOW: Registration ➜ Reports

```
                          ┌──────────────────────────┐
                          │   1. REGISTRATION         │
                          └──────────────────────────┘
        ┌───────────────────────────┬───────────────────────────┐
        ▼                           ▼                           ▼
┌────────────────┐        ┌────────────────┐         ┌────────────────────┐
│ PATIENT REG.   │        │ EMPLOYEE REG.  │         │ STAKEHOLDER/SUPPLIER│
│ (Reception)    │        │ (HR)           │         │ /SHAREHOLDER REG.   │
│ demographics,  │        │ personal, dept,│         │ (Finance)           │
│ insurance enrol│        │ salary grade   │         │ services, % share   │
└───────┬────────┘        └───────┬────────┘         └─────────┬──────────┘
        │ patient_id              │ employee_id                │ stakeholder_id
        ▼                         ▼                            ▼
┌────────────────┐        ┌────────────────────────┐  ┌────────────────────┐
│ 2. APPOINTMENT │        │  HR OPERATIONS LOOP     │  │ SERVICE CATALOG    │
│ booking,       │        │  Attendance→Leave→      │  │ name, category,    │
│ check-in/queue │        │  Payroll                │  │ price, provider %  │
└───────┬────────┘        └───────────┬────────────┘  └─────────┬──────────┘
        │                             │                          │
        ▼                             │                          │
┌────────────────┐                    │                          │
│ 3. SERVICES    │◄───────────────────┼──────────────────────────┘
│ RENDERED       │   (which stakeholder provides the service?)
│ (encounter)    │
└───────┬────────┘
        │ service lines
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. BILLING / INVOICE GENERATION (Finance)                         │
│   • fetch service price (self-pay / insurance / govt)             │
│   • insurance coverage check  → split patient vs insurer          │
│   • auto-create invoice_shares per stakeholder (profit split)     │
└───────┬──────────────────────────────────┬───────────────────────┘
        │ patient portion                   │ insurance portion
        ▼                                   ▼
┌────────────────┐                 ┌────────────────────┐
│ 5a. PAYMENT    │                 │ 5b. INSURANCE CLAIM │
│ collect cash/  │                 │ submit→approve→pay  │
│ card           │                 │ (insurer settles)   │
└───────┬────────┘                 └─────────┬──────────┘
        │                                    │
        └─────────────┬──────────────────────┘
                      ▼
        ┌────────────────────────────────────┐
        │ 6. GENERAL LEDGER (auto-posting)    │ ◄──── ALL money events post here
        │   DR Cash / DR AR  / CR Revenue     │
        │   DR Expense / CR Payable (AP)      │
        │   Payroll, Distributions, Returns   │
        └───────────────┬────────────────────┘
                        ▼
        ┌────────────────────────────────────┐
        │ 7. REPORTS  (single source = GL)    │
        │  Income Statement · Balance Sheet · │
        │  Trial Balance · Cash Flow · Budget │
        │  AR/AP Aging · Provider Reports     │
        └────────────────────────────────────┘
```

---

## PART 3 — Per-Module Workflow Detail

### A. RECEPTION → BILLING (Revenue Cycle)
```
Register Patient ──► Enrol Insurance ──► Book Appointment ──► Check-in/Queue
                                                                    │
   Service rendered ◄───────────────────────────────────────────────┘
        │
        ▼
   Generate Invoice ──► Insurance Coverage Check ──► Patient Responsibility
        │                          │
   Collect Payment            Submit Claim ──► Insurer Pays
        │                          │
        └──────────► GL POST ◄──────┘ ──► REPORTS
```

### B. HR (People → Payroll → GL)   [Workflow doc §1-2]
```
Employee Reg ──► Attendance (biometric/manual, auto-overtime)
                      │
                 Leave Request ──► Multi-level Approval ──► Leave Balance
                      │                                          │
                      └────────────┬─────────────────────────────┘
                                   ▼
                 PAYROLL ENGINE: Earnings (basic+allowances+OT)
                                 − Deductions (tax, SS, loans,
                                   unpaid-leave, absence)
                                   = Net Salary
                                   ▼
                 Payslip ──► Bank File ──► GL POST (salaries) ──► REPORTS
```

### C. INVENTORY → ACCOUNTS PAYABLE (Procure-to-Pay)   [Roadmap Phase 7]
```
Purchase Requisition ──► Approval ──► Purchase Order ──► Supplier
                                                            │
                                          Goods Receipt (GRN) ◄┘
                                                │
                              Stock ↑   +   AP Invoice auto-created
                                                │
                                          GL POST: DR Expense / CR Payable
                                                │
                                          Pay Vendor ──► GL POST: DR Payable / CR Cash
                                                │
                                                ▼
                                            REPORTS (AP aging, stock valuation)
```

### D. STAKEHOLDER / SHAREHOLDER DISTRIBUTION   [Finance roadmap]
```
Service has configured providers (service_stakeholders, % or fixed)
        │
   Invoice billed ──► auto invoice_shares (PENDING) per stakeholder
        │
   Finance → Distributions ──► Pay stakeholder ──► GL POST ──► REPORTS
        │
   (Shareholders: equity % ──► dividend declaration ──► payout ──► GL)
```

---

## PART 4 — Convergence: Everything Feeds the General Ledger → Reports

```
   RECEPTION/BILLING ─┐
   INSURANCE CLAIMS ──┤
   HR PAYROLL ────────┼──►  ┌─────────────────────┐
   INVENTORY → AP ────┤     │  GENERAL LEDGER      │ ──► Income Statement
   DISTRIBUTIONS ─────┤     │  fin_journal_entries │ ──► Balance Sheet
   RETURNS/REFUNDS ───┘     │  fin_journal_lines   │ ──► Trial Balance
                            │  fin_accounts (CoA)  │ ──► Cash Flow
                            └─────────────────────┘ ──► Budget vs Actual
                                                     ──► AR/AP Aging
```

---

## PART 5 — Cross-Module Integration Matrix   [Roadmap §Data Flow]

| Source | Target | Data | Type |
|---|---|---|---|
| Reception | Patients | demographics | Direct DB |
| Reception | Appointments | booking | API |
| Appointments | Finance | service charges | API |
| Services | Finance | price + provider % | API |
| Finance | Insurance | coverage / claims | API |
| HR | Finance (GL) | payroll expense | Direct DB |
| Inventory | Finance (AP/GL) | purchase costs | Direct DB |
| Distributions | Finance (GL) | stakeholder shares | Direct DB |
| **All modules** | **Reports** | operational data | API/GL views |

---

## The Single Golden Thread

```
REGISTRATION → SERVICE → INVOICE → PAYMENT/CLAIM → GENERAL LEDGER → REPORTS
     (who)      (what)    (how much)  (collect)       (record)       (analyze)
```

Every module — Reception, HR, Inventory, Insurance, Distributions — is a
**tributary** that flows into the **General Ledger**, the single source of
truth for all financial reports.

---

*Source: customer workflow & roadmap documents. Intended design (target state).*
*See `SYSTEM_ARCHITECTURE_STATUS.md` for the same diagram overlaid with current build status.*
