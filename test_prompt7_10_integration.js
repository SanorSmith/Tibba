const http = require('http');

const BASE = 'http://localhost:3000';
const WS = 'cec4d702-6dae-4ea5-9a30-ef17842c00fd';
let passed = 0, failed = 0;

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers: { 'Content-Type': 'application/json' } };
    const r = http.request(opts, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve({ s: res.statusCode, d: JSON.parse(d) }); } catch { resolve({ s: res.statusCode, d }); } }); });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

function test(name, ok) {
  if (ok) { passed++; console.log(`  ✅ ${name}: PASS`); }
  else { failed++; console.log(`  ❌ ${name}: FAIL`); }
}

async function run() {
  console.log('═'.repeat(65));
  console.log('🧪 PROMPTS 7-10: Integration Test (Frontend APIs + Health)');
  console.log('═'.repeat(65));

  // ── HEALTH CHECK ──
  console.log('\n🏥 Health Check');
  const health = await req('GET', '/api/recruitment/health');
  test('Health endpoint returns healthy', health.s === 200 && health.d.success && health.d.status === 'healthy');
  test('Database connected', health.d.database === 'connected');
  test('Stats returned', !!health.d.stats);
  console.log(`   Stats: requisitions=${health.d.stats?.requisitions}, applications=${health.d.stats?.applications}, interviews=${health.d.stats?.interviews}, offers=${health.d.stats?.offers}`);

  // ── REQUISITION FLOW (as frontend would call) ──
  console.log('\n📋 Requisition Flow');
  const createReq = await req('POST', '/api/recruitment/requisitions', {
    workspaceId: WS, positionTitle: 'Integration Test - Pharmacist',
    employmentType: 'FULL_TIME', numberOfPositions: 1,
    salaryMin: 1200000, salaryMax: 1800000,
    businessJustification: 'Integration test requisition',
    priority: 'HIGH',
  });
  test('Create requisition', createReq.s === 201 && createReq.d.success);
  const reqId = createReq.d.data?.requisition_id;

  const listReqs = await req('GET', `/api/recruitment/requisitions?workspaceId=${WS}`);
  test('List requisitions', listReqs.s === 200 && listReqs.d.success && listReqs.d.data.length > 0);
  test('Stats present', !!listReqs.d.stats);

  if (reqId) {
    const detailReq = await req('GET', `/api/recruitment/requisitions/${reqId}`);
    test('Get requisition detail', detailReq.s === 200 && detailReq.d.success);

    const submitReq = await req('POST', `/api/recruitment/requisitions/${reqId}/submit`);
    test('Submit for approval', submitReq.s === 200 && submitReq.d.success);

    const hrApprove = await req('POST', `/api/recruitment/requisitions/${reqId}/approve`, {
      approverRole: 'HR_DIRECTOR', action: 'APPROVED', comments: 'Integration test OK',
    });
    test('HR approve', hrApprove.s === 200 && hrApprove.d.success);

    const finApprove = await req('POST', `/api/recruitment/requisitions/${reqId}/approve`, {
      approverRole: 'FINANCE_MANAGER', action: 'APPROVED',
    });
    test('Finance approve', finApprove.s === 200 && finApprove.d.success);

    const ceoApprove = await req('POST', `/api/recruitment/requisitions/${reqId}/approve`, {
      approverRole: 'CEO', action: 'APPROVED',
    });
    test('CEO approve (creates vacancy)', ceoApprove.s === 200 && ceoApprove.d.success);

    // Re-fetch to check approval history
    const detailAfter = await req('GET', `/api/recruitment/requisitions/${reqId}`);
    test('Approval history populated', (detailAfter.d.approvalHistory || []).length >= 3);
  }

  // ── APPLICATION & PIPELINE FLOW ──
  console.log('\n📊 Application & Pipeline Flow');
  const apps = await req('GET', `/api/recruitment/applications?workspaceId=${WS}`);
  test('List applications', apps.s === 200 && apps.d.success);

  const pipeline = await req('GET', `/api/recruitment/pipeline/summary?workspaceId=${WS}`);
  test('Pipeline summary', pipeline.s === 200 && pipeline.d.success);
  test('Pipeline stages returned', (pipeline.d.pipeline || []).length > 0);
  test('Status summary returned', (pipeline.d.statusSummary || []).length > 0);

  if (apps.d.data && apps.d.data.length > 0) {
    const appId = apps.d.data[0].application_id;
    const appDetail = await req('GET', `/api/recruitment/applications/${appId}`);
    test('Application detail', appDetail.s === 200 && appDetail.d.success);
    test('Detail includes stageHistory', Array.isArray(appDetail.d.stageHistory));
    test('Detail includes notes', Array.isArray(appDetail.d.notes));
    test('Detail includes interviews', Array.isArray(appDetail.d.interviews));

    const noteRes = await req('POST', `/api/recruitment/applications/${appId}/notes`, {
      content: 'Integration test note', noteType: 'GENERAL',
    });
    test('Add note via frontend flow', noteRes.s === 201 && noteRes.d.success);
  }

  // ── INTERVIEW FLOW ──
  console.log('\n🎙️ Interview Flow');
  const interviews = await req('GET', `/api/recruitment/interviews?workspaceId=${WS}`);
  test('List interviews', interviews.s === 200 && interviews.d.success);

  const evalCriteria = await req('GET', `/api/recruitment/evaluation-criteria?workspaceId=${WS}`);
  test('Evaluation criteria loaded', evalCriteria.s === 200 && evalCriteria.d.success);

  const stats = await req('GET', `/api/recruitment/interviews/statistics?workspaceId=${WS}`);
  test('Interview statistics', stats.s === 200 && stats.d.success);

  // ── OFFER FLOW ──
  console.log('\n💰 Offer Flow');
  const offers = await req('GET', `/api/recruitment/offers?workspaceId=${WS}`);
  test('List offers', offers.s === 200 && offers.d.success);
  test('Offer stats present', !!offers.d.stats);

  // ── ASSESSMENT FLOW ──
  console.log('\n🧬 Assessment & Verification Flow');
  const tests = await req('GET', `/api/recruitment/assessment-tests?workspaceId=${WS}`);
  test('List assessment tests', tests.s === 200 && tests.d.success);

  if (apps.d.data && apps.d.data.length > 0) {
    const appId = apps.d.data[0].application_id;
    const refs = await req('GET', `/api/recruitment/reference-checks?applicationId=${appId}`);
    test('List reference checks', refs.s === 200 && refs.d.success);

    const bgs = await req('GET', `/api/recruitment/background-checks?applicationId=${appId}`);
    test('List background checks', bgs.s === 200 && bgs.d.success);

    const assessments = await req('GET', `/api/recruitment/assessments?applicationId=${appId}`);
    test('List candidate assessments', assessments.s === 200 && assessments.d.success);
  }

  // ── SUMMARY ──
  console.log('\n' + '═'.repeat(65));
  console.log('📊 INTEGRATION TEST RESULTS');
  console.log('═'.repeat(65));
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  Total: ${passed + failed}`);
  console.log(`  Result: ${failed === 0 ? '🎉 ALL PASSED!' : '⚠️ Some tests failed'}`);
  console.log('═'.repeat(65));
}

run().catch(err => console.error('❌ Test suite failed:', err.message));
