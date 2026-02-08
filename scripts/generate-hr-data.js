const fs = require('fs');
const path = require('path');

// Load existing data
const employees = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/hr/employees.json'), 'utf8')).employees;
const activeEmps = employees.filter(e => e.employment_status === 'ACTIVE');

// ============= HELPERS =============
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[rand(0, arr.length - 1)]; }
function pad(n) { return String(n).padStart(2, '0'); }
function timeStr(h, m) { return `${pad(h)}:${pad(m)}`; }
function dateStr(y, m, d) { return `${y}-${pad(m)}-${pad(d)}`; }
function isFriday(y, m, d) { return new Date(y, m - 1, d).getDay() === 5; }

const shifts = ['SHIFT-DAY', 'SHIFT-NIGHT', 'SHIFT-AFTERNOON', 'SHIFT-ROTATING'];
const devices = ['BIO-MAIN-001', 'BIO-MAIN-002', 'BIO-ER-001', 'BIO-WARD-001', 'BIO-WARD-002', 'BIO-LAB-001'];
const locations = ['Main Entrance', 'Emergency Entrance', 'Ward A', 'Ward B', 'Laboratory', 'Admin Building'];

// ============= 1. ATTENDANCE TRANSACTIONS (1000+) =============
console.log('Generating attendance transactions...');
const attTransactions = [];
let attTxnId = 1;

for (let day = 1; day <= 28; day++) {
  if (isFriday(2026, 2, day)) continue; // Skip Fridays
  
  for (const emp of activeEmps) {
    const isAbsent = Math.random() < 0.05;
    const isLeave = Math.random() < 0.04;
    if (isAbsent || isLeave) continue;

    const shift = emp.shift_id || 'SHIFT-DAY';
    let inH, inM, outH, outM;

    if (shift === 'SHIFT-NIGHT') {
      inH = rand(19, 20); inM = rand(0, 59);
      outH = rand(7, 8); outM = rand(0, 30);
    } else if (shift === 'SHIFT-AFTERNOON') {
      inH = rand(13, 14); inM = rand(0, 59);
      outH = rand(21, 22); outM = rand(0, 30);
    } else {
      inH = rand(7, 8); inM = rand(0, 55);
      outH = rand(15, 17); outM = rand(0, 59);
    }

    const device = pick(devices);
    const loc = pick(locations);
    const dateS = dateStr(2026, 2, day);

    // CHECK_IN
    attTransactions.push({
      transaction_id: `ATT-TXN-${String(attTxnId++).padStart(4, '0')}`,
      employee_id: emp.id,
      transaction_date: dateS,
      transaction_time: timeStr(inH, inM),
      transaction_type: 'CHECK_IN',
      device_id: device,
      entry_method: Math.random() < 0.85 ? 'BIOMETRIC' : 'MANUAL',
      is_manual_entry: Math.random() > 0.85,
      location: loc
    });

    // Missing checkout 5% of time
    if (Math.random() > 0.05) {
      attTransactions.push({
        transaction_id: `ATT-TXN-${String(attTxnId++).padStart(4, '0')}`,
        employee_id: emp.id,
        transaction_date: dateS,
        transaction_time: timeStr(outH, outM),
        transaction_type: 'CHECK_OUT',
        device_id: device,
        entry_method: Math.random() < 0.85 ? 'BIOMETRIC' : 'MANUAL',
        is_manual_entry: Math.random() > 0.85,
        location: loc
      });
    }
  }
}

fs.writeFileSync(
  path.join(__dirname, '../src/data/hr/attendance-transactions.json'),
  JSON.stringify({ attendance_transactions: attTransactions }, null, 2)
);
console.log(`  → ${attTransactions.length} attendance transactions`);

// ============= 2. ATTENDANCE EXCEPTIONS (50+) =============
console.log('Generating attendance exceptions...');
const exceptions = [];
const exTypes = ['LATE_ARRIVAL', 'EARLY_DEPARTURE', 'MISSING_CHECKOUT', 'ABNORMAL_HOURS'];
const exSeverity = ['LOW', 'MEDIUM', 'HIGH'];
const exStatuses = ['PENDING', 'JUSTIFIED', 'WARNING_ISSUED', 'DISMISSED'];

for (let i = 1; i <= 60; i++) {
  const emp = pick(activeEmps);
  const day = rand(1, 28);
  const type = pick(exTypes);
  let desc = '';
  let lateMins = 0;

  if (type === 'LATE_ARRIVAL') {
    lateMins = rand(16, 90);
    desc = `Arrived ${lateMins} minutes late`;
  } else if (type === 'EARLY_DEPARTURE') {
    desc = `Left ${rand(30, 120)} minutes early without approval`;
  } else if (type === 'MISSING_CHECKOUT') {
    desc = 'No checkout record found for this day';
  } else {
    desc = `Logged ${rand(14, 20)} hours in a single day`;
  }

  const status = pick(exStatuses);
  exceptions.push({
    exception_id: `EXC-${String(i).padStart(3, '0')}`,
    employee_id: emp.id,
    employee_name: `${emp.first_name} ${emp.last_name}`,
    department: emp.department_name,
    exception_date: dateStr(2026, 2, day),
    exception_type: type,
    severity: type === 'ABNORMAL_HOURS' ? 'HIGH' : pick(exSeverity),
    late_by_minutes: lateMins,
    description: desc,
    review_status: status,
    justification: status === 'JUSTIFIED' ? pick(['Traffic jam', 'Medical appointment', 'Family emergency', 'Car breakdown', 'Weather conditions']) : null,
    reviewed_by: status !== 'PENDING' ? pick(activeEmps.filter(e => e.grade_id >= 'G7')).id : null,
    reviewed_at: status !== 'PENDING' ? dateStr(2026, 2, Math.min(day + 1, 28)) : null
  });
}

fs.writeFileSync(
  path.join(__dirname, '../src/data/hr/attendance-exceptions.json'),
  JSON.stringify({ attendance_exceptions: exceptions }, null, 2)
);
console.log(`  → ${exceptions.length} attendance exceptions`);

// ============= 3. EXPANDED DAILY SUMMARIES (500+) =============
console.log('Generating expanded daily summaries...');
const dailySummaries = [];
let sumId = 1;

for (let day = 1; day <= 28; day++) {
  if (isFriday(2026, 2, day)) continue;
  
  for (const emp of activeEmps) {
    const r = Math.random();
    let status, firstIn, lastOut, totalH, regH, otH, lateMins;

    if (r < 0.04) {
      status = 'ABSENT'; firstIn = null; lastOut = null; totalH = 0; regH = 0; otH = 0; lateMins = 0;
    } else if (r < 0.08) {
      status = 'LEAVE'; firstIn = null; lastOut = null; totalH = 0; regH = 0; otH = 0; lateMins = 0;
    } else {
      status = 'PRESENT';
      const shift = emp.shift_id || 'SHIFT-DAY';
      let inH, inM, outH, outM;
      if (shift === 'SHIFT-NIGHT') {
        inH = rand(19, 20); inM = rand(0, 30); outH = rand(7, 8); outM = rand(0, 30);
        totalH = 11 + (outM / 60) + (inH === 20 ? 0 : 1); regH = 11; otH = Math.max(0, totalH - 11);
      } else if (shift === 'SHIFT-AFTERNOON') {
        inH = rand(13, 14); inM = rand(0, 30); outH = rand(21, 22); outM = rand(0, 30);
        totalH = (outH - inH) + (outM - inM) / 60; regH = 7; otH = Math.max(0, totalH - 7);
      } else {
        inH = rand(7, 8); inM = rand(0, 55); outH = rand(15, 17); outM = rand(0, 59);
        totalH = (outH - inH) + (outM - inM) / 60; regH = 7; otH = Math.max(0, totalH - 7);
      }
      lateMins = (shift !== 'SHIFT-NIGHT' && inH === 8 && inM > 15) ? inM - 15 : 0;
      firstIn = timeStr(inH, inM);
      lastOut = timeStr(outH, outM);
      totalH = Math.round(totalH * 100) / 100;
      otH = Math.round(otH * 100) / 100;
    }

    dailySummaries.push({
      id: `ATT-${String(sumId++).padStart(4, '0')}`,
      employee_id: emp.id,
      date: dateStr(2026, 2, day),
      shift_id: emp.shift_id || 'SHIFT-DAY',
      first_in: firstIn,
      last_out: lastOut,
      total_hours: totalH,
      regular_hours: regH,
      overtime_hours: otH,
      late_minutes: lateMins,
      status: status
    });
  }
}

// ============= 4. EXPANDED LEAVE REQUESTS (100+) =============
console.log('Generating expanded leave requests...');
const leaveTypes = [
  { id: 'LT-001', name: 'Annual Leave' },
  { id: 'LT-002', name: 'Sick Leave' },
  { id: 'LT-003', name: 'Emergency Leave' },
  { id: 'LT-004', name: 'Maternity Leave' },
  { id: 'LT-005', name: 'Paternity Leave' },
  { id: 'LT-006', name: 'Unpaid Leave' },
  { id: 'LT-007', name: 'Hajj Leave' },
  { id: 'LT-008', name: 'Study Leave' }
];

const approvers = activeEmps.filter(e => ['G7', 'G8', 'G9', 'G10'].includes(e.grade_id));
const leaveStatuses = ['APPROVED', 'APPROVED', 'APPROVED', 'APPROVED', 'PENDING_APPROVAL', 'PENDING_APPROVAL', 'REJECTED', 'CANCELLED'];
const reasons = {
  'Annual Leave': ['Family vacation', 'Personal travel', 'Wedding attendance', 'Eid celebration', 'Home renovation', 'Family visit to Erbil', 'Rest and recovery', 'Personal matters'],
  'Sick Leave': ['Flu symptoms', 'Back pain', 'Dental surgery', 'Eye infection', 'Stomach illness', 'Migraine', 'Post-surgery recovery', 'Medical checkup'],
  'Emergency Leave': ['Family emergency', 'Car accident', 'House flooding', 'Death in family', 'Child hospitalization'],
  'Maternity Leave': ['Maternity'],
  'Paternity Leave': ['Paternity - new baby'],
  'Unpaid Leave': ['Extended travel', 'Personal project', 'Family care'],
  'Hajj Leave': ['Hajj pilgrimage'],
  'Study Leave': ['Medical conference', 'CME course', 'Certification exam', 'Research presentation']
};

const leaveRequests = [];
for (let i = 1; i <= 110; i++) {
  const emp = pick(activeEmps);
  const lt = i <= 50 ? leaveTypes[0] : i <= 65 ? leaveTypes[1] : i <= 75 ? leaveTypes[2] : pick(leaveTypes);
  const status = pick(leaveStatuses);
  const approver = pick(approvers);
  const startMonth = rand(1, 6);
  const startDay = rand(1, 25);
  const totalDays = lt.name === 'Maternity Leave' ? 90 : lt.name === 'Emergency Leave' ? rand(1, 3) : lt.name === 'Sick Leave' ? rand(1, 5) : rand(1, 10);
  const endDay = Math.min(startDay + totalDays - 1, 28);

  leaveRequests.push({
    id: `LR-${String(i).padStart(3, '0')}`,
    request_number: `LR-2026-${String(i).padStart(3, '0')}`,
    employee_id: emp.id,
    employee_name: `${emp.first_name} ${emp.last_name}`,
    leave_type_id: lt.id,
    leave_type: lt.name,
    start_date: dateStr(2026, startMonth, startDay),
    end_date: dateStr(2026, startMonth, endDay),
    total_days: totalDays,
    reason: pick(reasons[lt.name] || ['Personal']),
    status: status,
    submitted_at: dateStr(2026, Math.max(1, startMonth - 1), rand(1, 28)),
    approver_name: `${approver.first_name} ${approver.last_name}`,
    approved_at: status === 'APPROVED' ? dateStr(2026, Math.max(1, startMonth - 1), rand(1, 28)) : undefined,
    rejection_reason: status === 'REJECTED' ? pick(['Insufficient coverage', 'Too many staff on leave', 'Short notice', 'Policy violation']) : undefined
  });
}

// ============= 5. EXPANDED LEAVE BALANCES (all 56 employees × 3 types) =============
console.log('Generating expanded leave balances...');
const leaveBalances = [];
for (const emp of employees) {
  const annUsed = rand(0, 12);
  const annPend = rand(0, 4);
  const sickUsed = rand(0, 8);
  const emUsed = rand(0, 3);
  leaveBalances.push({
    employee_id: emp.id,
    employee_name: `${emp.first_name} ${emp.last_name}`,
    annual: { total: 30, used: annUsed, pending: annPend, available: 30 - annUsed - annPend },
    sick: { total: 30, used: sickUsed, available: 30 - sickUsed },
    emergency: { total: 5, used: emUsed, available: 5 - emUsed }
  });
}

// ============= 6. PAYROLL TRANSACTIONS (336 = 56 × 6 months) =============
console.log('Generating payroll transactions...');
const payrollTransactions = [];
let payTxnId = 1;
const months = [
  { id: 'PP-2025-09', name: 'September 2025', payDate: '2025-10-01' },
  { id: 'PP-2025-10', name: 'October 2025', payDate: '2025-11-01' },
  { id: 'PP-2025-11', name: 'November 2025', payDate: '2025-12-01' },
  { id: 'PP-2025-12', name: 'December 2025', payDate: '2026-01-01' },
  { id: 'PP-2026-01', name: 'January 2026', payDate: '2026-02-01' },
  { id: 'PP-2026-02', name: 'February 2026', payDate: '2026-03-01' }
];

for (const period of months) {
  for (const emp of activeEmps) {
    const basic = emp.basic_salary || 1000000;
    const housing = Math.round(basic * 0.20);
    const transport = 100000;
    const meal = 50000;
    const mobile = 30000;
    const otHours = rand(0, 20);
    const overtime = Math.round((basic / 176) * otHours * 1.5);
    const nightShift = emp.shift_id === 'SHIFT-NIGHT' ? rand(5, 15) * 8000 : 0;
    const hazard = ['DEP-009', 'DEP-010', 'DEP-011'].includes(emp.department_id) ? 150000 : 0;
    const gross = basic + housing + transport + meal + mobile + overtime + nightShift + hazard;
    const ss = Math.round(basic * 0.05);
    const tax = Math.round(gross * 0.03);
    const loan = Math.random() < 0.1 ? rand(50, 200) * 1000 : 0;
    const advance = Math.random() < 0.05 ? rand(100, 500) * 1000 : 0;
    const absentDays = rand(0, 2);
    const absence = Math.round((basic / 30) * absentDays);
    const totalDed = ss + tax + loan + advance + absence;
    const net = gross - totalDed;

    payrollTransactions.push({
      transaction_id: `PAY-TXN-${String(payTxnId++).padStart(4, '0')}`,
      period_id: period.id,
      period_name: period.name,
      employee_id: emp.id,
      employee_name: `${emp.first_name} ${emp.last_name}`,
      employee_number: emp.employee_number,
      department: emp.department_name,
      grade: emp.grade_id,
      basic_salary: basic,
      allowances: { housing, transport, meal, mobile, overtime, night_shift: nightShift, hazard },
      gross_salary: gross,
      deductions: { social_security: ss, income_tax: tax, loan_repayment: loan, advance_recovery: advance, absence_deduction: absence },
      total_deductions: totalDed,
      net_salary: net,
      payment_status: period.id === 'PP-2026-02' ? 'PENDING' : 'COMPLETED',
      payment_date: period.payDate,
      payment_method: 'BANK_TRANSFER'
    });
  }
}

fs.writeFileSync(
  path.join(__dirname, '../src/data/hr/payroll-transactions.json'),
  JSON.stringify({ payroll_transactions: payrollTransactions }, null, 2)
);
console.log(`  → ${payrollTransactions.length} payroll transactions`);

// ============= 7. TRAINING ENROLLMENTS (200+) =============
console.log('Generating training enrollments...');
const programs = [
  { id: 'PROG-001', name: 'Basic Life Support (BLS)' },
  { id: 'PROG-002', name: 'Advanced Cardiac Life Support (ACLS)' },
  { id: 'PROG-003', name: 'Infection Control' },
  { id: 'PROG-004', name: 'Fire Safety' },
  { id: 'PROG-005', name: 'Patient Safety' },
  { id: 'PROG-006', name: 'HIPAA Compliance' },
  { id: 'PROG-007', name: 'Radiation Safety' },
  { id: 'PROG-008', name: 'Medication Administration' },
  { id: 'PROG-009', name: 'Surgical Techniques Update' },
  { id: 'PROG-010', name: 'Emergency Triage' },
  { id: 'PROG-011', name: 'Leadership in Healthcare' },
  { id: 'PROG-012', name: 'EHR System Training' }
];
const sessions = [];
for (let s = 1; s <= 20; s++) {
  sessions.push({ id: `SESS-${String(s).padStart(3, '0')}`, program_id: pick(programs).id });
}

const enrollments = [];
const enrollStatuses = ['ATTENDED', 'ATTENDED', 'ATTENDED', 'ATTENDED', 'REGISTERED', 'DID_NOT_ATTEND', 'CANCELLED'];
for (let i = 1; i <= 220; i++) {
  const emp = pick(activeEmps);
  const sess = pick(sessions);
  const status = pick(enrollStatuses);
  const score = status === 'ATTENDED' ? rand(60, 100) : null;
  enrollments.push({
    enrollment_id: `ENR-${String(i).padStart(3, '0')}`,
    session_id: sess.id,
    program_id: sess.program_id,
    employee_id: emp.id,
    employee_name: `${emp.first_name} ${emp.last_name}`,
    enrollment_date: dateStr(2025, rand(6, 12), rand(1, 28)),
    enrollment_status: status,
    assessment_score: score,
    passed: score !== null ? score >= 70 : null,
    certificate_issued_date: score && score >= 70 ? dateStr(2026, 1, rand(1, 28)) : null,
    certificate_number: score && score >= 70 ? `CERT-${sess.program_id.replace('PROG-', '')}-2026-${String(i).padStart(3, '0')}` : null
  });
}

fs.writeFileSync(
  path.join(__dirname, '../src/data/hr/training-enrollments.json'),
  JSON.stringify({ training_enrollments: enrollments }, null, 2)
);
console.log(`  → ${enrollments.length} training enrollments`);

// ============= 8. CERTIFICATES (100+) =============
console.log('Generating certificates...');
const certificates = [];
let certId = 1;
for (const enr of enrollments.filter(e => e.certificate_number)) {
  const prog = programs.find(p => p.id === enr.program_id);
  const expiryYear = rand(2026, 2028);
  certificates.push({
    certificate_id: `CERT-${String(certId++).padStart(3, '0')}`,
    employee_id: enr.employee_id,
    employee_name: enr.employee_name,
    program_id: enr.program_id,
    program_name: prog ? prog.name : 'Unknown',
    certificate_number: enr.certificate_number,
    completion_date: enr.certificate_issued_date,
    expiry_date: dateStr(expiryYear, rand(1, 12), rand(1, 28)),
    cme_credits_earned: rand(2, 12),
    is_active: true
  });
}

fs.writeFileSync(
  path.join(__dirname, '../src/data/hr/certificates.json'),
  JSON.stringify({ certificates }, null, 2)
);
console.log(`  → ${certificates.length} certificates`);

// ============= 9. GOALS (150+) =============
console.log('Generating performance goals...');
const goalCategories = ['Clinical Quality', 'Patient Satisfaction', 'Operational Efficiency', 'Professional Development', 'Research', 'Leadership', 'Innovation', 'Compliance'];
const goalTitles = {
  'Clinical Quality': ['Reduce readmission rate', 'Improve diagnostic accuracy', 'Reduce medication errors', 'Achieve 95% surgical success rate', 'Reduce infection rate'],
  'Patient Satisfaction': ['Improve patient satisfaction score', 'Reduce wait times', 'Improve discharge process', 'Enhance communication with patients'],
  'Operational Efficiency': ['Reduce billing cycle time', 'Optimize bed utilization', 'Reduce supply waste', 'Streamline admission process'],
  'Professional Development': ['Complete CME credits', 'Obtain new certification', 'Attend international conference', 'Complete leadership course'],
  'Research': ['Publish research paper', 'Submit grant proposal', 'Complete clinical trial enrollment', 'Present at conference'],
  'Leadership': ['Mentor junior staff', 'Lead quality improvement project', 'Develop training curriculum', 'Chair department committee'],
  'Innovation': ['Implement new technique', 'Develop clinical protocol', 'Launch telemedicine program', 'Automate reporting process'],
  'Compliance': ['Achieve 100% documentation compliance', 'Complete all mandatory training', 'Pass accreditation audit', 'Update all SOPs']
};
const goalStatuses = ['IN_PROGRESS', 'IN_PROGRESS', 'IN_PROGRESS', 'COMPLETED', 'NOT_STARTED'];

const goals = [];
for (let i = 1; i <= 160; i++) {
  const emp = pick(activeEmps);
  const cat = pick(goalCategories);
  const title = pick(goalTitles[cat]);
  const status = pick(goalStatuses);
  const target = rand(50, 100);
  const current = status === 'COMPLETED' ? target : status === 'NOT_STARTED' ? 0 : rand(10, target - 1);

  goals.push({
    goal_id: `GOAL-${String(i).padStart(3, '0')}`,
    employee_id: emp.id,
    employee_name: `${emp.first_name} ${emp.last_name}`,
    department: emp.department_name,
    cycle_id: 'CYCLE-2026-ANNUAL',
    goal_title: title,
    goal_category: cat,
    target_value: target,
    current_value: current,
    completion_percentage: Math.round((current / target) * 100),
    weight: pick([15, 20, 25, 30, 35]),
    status: status,
    due_date: dateStr(2026, rand(6, 12), rand(1, 28))
  });
}

fs.writeFileSync(
  path.join(__dirname, '../src/data/hr/goals.json'),
  JSON.stringify({ goals }, null, 2)
);
console.log(`  → ${goals.length} performance goals`);

// ============= 10. EXPANDED PERFORMANCE REVIEWS (50+) =============
console.log('Generating performance reviews...');
const reviewStatuses = ['FINALIZED', 'FINALIZED', 'FINALIZED', 'SUBMITTED', 'IN_PROGRESS', 'NOT_STARTED'];
const competencies = ['Clinical Skills', 'Communication', 'Teamwork', 'Leadership', 'Problem Solving', 'Time Management', 'Patient Care', 'Professional Development'];
const reviews = [];

for (let i = 1; i <= 55; i++) {
  const emp = pick(activeEmps);
  const reviewer = pick(approvers);
  const status = pick(reviewStatuses);
  const overallRating = status === 'NOT_STARTED' ? 0 : (rand(25, 50) / 10);
  const compRatings = {};
  competencies.forEach(c => { compRatings[c] = status === 'NOT_STARTED' ? 0 : (rand(20, 50) / 10); });

  reviews.push({
    review_id: `REV-${String(i).padStart(3, '0')}`,
    employee_id: emp.id,
    employee_name: `${emp.first_name} ${emp.last_name}`,
    department: emp.department_name,
    cycle_id: i <= 35 ? 'CYCLE-2025-ANNUAL' : 'CYCLE-2026-MID',
    cycle_name: i <= 35 ? 'Annual Review 2025' : 'Mid-Year Review 2026',
    review_type: 'MANAGER',
    reviewer_id: reviewer.id,
    reviewer_name: `${reviewer.first_name} ${reviewer.last_name}`,
    overall_rating: Math.round(overallRating * 10) / 10,
    competency_ratings: compRatings,
    strengths: status !== 'NOT_STARTED' ? pick(['Excellent clinical skills', 'Strong team player', 'Great communication', 'Reliable and punctual', 'Innovative thinker']) : null,
    areas_for_improvement: status !== 'NOT_STARTED' ? pick(['Time management', 'Documentation timeliness', 'Delegation skills', 'Research output', 'Leadership development']) : null,
    review_status: status,
    submitted_date: ['SUBMITTED', 'FINALIZED'].includes(status) ? dateStr(2026, 1, rand(5, 28)) : null,
    finalized_date: status === 'FINALIZED' ? dateStr(2026, 1, rand(15, 28)) : null
  });
}

fs.writeFileSync(
  path.join(__dirname, '../src/data/hr/performance-reviews.json'),
  JSON.stringify({ reviews }, null, 2)
);
console.log(`  → ${reviews.length} performance reviews`);

// ============= 11. EXPANDED CANDIDATES + APPLICATIONS =============
console.log('Generating expanded candidates and applications...');
const firstNames = ['Mohammed', 'Ali', 'Hassan', 'Hussein', 'Kareem', 'Noor', 'Huda', 'Mariam', 'Rana', 'Dina', 'Youssef', 'Tariq', 'Amira', 'Salma', 'Rami', 'Lina', 'Bashar', 'Reem', 'Saif', 'Dalal', 'Faris', 'Ghada', 'Hamza', 'Iman', 'Jamal', 'Khadija', 'Luay', 'Maha', 'Nabil', 'Omaima'];
const lastNames = ['Al-Hashimi', 'Al-Dulaimi', 'Al-Obeidi', 'Al-Shamari', 'Al-Jubouri', 'Al-Tamimi', 'Al-Saadi', 'Al-Bayati', 'Al-Rawi', 'Al-Kubaisi', 'Al-Ani', 'Al-Tikrity', 'Al-Mosuli', 'Al-Basri', 'Al-Najafi'];
const universities = ['University of Baghdad', 'University of Basra', 'University of Mosul', 'University of Kufa', 'Al-Nahrain University', 'University of Sulaymaniyah', 'University of Erbil'];
const sources = ['LinkedIn', 'Hospital Website', 'Employee Referral', 'Job Fair', 'Medical Association', 'University Career Center'];
const candStatuses = ['NEW', 'SCREENING', 'INTERVIEWING', 'OFFERED', 'HIRED', 'REJECTED'];
const vacancies = ['VAC-001', 'VAC-002', 'VAC-003', 'VAC-004', 'VAC-005'];
const positions = ['Cardiologist', 'General Surgeon', 'Staff Nurse', 'Lab Technician', 'Pharmacist'];

const newCandidates = [];
for (let i = 12; i <= 40; i++) {
  const fn = pick(firstNames);
  const ln = pick(lastNames);
  const vacIdx = rand(0, 4);
  newCandidates.push({
    id: `CAND-${String(i).padStart(3, '0')}`,
    number: `CAND-2026-${String(i).padStart(3, '0')}`,
    first_name: fn,
    last_name: ln,
    email: `${fn.toLowerCase()}.${ln.toLowerCase().replace('al-', '')}@email.com`,
    phone: `+964-770-${rand(100, 999)}-${rand(1000, 9999)}`,
    gender: Math.random() < 0.5 ? 'MALE' : 'FEMALE',
    nationality: 'Iraqi',
    education: pick(['MBBS', 'MD', 'BSc Nursing', 'BSc Pharmacy', 'BSc Lab Science', 'MSc', 'PhD']),
    university: pick(universities),
    specialization: positions[vacIdx],
    experience_years: rand(1, 15),
    current_employer: pick(['Baghdad Teaching Hospital', 'Basra General Hospital', 'Private Clinic', 'Ministry of Health', 'None']),
    expected_salary: rand(10, 40) * 100000,
    vacancy_id: vacancies[vacIdx],
    source: pick(sources),
    status: pick(candStatuses),
    applied_date: dateStr(2026, rand(1, 2), rand(1, 28)),
    screening_score: rand(50, 95),
    interview_score: rand(0, 95)
  });
}

fs.writeFileSync(
  path.join(__dirname, '../src/data/hr/candidates-expanded.json'),
  JSON.stringify({ candidates: newCandidates }, null, 2)
);
console.log(`  → ${newCandidates.length} additional candidates`);

// Applications
const applications = [];
for (let i = 1; i <= 55; i++) {
  const cand = pick(newCandidates);
  const appStatuses = ['SCREENING', 'SCREENING', 'INTERVIEWING', 'INTERVIEWING', 'OFFERED', 'HIRED', 'REJECTED'];
  const status = pick(appStatuses);
  applications.push({
    application_id: `APP-${String(i).padStart(3, '0')}`,
    application_number: `APP-2026-${String(i).padStart(3, '0')}`,
    vacancy_id: cand.vacancy_id,
    candidate_id: cand.id,
    candidate_name: `${cand.first_name} ${cand.last_name}`,
    application_date: cand.applied_date,
    application_status: status,
    screening_score: cand.screening_score,
    interview_score: ['INTERVIEWING', 'OFFERED', 'HIRED'].includes(status) ? rand(60, 95) : null,
    offer_amount: status === 'OFFERED' || status === 'HIRED' ? rand(15, 35) * 100000 : null,
    rejection_reason: status === 'REJECTED' ? pick(['Insufficient experience', 'Failed interview', 'Better candidate selected', 'Withdrew application']) : null
  });
}

fs.writeFileSync(
  path.join(__dirname, '../src/data/hr/applications.json'),
  JSON.stringify({ applications }, null, 2)
);
console.log(`  → ${applications.length} job applications`);

// ============= UPDATE LEAVES.JSON with expanded data =============
console.log('Updating leaves.json with expanded data...');
const leavesFile = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/hr/leaves.json'), 'utf8'));
leavesFile.leave_requests = leaveRequests;
leavesFile.leave_balances = leaveBalances;
fs.writeFileSync(
  path.join(__dirname, '../src/data/hr/leaves.json'),
  JSON.stringify(leavesFile, null, 2)
);
console.log(`  → Updated leaves.json: ${leaveRequests.length} requests, ${leaveBalances.length} balances`);

// ============= UPDATE ATTENDANCE.JSON with expanded summaries =============
console.log('Updating attendance.json with expanded summaries...');
const attFile = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/hr/attendance.json'), 'utf8'));
attFile.daily_summaries = dailySummaries;
attFile.monthly_summary = {
  month: '2026-02',
  total_working_days: 24,
  average_attendance_rate: 91.5,
  total_overtime_hours: Math.round(dailySummaries.reduce((s, d) => s + d.overtime_hours, 0)),
  total_absent_days: dailySummaries.filter(d => d.status === 'ABSENT').length,
  total_late_arrivals: dailySummaries.filter(d => d.late_minutes > 0).length,
  total_on_leave: dailySummaries.filter(d => d.status === 'LEAVE').length
};
fs.writeFileSync(
  path.join(__dirname, '../src/data/hr/attendance.json'),
  JSON.stringify(attFile, null, 2)
);
console.log(`  → Updated attendance.json: ${dailySummaries.length} daily summaries`);

console.log('\n✅ All data files generated successfully!');
console.log('Summary:');
console.log(`  Attendance Transactions: ${attTransactions.length}`);
console.log(`  Attendance Exceptions: ${exceptions.length}`);
console.log(`  Daily Summaries: ${dailySummaries.length}`);
console.log(`  Leave Requests: ${leaveRequests.length}`);
console.log(`  Leave Balances: ${leaveBalances.length}`);
console.log(`  Payroll Transactions: ${payrollTransactions.length}`);
console.log(`  Training Enrollments: ${enrollments.length}`);
console.log(`  Certificates: ${certificates.length}`);
console.log(`  Performance Goals: ${goals.length}`);
console.log(`  Performance Reviews: ${reviews.length}`);
console.log(`  Candidates: ${newCandidates.length}`);
console.log(`  Applications: ${applications.length}`);
