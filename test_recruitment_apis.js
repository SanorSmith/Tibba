const http = require('http');

const BASE_URL = 'http://localhost:3000';
const WORKSPACE_ID = 'cec4d702-6dae-4ea5-9a30-ef17842c00fd';

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: data.substring(0, 200) });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testAPIs() {
  console.log('🧪 Testing Recruitment APIs...\n');

  // 1. Create requisition
  console.log('1️⃣ Creating a new requisition...');
  const createRes = await request('POST', '/api/recruitment/requisitions', {
    workspaceId: WORKSPACE_ID,
    positionTitle: 'Senior Nurse - ICU',
    departmentId: null,
    numberOfPositions: 2,
    salaryMin: 1200000,
    salaryMax: 1500000,
    currency: 'IQD',
    priority: 'HIGH',
    businessJustification: 'Increased patient load in ICU department requires additional nursing staff',
    jobDescription: 'Provide critical care nursing in the ICU department',
    requiredQualifications: 'BSN degree, 3+ years ICU experience, BLS/ACLS certification',
    location: 'Baghdad',
    employmentType: 'FULL_TIME',
  });
  console.log(`   Status: ${createRes.status}`);
  console.log(`   Success: ${createRes.data.success}`);
  console.log(`   Requisition #: ${createRes.data.data?.requisition_number}`);
  const reqId = createRes.data.data?.requisition_id;
  console.log(`   ID: ${reqId}\n`);

  if (!reqId) {
    console.log('❌ Failed to create requisition. Aborting tests.');
    console.log('   Error:', createRes.data.error || createRes.data);
    return;
  }

  // 2. Get requisition details
  console.log('2️⃣ Getting requisition details...');
  const getRes = await request('GET', `/api/recruitment/requisitions/${reqId}`);
  console.log(`   Status: ${getRes.status}`);
  console.log(`   Position: ${getRes.data.data?.position_title}`);
  console.log(`   Status: ${getRes.data.data?.status}\n`);

  // 3. Update requisition
  console.log('3️⃣ Updating requisition...');
  const updateRes = await request('PUT', `/api/recruitment/requisitions/${reqId}`, {
    positionTitle: 'Senior ICU Nurse - Critical Care',
    preferredQualifications: 'CCRN certification preferred, Arabic and English fluency',
  });
  console.log(`   Status: ${updateRes.status}`);
  console.log(`   Updated title: ${updateRes.data.data?.position_title}\n`);

  // 4. Submit for approval
  console.log('4️⃣ Submitting for approval...');
  const submitRes = await request('POST', `/api/recruitment/requisitions/${reqId}/submit`);
  console.log(`   Status: ${submitRes.status}`);
  console.log(`   New status: ${submitRes.data.data?.status}`);
  console.log(`   Next approver: ${submitRes.data.nextApprover}\n`);

  // 5. HR Director approves
  console.log('5️⃣ HR Director approving...');
  const hrApproveRes = await request('POST', `/api/recruitment/requisitions/${reqId}/approve`, {
    approverRole: 'HR_DIRECTOR',
    action: 'APPROVED',
    comments: 'Position justified, ICU staffing levels critical',
  });
  console.log(`   Status: ${hrApproveRes.status}`);
  console.log(`   Message: ${hrApproveRes.data.message}`);
  console.log(`   New status: ${hrApproveRes.data.newStatus}\n`);

  // 6. Finance Manager approves
  console.log('6️⃣ Finance Manager approving...');
  const finApproveRes = await request('POST', `/api/recruitment/requisitions/${reqId}/approve`, {
    approverRole: 'FINANCE_MANAGER',
    action: 'APPROVED',
    comments: 'Budget allocation confirmed for FY2026 Q2',
  });
  console.log(`   Status: ${finApproveRes.status}`);
  console.log(`   Message: ${finApproveRes.data.message}`);
  console.log(`   New status: ${finApproveRes.data.newStatus}\n`);

  // 7. CEO approves (should auto-create vacancy)
  console.log('7️⃣ CEO approving (final)...');
  const ceoApproveRes = await request('POST', `/api/recruitment/requisitions/${reqId}/approve`, {
    approverRole: 'CEO',
    action: 'APPROVED',
    comments: 'Approved. Prioritize hiring within 30 days.',
  });
  console.log(`   Status: ${ceoApproveRes.status}`);
  console.log(`   Message: ${ceoApproveRes.data.message}`);
  console.log(`   New status: ${ceoApproveRes.data.newStatus}\n`);

  // 8. Verify final state
  console.log('8️⃣ Verifying final state...');
  const finalRes = await request('GET', `/api/recruitment/requisitions/${reqId}`);
  console.log(`   Requisition status: ${finalRes.data.data?.status}`);
  console.log(`   HR approved: ${finalRes.data.data?.hr_approved_at ? 'YES' : 'NO'}`);
  console.log(`   Finance approved: ${finalRes.data.data?.finance_approved_at ? 'YES' : 'NO'}`);
  console.log(`   CEO approved: ${finalRes.data.data?.final_approved_at ? 'YES' : 'NO'}`);
  console.log(`   Approval history: ${finalRes.data.approvalHistory?.length} entries`);
  console.log(`   Linked vacancy: ${finalRes.data.linkedVacancy ? 'YES - ' + finalRes.data.linkedVacancy.vacancy_number : 'NO'}\n`);

  // 9. List all requisitions
  console.log('9️⃣ Listing all requisitions...');
  const listRes = await request('GET', `/api/recruitment/requisitions?workspaceId=${WORKSPACE_ID}`);
  console.log(`   Status: ${listRes.status}`);
  console.log(`   Total: ${listRes.data.count}`);
  console.log(`   Stats: ${JSON.stringify(listRes.data.stats)}\n`);

  // 10. Test rejection flow - create another
  console.log('🔟 Testing rejection flow...');
  const rejectCreate = await request('POST', '/api/recruitment/requisitions', {
    workspaceId: WORKSPACE_ID,
    positionTitle: 'Janitor - Main Building',
    numberOfPositions: 1,
    salaryMin: 400000,
    salaryMax: 500000,
    businessJustification: 'Additional cleaning staff needed',
  });
  const rejectReqId = rejectCreate.data.data?.requisition_id;

  if (rejectReqId) {
    await request('POST', `/api/recruitment/requisitions/${rejectReqId}/submit`);
    const rejectRes = await request('POST', `/api/recruitment/requisitions/${rejectReqId}/approve`, {
      approverRole: 'HR_DIRECTOR',
      action: 'REJECTED',
      comments: 'Not within current hiring budget. Outsource cleaning services instead.',
    });
    console.log(`   Rejection status: ${rejectRes.data.newStatus}`);
    console.log(`   Message: ${rejectRes.data.message}\n`);
  }

  console.log('✅ All API tests completed!');
}

testAPIs().catch(err => {
  console.error('❌ Test failed:', err.message);
});
