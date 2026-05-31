# TIBBNA HOSPITAL SYSTEM - WORKFLOW DIAGRAM & ARCHITECTURE

## HIGH-LEVEL SYSTEM ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         TIBBNA HOSPITAL SYSTEM                           │
│                          (Next.js 16 + React)                            │
└──────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER (Frontend)                     │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Dashboard   │  │  HR Module   │  │Finance Module│  │ Patient/Med  │  │
│  │   (Admin)    │  │              │  │              │  │   Module     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│       │                   │                   │                │           │
│       ├─ Metrics         ├─ Employees        ├─ Invoices     ├─ Appts    │
│       ├─ Activity        ├─ Attendance       ├─ PO           ├─ Records  │
│       └─ Overview        ├─ Leaves ⭐        ├─ Budget       ├─ Hist     │
│                          ├─ Payroll ⭐       ├─ Insurance    └─ Balance  │
│                          ├─ Recruitment      ├─ Accounting           │
│                          ├─ Training         └─ Suppliers           │
│                          └─ Performance                             │
│                                                                    │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER (Next.js Backend)                     │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                     BUSINESS LOGIC SERVICES                         │  │
│  ├─────────────────────────────────────────────────────────────────────┤  │
│  │                                                                     │  │
│  │  ⭐ COMPLEX ENGINES:                                              │  │
│  │  ├─ payroll-calculation-engine.ts (Multi-factor calculation)      │  │
│  │  ├─ leave-approval-workflow.ts (Multi-level approval)            │  │
│  │  ├─ leave-payroll-calculator.ts (Leave impact on payroll)        │  │
│  │  ├─ iraq-tax-calculator.ts (Tax computation)                     │  │
│  │  └─ attendance-leave-integration.ts (Cross-module integration)   │  │
│  │                                                                     │  │
│  │  INTEGRATION SERVICES:                                             │  │
│  │  ├─ patient-sync-service.ts (DB ↔ Supabase sync)                │  │
│  │  ├─ patient-bridge-service.ts (Finance ↔ Medical bridge)        │  │
│  │  ├─ notification-service.ts (Multi-channel alerts)               │  │
│  │  ├─ bank-file-generator.ts (Payroll file generation)            │  │
│  │  └─ schedule-conflict-checker.ts (Appointment conflict check)   │  │
│  │                                                                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                    DATA ACCESS LAYER (Supabase/ORM)                        │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Drizzle ORM  │  Supabase Client  │  Auth Helper  │  TypeScript Client   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE LAYER                                     │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐   │
│  │   PostgreSQL     │    │     Supabase     │    │  Non-Medical DB  │   │
│  │   Primary DB     │    │  Cloud Platform  │    │  (Legacy Bridge) │   │
│  ├──────────────────┤    ├──────────────────┤    ├──────────────────┤   │
│  │ - Employees      │    │ - Auth Tables    │    │ - Patient Data   │   │
│  │ - Attendance     │    │ - Row Security   │    │ (Sync Source)    │   │
│  │ - Leaves         │    │ - Realtime Subs  │    └──────────────────┘   │
│  │ - Payroll        │    │                  │                           │
│  │ - Patients       │    │                  │                           │
│  │ - Invoices       │    │                  │                           │
│  │ - POs            │    │                  │                           │
│  │ - Insurance      │    │                  │                           │
│  └──────────────────┘    └──────────────────┘                           │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## DETAILED MODULE WORKFLOWS

### 1️⃣ LEAVE REQUEST WORKFLOW (Multi-Level Approval)

```
                        LEAVE REQUEST LIFECYCLE
                        
Step 1: EMPLOYEE SUBMISSION
┌─────────────────────────────────────────┐
│ Employee fills leave request form:      │
│ - Leave Type (Annual, Sick, etc.)       │
│ - From/To Dates                         │
│ - Number of Days                        │
│ - Reason/Comments                       │
└──────────────┬──────────────────────────┘
               │
               ▼
Step 2: VALIDATION & INITIALIZATION
┌─────────────────────────────────────────┐
│ System checks:                          │
│ ✓ Available balance > requested days    │
│ ✓ No conflicts with existing leaves     │
│ ✓ Within policy limits                  │
│                                         │
│ Action: Trigger workflow initialization │
│ Services: leave-approval-workflow.ts    │
└──────────────┬──────────────────────────┘
               │
               ▼
Step 3: WORKFLOW INITIALIZATION
┌─────────────────────────────────────────┐
│ Initialize Approval Levels:             │
│                                         │
│ Level 1: DEPARTMENT MANAGER             │
│ ├─ Assigned: Employee's Department Mgr  │
│ ├─ Checks: Department coverage          │
│ ├─ Due: 24 hours                        │
│ └─ Action: APPROVE / REJECT / DELEGATE  │
└──────────────┬──────────────────────────┘
               │
        ┌──────┴──────┐
        │             │
      REJECT       APPROVE
        │             │
   Notify            ▼
   Employee      Level 2: HR MANAGER
        │       ├─ Checks: Policy compliance
        │       ├─ Due: 24 hours
        │       └─ Action: APPROVE / REJECT
        │             │
        │        ┌────┴─────┐
        │        │           │
        │      REJECT      APPROVE
        │        │           │
        │        │           ▼
        │        │      Level 3: FINANCE
        │        │      (if payroll impact)
        │        │      ├─ Calculates leave cost
        │        │      ├─ Due: 12 hours
        │        │      └─ Action: APPROVE
        │        │           │
        │        │           ▼
        └────────┴──────► FINAL STATUS UPDATE
                         ├─ Record approval chain
                         ├─ Update leave balance
                         ├─ Integrate w/ payroll
                         └─ Send notifications
                             (Employee, Managers)
                         
Services Involved:
├─ leave-approval-workflow.ts (Multi-level mgmt)
├─ leave-payroll-calculator.ts (Cost calculation)
├─ attendance-leave-integration.ts (Payroll sync)
└─ notification-service.ts (Email alerts)
```

---

### 2️⃣ PAYROLL PROCESSING WORKFLOW (Complex Calculation Engine)

```
                    PAYROLL PROCESSING CYCLE
                    (Monthly/Bi-weekly)

Period: 1-30 June 2025
┌──────────────────────────────────┐
│ STEP 1: PERIOD SETUP             │
│ ├─ Define payroll period         │
│ ├─ Lock attendance data          │
│ ├─ Freeze leave approvals        │
│ └─ Get employee roster           │
└──────────────────┬───────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────┐
│ STEP 2: FOR EACH EMPLOYEE - PAYROLL CALCULATION     │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Input Data Collection:                             │
│  ├─ Basic Salary, Allowances, Grade                │
│  ├─ Worked Days (from Attendance)                  │
│  ├─ Leave Days (Annual, Sick, Unpaid)             │
│  ├─ Overtime Hours & Shifts                        │
│  ├─ Loans & Advances Outstanding                   │
│  └─ Previous Month Carryovers                      │
│                                                      │
└──────────┬───────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│ STEP 3: CALCULATE GROSS EARNINGS                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Basic Salary Components:                            │
│ ├─ Basic Salary: IQD 1,500,000                     │
│ ├─ Housing Allowance: IQD 300,000                  │
│ ├─ Transport Allowance: IQD 150,000                │
│ └─ Meal Allowance: IQD 75,000                      │
│ ___________________________________________________│
│ Subtotal (Base): IQD 2,025,000                     │
│                                                      │
│ Variable Earnings:                                  │
│ ├─ Overtime Regular: 20 hrs × IQD 4,500 × 1.5     │
│ │  = IQD 135,000                                   │
│ ├─ Overtime Weekend: 8 hrs × IQD 4,500 × 2.0      │
│ │  = IQD 72,000                                    │
│ ├─ Night Shift Pay: 6 shifts × IQD 300,000        │
│ │  = IQD 1,800,000                                │
│ ├─ Weekend Pay: 4 days × base daily × 1.25        │
│ │  = IQD 225,000                                  │
│ ├─ Holiday Pay: 1 day × base daily × 1.5          │
│ │  = IQD 101,500                                  │
│ └─ Bonuses/Incentives: IQD 500,000                │
│                                                      │
│ ═══════════════════════════════════════════════════│
│ GROSS SALARY BEFORE DEDUCTIONS                     │
│ = IQD 5,159,500                                    │
│                                                      │
└──────────┬───────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│ STEP 4: CALCULATE DEDUCTIONS                        │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Mandatory Deductions:                               │
│ ├─ Social Security (10% × 5,159,500)              │
│ │  = IQD 515,950                                   │
│ ├─ Health Insurance (5% × 5,159,500)              │
│ │  = IQD 257,975                                   │
│ ├─ Income Tax (Iraq Tax Calculator)               │
│ │  Services: iraq-tax-calculator.ts               │
│ │  = IQD 258,975 (sample calc)                    │
│ └─ Zakat (if applicable): IQD 0                    │
│                                                      │
│ Loans & Advances:                                   │
│ ├─ Employee Loan #1 (Monthly Installment)         │
│ │  = IQD 100,000                                   │
│ ├─ Employee Loan #2: IQD 75,000                    │
│ └─ Advance Repayment: IQD 50,000                   │
│                                                      │
│ Attendance-Related:                                 │
│ ├─ Absence Deduction: 2 days × daily rate         │
│ │  = IQD 338,000                                   │
│ └─ Late Arrival Penalty: 5 occurrences × IQD 5,000│
│                                                      │
│ ═══════════════════════════════════════════════════│
│ TOTAL DEDUCTIONS = IQD 1,595,900                   │
│                                                      │
└──────────┬───────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│ STEP 5: CALCULATE NET SALARY                        │
├──────────────────────────────────────────────────────┤
│                                                      │
│ NET SALARY = GROSS - DEDUCTIONS                     │
│ = IQD 5,159,500 - IQD 1,595,900                   │
│ = IQD 3,563,600                                    │
│                                                      │
│ Payroll Metadata:                                   │
│ ├─ Gross Salary: IQD 5,159,500                     │
│ ├─ Total Deductions: IQD 1,595,900                 │
│ ├─ Net Salary: IQD 3,563,600                       │
│ ├─ Warnings: None                                   │
│ └─ Errors: None                                     │
│                                                      │
└──────────┬───────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│ STEP 6: PAYROLL APPROVAL WORKFLOW                   │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Department Manager Review:                          │
│ ├─ Verifies calculations accuracy                  │
│ ├─ Checks for anomalies                            │
│ └─ Approves or flags for review                    │
│        │                                            │
│        ▼                                            │
│ Finance Manager Review:                            │
│ ├─ Validates payment budget                        │
│ ├─ Ensures sufficient funds                        │
│ └─ Final approval for processing                   │
│        │                                            │
│        ▼                                            │
│ Approved Payroll                                   │
│                                                      │
└──────────┬───────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│ STEP 7: BANK FILE GENERATION                        │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Service: bank-file-generator.ts                    │
│                                                      │
│ Generate:                                           │
│ ├─ Bank Payment File (SWIFT/Local format)          │
│ ├─ Employee Payslips                               │
│ ├─ Salary Register Report                          │
│ └─ Payment Authorization Letter                    │
│                                                      │
└──────────┬───────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│ STEP 8: PAYMENT PROCESSING                          │
├──────────────────────────────────────────────────────┤
│                                                      │
│ ├─ Submit file to bank                             │
│ ├─ Batch processing (typically overnight)          │
│ ├─ Confirmation of transfers                       │
│ └─ Update payment status                           │
│                                                      │
└──────────┬───────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│ STEP 9: NOTIFICATIONS & REPORTING                   │
├──────────────────────────────────────────────────────┤
│                                                      │
│ ├─ Email payslips to employees                     │
│ ├─ Notify Finance of completion                    │
│ ├─ Generate GL entries                             │
│ ├─ Update employee records                         │
│ └─ Archive payroll period                          │
│                                                      │
│ Reports Generated:                                  │
│ ├─ Payroll Summary Report                          │
│ ├─ Salary Register (all employees)                │
│ ├─ Tax Summary                                      │
│ ├─ Statutory Deductions Summary                    │
│ └─ GL Posting Journal                              │
│                                                      │
└──────────────────────────────────────────────────────┘

Services Involved:
├─ payroll-calculation-engine.ts (Main calculation)
├─ iraq-tax-calculator.ts (Tax computation)
├─ attendance-leave-integration.ts (Attendance data)
├─ leave-payroll-calculator.ts (Leave deduction calc)
├─ bank-file-generator.ts (Payment file generation)
└─ notification-service.ts (Communication)
```

---

### 3️⃣ PATIENT-FINANCE WORKFLOW

```
                    PATIENT BILLING WORKFLOW

Patient Visits Hospital
    │
    ▼
┌─────────────────────────────────┐
│ SERVICE DELIVERY                │
│                                 │
│ Department: Radiology           │
│ Service: CT Scan                │
│ Time: 2025-06-15 10:30 AM      │
│                                 │
│ Service Charge: IQD 250,000    │
│ (from service catalog)          │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ CHECK INSURANCE                 │
│                                 │
│ Patient has: Health Insurance   │
│ Provider: National Insurance    │
│ Policy #: POL-2024-12345       │
│ Coverage Type: 80% Imaging      │
│ Coverage Limit: IQD 2,000,000  │
│ Already Used: IQD 500,000      │
│ Available: IQD 1,500,000       │
│                                 │
│ ✓ Coverage Available            │
│ Insurance Pays: IQD 200,000     │
│ Patient Pays: IQD 50,000       │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ GENERATE INVOICE                │
│                                 │
│ Invoice #: INV-2025-0024856    │
│ Date: 2025-06-15              │
│ Patient: Ahmed Al-Husseini     │
│ Patient #: P-2024-00156       │
│                                 │
│ ┌─ Service Details ─────────┐  │
│ │ CT Scan (Chest)           │  │
│ │ Qty: 1                    │  │
│ │ Unit Price: IQD 250,000   │  │
│ │ Amount: IQD 250,000       │  │
│ └───────────────────────────┘  │
│                                 │
│ Subtotal:      IQD 250,000     │
│ VAT (0%):      IQD 0           │
│ Insurance:    (IQD 200,000)    │
│ ─────────────────────────────  │
│ Amount Due:    IQD 50,000      │
│ Status: DRAFT → ISSUED → PAID  │
│                                 │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ PAYMENT PROCESSING              │
│                                 │
│ Option 1: CASH PAYMENT          │
│ ├─ Received: IQD 50,000        │
│ ├─ Date: 2025-06-15 14:22      │
│ ├─ Receipt #: RCP-2025-008932  │
│ └─ Status: PAID                 │
│                                 │
│ Option 2: INSURANCE CLAIM       │
│ ├─ Claim Submitted: IQD 200,000│
│ ├─ Claim #: CLM-2025-00124     │
│ ├─ Status: PENDING              │
│ └─ Expected Payout: 7-14 days   │
│                                 │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ BALANCE MANAGEMENT              │
│                                 │
│ Previous Balance: IQD 0         │
│ Charges Today: IQD 250,000      │
│ Payments: (IQD 50,000)          │
│ Insurance: (IQD 200,000) [wait] │
│ ─────────────────────────────   │
│ Current Balance: IQD 0          │
│                                 │
│ Patient Account Updated          │
│                                 │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ FINANCIAL REPORTING             │
│                                 │
│ ├─ Revenue Recognition          │
│ ├─ GL Entry: Debit AR           │
│ │              Credit Revenue   │
│ ├─ Update Patient Account       │
│ ├─ Aging Report Update          │
│ └─ Daily Billing Summary        │
│                                 │
└─────────────────────────────────┘

Bridge Service: patient-bridge-service.ts
Ensures Finance ↔ Medical data consistency
```

---

### 4️⃣ RECRUITMENT WORKFLOW

```
                    RECRUITMENT LIFECYCLE

┌─────────────────────────────────────┐
│ STEP 1: VACANCY CREATION            │
│                                     │
│ Department Manager creates vacancy: │
│ ├─ Position: Senior Doctor         │
│ ├─ Department: Cardiology          │
│ ├─ Positions: 2 openings           │
│ ├─ Salary: IQD 3M - 4M             │
│ ├─ Requirements:                   │
│ │  - MD/FRCS Qualification        │
│ │  - 5+ years experience          │
│ │  - Board certified              │
│ └─ Deadline: 2025-07-15           │
│                                     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ STEP 2: VACANCY APPROVAL            │
│                                     │
│ HR Manager Review:                  │
│ ├─ Check budget availability       │
│ ├─ Verify department approval      │
│ ├─ Ensure job description clarity  │
│ └─ Publish vacancy                 │
│    (Internal portal + external)    │
│                                     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ STEP 3: APPLICATION SUBMISSION      │
│                                     │
│ Candidates apply with:              │
│ ├─ CV/Resume                       │
│ ├─ Cover Letter                    │
│ ├─ Certifications                  │
│ ├─ References                      │
│ └─ Application Date                │
│                                     │
│ System auto-reviews:                │
│ ├─ Required qualifications met? ✓  │
│ ├─ Experience requirements? ✓      │
│ └─ Documents complete? ✓            │
│                                     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ STEP 4: SHORTLISTING               │
│                                     │
│ Recruiter Screen:                   │
│ ├─ Review applications              │
│ ├─ Rate candidates (1-5 stars)     │
│ ├─ Interview readiness assessment  │
│ └─ Create shortlist (top 10)       │
│                                     │
│ Statuses: APPLIED → SHORTLISTED    │
│           → INTERVIEW SCHEDULED     │
│                                     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ STEP 5: INTERVIEW PROCESS          │
│                                     │
│ Round 1: HR Screening               │
│ ├─ Interviewer: HR Manager         │
│ ├─ Date/Time: 2025-07-02, 10:00   │
│ ├─ Format: Phone/Video              │
│ ├─ Duration: 30 min                │
│ ├─ Assessment: Communication skill │
│ └─ Score: 8/10                     │
│                                     │
│ Round 2: Technical Assessment       │
│ ├─ Interviewer: Department Head    │
│ ├─ Date/Time: 2025-07-03, 14:00   │
│ ├─ Format: In-person               │
│ ├─ Duration: 60 min                │
│ ├─ Questions: 10 technical Q&A     │
│ └─ Score: 8.5/10                   │
│                                     │
│ Round 3: Management Discussion      │
│ ├─ Interviewer: Hospital Director  │
│ ├─ Date/Time: 2025-07-04, 11:00   │
│ ├─ Format: In-person               │
│ ├─ Topics: Career goals, culture   │
│ └─ Score: 9/10                     │
│                                     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ STEP 6: DECISION ENGINE             │
│                                     │
│ Automated Scoring:                  │
│                                     │
│ Candidate A (Ahmed):                │
│ ├─ Qualifications Match: 10/10      │
│ ├─ Interview Score: (8+8.5+9)/3=   │
│ │  8.5/10                           │
│ ├─ Experience Level: 7 yrs (5 req)  │
│ │  Score: 10/10                     │
│ ├─ References: Excellent 10/10      │
│ ├─ Cultural Fit: 8/10               │
│ └─ FINAL SCORE: 91% → ✓ RECOMMEND  │
│                                     │
│ Candidate B (Fatima):               │
│ ├─ Qualifications Match: 9/10       │
│ ├─ Interview Score: 7.5/10          │
│ ├─ Experience: 6 yrs (5 req) 9/10  │
│ ├─ References: Very Good 9/10       │
│ ├─ Cultural Fit: 7/10               │
│ └─ FINAL SCORE: 82% → ⏳ ALTERNATE  │
│                                     │
│ Decision: OFFER TO CANDIDATE A      │
│                                     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ STEP 7: OFFER & NEGOTIATION        │
│                                     │
│ Offer Letter Details:               │
│ ├─ Position: Senior Doctor         │
│ ├─ Department: Cardiology          │
│ ├─ Base Salary: IQD 3,800,000      │
│ ├─ Housing: IQD 500,000            │
│ ├─ Transport: IQD 300,000          │
│ ├─ Health Insurance: Covered       │
│ ├─ Annual Leave: 30 days           │
│ ├─ Joining Date: 2025-08-01        │
│ └─ Valid Until: 2025-07-20         │
│                                     │
│ Status: OFFER CREATED               │
│ Candidate Response: ACCEPTED        │
│ Status: OFFER ACCEPTED             │
│                                     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ STEP 8: BACKGROUND CHECK/ONBOARDING │
│                                     │
│ Background Verification:            │
│ ├─ Document Verification: ✓        │
│ ├─ Reference Verification: ✓       │
│ ├─ Credential Verification: ✓      │
│ └─ Health Screening: ✓             │
│                                     │
│ Onboarding Tasks:                   │
│ ├─ Create Employee Record          │
│ ├─ Assign Employee ID              │
│ ├─ Biometric Enrollment            │
│ ├─ System Access Setup             │
│ ├─ Department Orientation          │
│ └─ Equipment/Office Allocation     │
│                                     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ STEP 9: HIRING COMPLETE             │
│                                     │
│ Candidate Status: HIRED             │
│ Employee Created: EMP-2025-0487     │
│ Employee Name: Dr. Ahmed Al-Husseini│
│ Joining Date: 2025-08-01           │
│ Status: ACTIVE                      │
│ Department: Cardiology             │
│                                     │
│ Vacancy Status: FILLED              │
│ (1 more position still OPEN)        │
│                                     │
└─────────────────────────────────────┘

Decision Engine: Custom recruitment algorithm
Scoring Factors: Qualifications, Interview Performance,
                 Experience, References, Cultural Fit
```

---

## DATA FLOW INTEGRATION MAP

```
┌────────────────────────────────────────────────────────────────────────┐
│                         CROSS-MODULE INTEGRATION                       │
└────────────────────────────────────────────────────────────────────────┘

HR Module                                Finance Module
    │                                         │
    ├─ Employee Data ──────────────────►─ Payroll Setup
    │  (Salary, Grade, Department)           │
    │                                         │
    ├─ Attendance Data ─────────────────►─ Payroll Calc
    │  (Worked Days, Shifts)                 │
    │                                         │
    └─ Leave Data ──────────────────────►─ Deductions
       (Approved Leaves)                     │
           │                                 │
           ◄─────────── Payroll Output ◄─────┘
              (Leave Impact on Pay)


HR Module                              Medical Module
    │                                     │
    ├─ Practitioner Sync ────────────►─ OpenEHR
    │  (Doctor Registration)              Integration
    │                                     │
    └─ Staff Availability ──────────►─ Appointment
       (Shifts, Leave)                    Scheduling


Finance Module                         Medical Module
    │                                     │
    ├─ Patient Data ──────────────────►─ Patient Bridge
    │  (Demographics, Insurance)           Service
    │                                     │
    ├─ Service Charges ─────────────────►─ Patient
    │  (Medical Service Pricing)          Records
    │                                     │
    └─ Billing Status ◄─────────────────┘
       (Payment Updates)


External Systems
    │
    ├─ Non-Medical DB ──────────────►─ Patient Sync Service
    │  (Legacy Data)                      │
    │                                     ▼
    ├─ Biometric Device ────────────►─ Attendance System
    │  (Face/Fingerprint)                 │
    │                                     ▼
    ├─ OpenEHR ────────────────────►─ Clinical Data
    │  (Clinical Standards)               │
    │                                     ▼
    ├─ Banking System ◄─────────────── Bank File Generator
    │  (Payroll Transfer)                 │
    │                                     ▼
    └─ Email Server ◄────────────────── Notification Service
       (Alerts & Reports)
```

---

## SYSTEM DEPENDENCIES & INTERACTIONS

```
Services Call Graph:

┌─────────────────────────────────────────────────────────────────┐
│ payroll-calculation-engine.ts (Main Payroll Engine)            │
│                                                                 │
│ Depends on:                                                     │
│ ├─ iraq-tax-calculator.ts (Tax computation)                   │
│ ├─ leave-payroll-calculator.ts (Leave impact)                 │
│ ├─ attendance-leave-integration.ts (Attendance data)          │
│ └─ Database (Employee, Attendance, Leave records)            │
│                                                                 │
│ Called by:                                                      │
│ ├─ Payroll Process API                                        │
│ ├─ Payroll Approval Workflow                                  │
│ └─ Bank File Generation                                       │
│                                                                 │
│ Produces:                                                       │
│ ├─ Payroll Calculations (per employee)                       │
│ ├─ GL Entries (Financial records)                            │
│ └─ Payslips (Employee documents)                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ leave-approval-workflow.ts (Multi-Level Approval)              │
│                                                                 │
│ Depends on:                                                     │
│ ├─ Database (Leave policies, approval levels)                │
│ ├─ leave-payroll-calculator.ts (Cost calculation)            │
│ └─ notification-service.ts (Alert generation)                │
│                                                                 │
│ Called by:                                                      │
│ ├─ Leave Request Submission API                              │
│ └─ Approval API (for each level)                             │
│                                                                 │
│ Produces:                                                       │
│ ├─ Approval Request records                                   │
│ ├─ Workflow state transitions                                │
│ └─ Notifications to approvers                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ patient-bridge-service.ts (Finance ↔ Medical Bridge)           │
│                                                                 │
│ Depends on:                                                     │
│ ├─ patient-sync-service.ts (Data sync)                       │
│ ├─ Database (Patient, Finance records)                       │
│ └─ Supabase Client (Multi-DB access)                        │
│                                                                 │
│ Called by:                                                      │
│ ├─ Patient Registration (Medical)                            │
│ ├─ Billing API (Finance)                                     │
│ └─ Patient Update APIs                                       │
│                                                                 │
│ Produces:                                                       │
│ ├─ Unified patient records                                    │
│ ├─ Sync confirmations                                         │
│ └─ Data consistency reports                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## APPROVAL WORKFLOW CHAINS

```
Complex Multi-Level Approvals:

Leave Request Flow:
Employee → Dept Manager → HR Manager → (Finance Manager) → Complete
              (24h)          (24h)           (12h)

Payroll Approval:
Calculated → Dept Manager → Finance Manager → Bank Processing
              (Review)         (Final OK)

PO Approval:
Creator → Manager → Finance → Budget Owner → Supplier Order
          (Review)  (Check)   (Authority)
```

---

## SUMMARY: Key System Characteristics

| Aspect | Details |
|--------|---------|
| **Type** | Integrated Hospital Management System |
| **Architecture** | Multi-module, event-driven, workflow-based |
| **Primary Users** | HR, Finance, Clinical, Admin staff |
| **Key Workflows** | Leave approvals, Payroll processing, Patient billing, Recruitment |
| **Data Integration** | Multi-database (PostgreSQL, Supabase, Legacy Non-Medical) |
| **Compliance** | Iraq-specific tax, labor laws, healthcare standards |
| **Scalability** | Enterprise-grade, designed for large hospital systems |
| **Real-time Features** | Biometric attendance, appointment scheduling, notifications |
| **Reporting** | Financial, HR analytics, Clinical data |

---

*System Workflow Diagram - Comprehensive Analysis*
*Created for logical and structural understanding of the Tibbna Hospital System*
