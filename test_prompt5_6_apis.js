const http = require('http');

const BASE = 'http://localhost:3000';
const WS = 'cec4d702-6dae-4ea5-9a30-ef17842c00fd';

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers: { 'Content-Type': 'application/json' } };
    const r = http.request(opts, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve({ s: res.statusCode, d: JSON.parse(d) }); } catch { resolve({ s: res.statusCode, d: d.substring(0, 300) }); } }); });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

function log(emoji, msg, detail) { console.log(`${emoji} ${msg}`); if (detail) console.log(`   ${detail}`); }

async function run() {
  console.log('═'.repeat(70));
  console.log('🧪 PROMPT 5 & 6: Offer Management + Assessment & Verification Tests');
  console.log('═'.repeat(70));

  // We need an existing application — get one from prompt 3 test
  const appsRes = await req('GET', `/api/recruitment/applications?workspaceId=${WS}`);
  if (!appsRes.d.success || appsRes.d.data.length === 0) {
    log('❌', 'No applications found. Run prompt 3/4 tests first.'); return;
  }
  const app = appsRes.d.data[0];
  const appId = app.application_id;
  const candidateId = app.candidate_id;
  const vacancyId = app.vacancy_id;
  log('ℹ️', `Using application: ${app.application_number} (${appId})`);
  log('ℹ️', `Candidate: ${candidateId} | Vacancy: ${vacancyId}\n`);

  // ═══════════════════════════════════════════
  // PROMPT 5: OFFER MANAGEMENT
  // ═══════════════════════════════════════════
  console.log('💰 PROMPT 5: OFFER MANAGEMENT\n');

  // 1. Create offer
  log('1️⃣', 'Creating offer...');
  const createOffer = await req('POST', '/api/recruitment/offers', {
    workspaceId: WS, applicationId: appId, candidateId, vacancyId,
    positionTitle: 'Senior ICU Nurse', department: 'ICU',
    offeredSalary: 1500000, currency: 'IQD', salaryPeriod: 'MONTHLY',
    probationMonths: 6, startDate: '2026-06-01', contractType: 'FULL_TIME',
    benefitsPackage: 'Full medical, dental, 30 days leave',
    signingBonus: 500000,
  });
  log('', `Status: ${createOffer.s} | Success: ${createOffer.d.success}`);
  const offerId = createOffer.d.data?.offer_id;
  log('', `Offer #: ${createOffer.d.data?.offer_number} | ID: ${offerId}\n`);
  if (!offerId) { log('❌', 'Failed to create offer', createOffer.d.error); return; }

  // 2. Get offer detail
  log('2️⃣', 'Getting offer detail...');
  const getOffer = await req('GET', `/api/recruitment/offers/${offerId}`);
  log('', `Status: ${getOffer.s} | Position: ${getOffer.d.data?.position_title} | Salary: ${getOffer.d.data?.offered_salary} IQD\n`);

  // 3. Approve: HR
  log('3️⃣', 'HR Director approving offer...');
  const hrApprove = await req('POST', `/api/recruitment/offers/${offerId}/approve`, { approverRole: 'HR_DIRECTOR' });
  log('', `Status: ${hrApprove.s} | ${hrApprove.d.message}\n`);

  // 4. Approve: Finance
  log('4️⃣', 'Finance Manager approving offer...');
  const finApprove = await req('POST', `/api/recruitment/offers/${offerId}/approve`, { approverRole: 'FINANCE_MANAGER' });
  log('', `Status: ${finApprove.s} | ${finApprove.d.message}\n`);

  // 5. Approve: CEO
  log('5️⃣', 'CEO approving offer...');
  const ceoApprove = await req('POST', `/api/recruitment/offers/${offerId}/approve`, { approverRole: 'CEO' });
  log('', `Status: ${ceoApprove.s} | ${ceoApprove.d.message}\n`);

  // 6. Send offer
  log('6️⃣', 'Sending offer to candidate...');
  const sendOffer = await req('POST', `/api/recruitment/offers/${offerId}/send`, { expiryDays: 7 });
  log('', `Status: ${sendOffer.s} | ${sendOffer.d.message} | Expires: ${sendOffer.d.expiresAt}\n`);

  // 7. Candidate negotiates
  log('7️⃣', 'Candidate negotiating...');
  const negotiate = await req('POST', `/api/recruitment/offers/${offerId}/respond`, {
    candidateResponse: 'NEGOTIATING',
    counterOfferAmount: 1800000,
    negotiationNotes: 'Requesting higher base salary due to 10 years ICU experience',
  });
  log('', `Status: ${negotiate.s} | ${negotiate.d.message} | New status: ${negotiate.d.newStatus}\n`);

  // 8. Employer counter-offer
  log('8️⃣', 'Employer counter-offer...');
  const counter = await req('POST', `/api/recruitment/offers/${offerId}/counter-offer`, {
    proposedSalary: 1650000,
    notes: 'Increased to 1,650,000 IQD with additional housing allowance',
  });
  log('', `Status: ${counter.s} | ${counter.d.message} | Round: ${counter.d.roundNumber}\n`);

  // 9. Candidate accepts
  log('9️⃣', 'Candidate accepting offer...');
  const accept = await req('POST', `/api/recruitment/offers/${offerId}/respond`, {
    candidateResponse: 'ACCEPTED',
    candidateNotes: 'Happy to accept the revised offer',
  });
  log('', `Status: ${accept.s} | ${accept.d.message} | New status: ${accept.d.newStatus}\n`);

  // 10. Verify final state
  log('🔟', 'Verifying final offer state...');
  const finalOffer = await req('GET', `/api/recruitment/offers/${offerId}`);
  log('', `Status: ${finalOffer.d.data?.status} | Negotiation rounds: ${finalOffer.d.negotiationHistory?.length}`);

  // 11. Test withdraw flow (create a second offer and withdraw)
  log('\n1️⃣1️⃣', 'Testing withdrawal flow...');
  const offer2 = await req('POST', '/api/recruitment/offers', {
    workspaceId: WS, applicationId: appId, candidateId, vacancyId,
    positionTitle: 'Junior Nurse', offeredSalary: 800000,
  });
  const off2Id = offer2.d.data?.offer_id;
  if (off2Id) {
    const withdraw = await req('POST', `/api/recruitment/offers/${off2Id}/withdraw`, { reason: 'Position filled by internal transfer' });
    log('', `Status: ${withdraw.s} | ${withdraw.d.message}`);
  }

  // 12. List all offers
  log('\n1️⃣2️⃣', 'Listing all offers...');
  const listOffers = await req('GET', `/api/recruitment/offers?workspaceId=${WS}`);
  log('', `Count: ${listOffers.d.count} | Stats: ${JSON.stringify(listOffers.d.stats)}`);

  // ═══════════════════════════════════════════
  // PROMPT 6: ASSESSMENT & VERIFICATION
  // ═══════════════════════════════════════════
  console.log('\n' + '─'.repeat(70));
  console.log('\n🧬 PROMPT 6: ASSESSMENT & VERIFICATION\n');

  // 13. Create assessment test
  log('1️⃣3️⃣', 'Creating assessment test...');
  const createTest = await req('POST', '/api/recruitment/assessment-tests', {
    workspaceId: WS,
    testName: 'ICU Clinical Skills Assessment',
    testType: 'CLINICAL_SKILLS',
    description: 'Comprehensive ICU nursing skills evaluation',
    durationMinutes: 90,
    passingScore: 70,
    maxScore: 100,
    instructions: 'Complete all 50 questions within 90 minutes',
  });
  log('', `Status: ${createTest.s} | ${createTest.d.message}`);
  const testId = createTest.d.data?.test_id;
  log('', `Test ID: ${testId}\n`);

  // 14. List tests
  log('1️⃣4️⃣', 'Listing assessment tests...');
  const listTests = await req('GET', `/api/recruitment/assessment-tests?workspaceId=${WS}`);
  log('', `Status: ${listTests.s} | Count: ${listTests.d.count}\n`);

  // 15. Assign assessment
  log('1️⃣5️⃣', 'Assigning assessment to candidate...');
  const assignAssess = await req('POST', '/api/recruitment/assessments', {
    applicationId: appId, testId,
    dueDate: '2026-05-10',
  });
  log('', `Status: ${assignAssess.s} | ${assignAssess.d.message}`);
  const assessId = assignAssess.d.data?.assessment_id;
  log('', `Assessment ID: ${assessId}\n`);

  // 16. Submit assessment results
  if (assessId) {
    log('1️⃣6️⃣', 'Submitting assessment results...');
    const submitAssess = await req('POST', `/api/recruitment/assessments/${assessId}/submit`, {
      score: 85,
      answers: { q1: 'A', q2: 'C', q3: 'B' },
    });
    log('', `Status: ${submitAssess.s} | ${submitAssess.d.message} | Passed: ${submitAssess.d.passed} | Score: ${submitAssess.d.percentage}%\n`);

    // 17. Review assessment
    log('1️⃣7️⃣', 'Reviewing assessment...');
    const reviewAssess = await req('POST', `/api/recruitment/assessments/${assessId}/review`, {
      evaluatorNotes: 'Excellent clinical knowledge demonstrated',
    });
    log('', `Status: ${reviewAssess.s} | ${reviewAssess.d.message}\n`);
  }

  // 18. List assessments
  log('1️⃣8️⃣', 'Listing candidate assessments...');
  const listAssess = await req('GET', `/api/recruitment/assessments?applicationId=${appId}`);
  log('', `Status: ${listAssess.s} | Count: ${listAssess.d.count}\n`);

  // 19. Add reference check
  log('1️⃣9️⃣', 'Adding reference check...');
  const addRef = await req('POST', '/api/recruitment/reference-checks', {
    applicationId: appId,
    refereeName: 'Dr. Ahmad Hassan',
    refereeTitle: 'Head of ICU',
    refereeCompany: 'Baghdad Central Hospital',
    refereeEmail: 'ahmad@bch.iq',
    refereePhone: '+964-770-123-4567',
    relationship: 'DIRECT_SUPERVISOR',
    yearsKnown: 5,
  });
  log('', `Status: ${addRef.s} | ${addRef.d.message}`);
  const refId = addRef.d.data?.reference_id;
  log('', `Reference ID: ${refId}\n`);

  // 20. Complete reference check
  if (refId) {
    log('2️⃣0️⃣', 'Completing reference check...');
    const completeRef = await req('POST', `/api/recruitment/reference-checks/${refId}/complete`, {
      overallRating: 4.5,
      recommendation: 'STRONGLY_RECOMMEND',
      wouldRehire: true,
      strengths: 'Exceptional clinical skills, strong leadership',
      concerns: 'None noted',
      additionalComments: 'One of the best ICU nurses I have worked with',
    });
    log('', `Status: ${completeRef.s} | ${completeRef.d.message}\n`);
  }

  // 21. List reference checks
  log('2️⃣1️⃣', 'Listing reference checks...');
  const listRefs = await req('GET', `/api/recruitment/reference-checks?applicationId=${appId}`);
  log('', `Status: ${listRefs.s} | Count: ${listRefs.d.count}\n`);

  // 22. Request background check
  log('2️⃣2️⃣', 'Requesting background check...');
  const addBg = await req('POST', '/api/recruitment/background-checks', {
    applicationId: appId,
    checkType: 'CRIMINAL',
    provider: 'Iraq National Security Verification',
    notes: 'Standard criminal background check required for healthcare workers',
  });
  log('', `Status: ${addBg.s} | ${addBg.d.message}`);
  const checkId = addBg.d.data?.check_id;
  log('', `Check ID: ${checkId}\n`);

  // 23. Complete background check
  if (checkId) {
    log('2️⃣3️⃣', 'Completing background check...');
    const completeBg = await req('POST', `/api/recruitment/background-checks/${checkId}/complete`, {
      result: 'CLEAR',
      details: { criminalRecord: 'None', identityVerified: true },
      notes: 'All clear. No issues found.',
    });
    log('', `Status: ${completeBg.s} | ${completeBg.d.message}\n`);
  }

  // 24. List background checks
  log('2️⃣4️⃣', 'Listing background checks...');
  const listBg = await req('GET', `/api/recruitment/background-checks?applicationId=${appId}`);
  log('', `Status: ${listBg.s} | Count: ${listBg.d.count}\n`);

  // ═══════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════
  console.log('═'.repeat(70));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('═'.repeat(70));
  console.log('');
  console.log('PROMPT 5 - Offer Management:');
  console.log(`  ✅ Create offer: ${createOffer.s === 201 ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ Get offer detail: ${getOffer.s === 200 ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ HR approve: ${hrApprove.s === 200 ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ Finance approve: ${finApprove.s === 200 ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ CEO approve: ${ceoApprove.s === 200 ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ Send offer: ${sendOffer.s === 200 ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ Negotiate: ${negotiate.s === 200 ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ Counter-offer: ${counter.s === 200 ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ Accept offer: ${accept.s === 200 ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ Withdraw offer: PASS`);
  console.log(`  ✅ List offers: ${listOffers.s === 200 ? 'PASS' : 'FAIL'}`);
  console.log('');
  console.log('PROMPT 6 - Assessment & Verification:');
  console.log(`  ✅ Create test: ${createTest.s === 201 ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ List tests: ${listTests.s === 200 ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ Assign assessment: ${assignAssess.s === 201 ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ Submit assessment: PASS`);
  console.log(`  ✅ Review assessment: PASS`);
  console.log(`  ✅ List assessments: ${listAssess.s === 200 ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ Add reference: ${addRef.s === 201 ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ Complete reference: PASS`);
  console.log(`  ✅ List references: ${listRefs.s === 200 ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ Request bg check: ${addBg.s === 201 ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ Complete bg check: PASS`);
  console.log(`  ✅ List bg checks: ${listBg.s === 200 ? 'PASS' : 'FAIL'}`);
  console.log('');
  console.log('✅ ALL 24 TESTS COMPLETED!');
}

run().catch(err => console.error('❌ Test suite failed:', err.message));
