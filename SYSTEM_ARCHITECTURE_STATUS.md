# 🏥 TIBBNA HOSPITAL — ARCHITECTURE WITH BUILD STATUS

> Same architecture as `SYSTEM_ARCHITECTURE_DIAGRAM.md`, with each box marked:
>
> | Mark | Meaning |
> |---|---|
> | ✅ | Built & connected to real DB |
> | 🔄 | Partial — works but has gaps |
> | ❌ | Not built / mock / broken |

---

## PART 2 — MASTER FLOW with Status

```
                          ┌──────────────────────────┐
                          │   1. REGISTRATION         │
                          └──────────────────────────┘
        ┌───────────────────────────┬───────────────────────────┐
        ▼                           ▼                           ▼
┌────────────────┐        ┌────────────────┐         ┌────────────────────┐
│ PATIENT REG. ✅│        │ EMPLOYEE REG.✅ │         │ STAKEHOLDER ✅      │
│ (Reception)    │        │ (HR)           │         │ SUPPLIER     ✅     │
│ insurance      │        │ dept, salary   │         │ SHAREHOLDER  ❌     │
│ enrol     ❌   │        │ grade          │         │ (API missing)      │
└───────┬────────┘        └───────┬────────┘         └─────────┬──────────┘
        │                         │                            │
        ▼                         ▼                            ▼
┌────────────────┐        ┌────────────────────────┐  ┌────────────────────┐
│ 2. APPOINTMENT │        │  HR OPERATIONS LOOP     │  │ SERVICE CATALOG    │
│ booking ✅     │        │  Attendance ✅          │  │ list      ✅       │
│ check-in/queue │        │  Leave      ✅          │  │ registration 🔄   │
│         🔄     │        │  Payroll    ✅          │  │ (reads JSON)      │
└───────┬────────┘        └───────────┬────────────┘  └─────────┬──────────┘
        │                             │                          │
        ▼                             │                          │
┌────────────────┐                    │                          │
│ 3. SERVICES    │◄───────────────────┼──────────────────────────┘
│ RENDERED  🔄   │   multi-provider config ✅ /
│ (encounter)    │   billing-time stakeholder choice ❌
└───────┬────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. BILLING / INVOICE GENERATION (Finance)                  ✅     │
│   • service price fetch            ✅                             │
│   • insurance coverage split       ✅                             │
│   • auto-create invoice_shares     ✅                             │
└───────┬──────────────────────────────────┬───────────────────────┘
        │                                   │
        ▼                                   ▼
┌────────────────┐                 ┌────────────────────┐
│ 5a. PAYMENT ✅ │                 │ 5b. INSURANCE CLAIM │
│ collect cash   │                 │ submit→pay     🔄   │
└───────┬────────┘                 └─────────┬──────────┘
        │                                    │
        └─────────────┬──────────────────────┘
                      ▼
        ┌────────────────────────────────────┐
        │ 6. GENERAL LEDGER (auto-posting) ✅ │
        │   Invoice payment    ✅             │
        │   AP invoice/payment ✅             │
        │   Accrual revenue    ✅             │
        │   Payroll → GL       ❌ (not posted)│
        │   Distributions → GL ✅             │
        └───────────────┬────────────────────┘
                        ▼
        ┌────────────────────────────────────┐
        │ 7. REPORTS  (GL-sourced)            │
        │  Income Statement   ✅ (accrual)    │
        │  Balance Sheet      ✅ (+ earnings) │
        │  Trial Balance      ✅              │
        │  Cash Flow          ❌              │
        │  Budget vs Actual   ✅ (GL actuals) │
        │  AR / AP Aging      ❌              │
        └────────────────────────────────────┘
```

---

## PART 3 — Per-Module Status

### A. RECEPTION → BILLING
```
Register Patient ✅ ─► Enrol Insurance ❌ ─► Book Appointment ✅ ─► Check-in 🔄
        │
   Generate Invoice ✅ ─► Coverage Check ✅ ─► Patient Responsibility ✅
        │                      │
   Collect Payment ✅      Submit Claim 🔄 ─► Insurer Pays 🔄
        │                      │
        └──────► GL POST ✅ ◄───┘ ─► REPORTS ✅
```

### B. HR (People → Payroll → GL)
```
Employee Reg ✅ ─► Attendance ✅ (auto-overtime ✅)
                      │
                 Leave Request ✅ ─► Approval ✅ ─► Balance ✅
                      │
                 PAYROLL ENGINE ✅ (tax ✅, unpaid-leave ✅, overtime ✅)
                      │
                 Payslip ✅ ─► Bank File 🔄 ─► GL POST ❌ ─► REPORTS
```
> ⚠️ Gap: payroll calculates correctly but is **not posted to the GL**, so
> salaries don't appear in the Income Statement yet.

### C. INVENTORY → ACCOUNTS PAYABLE
```
Purchase Requisition 🔄 ─► PO ✅ ─► Supplier ✅
                                      │
                          Goods Receipt (GRN) ✅
                                      │
                    Stock ↑ ✅  +  AP Invoice auto-created ✅
                                      │
                          GL POST DR Expense/CR Payable ✅
                                      │
                          Pay Vendor ✅ ─► GL POST DR Payable/CR Cash ✅
                                      │
                                  REPORTS (AP aging ❌, stock value ✅)
```

### D. STAKEHOLDER / SHAREHOLDER DISTRIBUTION
```
service_stakeholders config ✅
        │
   Invoice billed ─► auto invoice_shares ✅
        │
   Distributions ─► Pay stakeholder ✅ ─► GL POST ✅ ─► REPORTS ✅
        │
   Shareholder dividends ❌ (API + flow missing)
```

---

## PART 4 — GL Convergence Status

```
   RECEPTION/BILLING ✅─┐
   INSURANCE CLAIMS 🔄──┤
   HR PAYROLL ❌────────┼──►  ┌─────────────────────┐
   INVENTORY → AP ✅────┤     │  GENERAL LEDGER ✅   │ ──► Income Stmt ✅
   DISTRIBUTIONS ✅─────┤     │  (26+ entries,       │ ──► Balance Sheet ✅
   RETURNS/REFUNDS 🔄───┘     │   balanced)          │ ──► Trial Balance ✅
                              └─────────────────────┘ ──► Budget Actual ✅
                                                       ──► Cash Flow ❌
                                                       ──► AR/AP Aging ❌
```

---

## SUMMARY SCORECARD

| Module | Status | Note |
|---|---|---|
| Patient Registration | ✅ | Real DB (OpenEHR) |
| Insurance Enrollment (patient) | ✅ | Patient Policies tab → real table |
| Insurance Verify Coverage | ✅ | Computes patient/insurer split |
| Insurance Pre-Approvals | ✅ | Request/approve/deny workflow |
| Appointments | ✅ | Real |
| Employee Registration | ✅ | Real |
| Attendance + Overtime | ✅ | Auto-calc wired |
| Leave + Approval | ✅ | Multi-level + unpaid deduction |
| Payroll Engine | ✅ | Calculates correctly |
| **Payroll → GL posting** | ✅ | Salaries post to ledger (DR Salaries/CR Payables) |
| Service Catalog | ✅ | List + detail both real DB; detail shows live revenue + provider shares |
| Multi-provider config | ✅ | Built |
| Billing-time provider choice | ✅ | Per-line provider picker; honors choice or splits |
| Invoicing | ✅ | Real + accrual |
| Patient Payment | ✅ | Real + GL |
| Insurance Claims | ✅ | Full 5-card pipeline KPIs (Total/Claimed/Approved/Paid/Pending + status counts) |
| GL Auto-Posting | ✅ | Invoices, AP, distributions |
| Inventory → AP → GL | ✅ | Full chain verified |
| Stock Valuation | ✅ | Real |
| Distributions (stakeholder) | ✅ | Pay→GL (DR Professional Fees/CR Cash) + period PDF statement; fixed silent-rollback bug |
| Shareholders | ✅ | Full CRUD + capital→GL + dividend distribution + account statements |
| Suppliers | ✅ | Real |
| Budget (GL actuals) | ✅ | Real |
| Accounting / GL | ✅ | Real |
| Reports: Income/Balance/Trial | ✅ | GL-sourced, tie out |
| Reports: Cash Flow | ✅ | GL cash-movement, Operating/Investing/Financing |
| Reports: AR/AP Aging | ✅ | Bucketed (Current/30/60/90/90+), ties to AR balance |

### Highest-Impact Remaining Gaps
1. ✅ ~~Payroll → GL posting~~ — DONE (salaries now post to ledger)
2. ✅ ~~Shareholders API~~ — DONE (CRUD + capital→GL + dividends + statements)
3. ✅ ~~Insurance patient-enrollment tab~~ — DONE (Policies + Verify + Pre-Approvals)
4. ✅ ~~AR / AP Aging + Cash Flow reports~~ — DONE (3 new tabs + APIs, GL-sourced)
5. ✅ ~~Billing-time stakeholder selection~~ — DONE (per-line provider picker; also fixed a latent UUID/code join bug that left invoice_shares empty)

---

*Status as of current build. Target design: `SYSTEM_ARCHITECTURE_DIAGRAM.md`.*
