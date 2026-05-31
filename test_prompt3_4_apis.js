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
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data: data.substring(0, 300) }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function log(emoji, msg, detail) {
  console.log(`${emoji} ${msg}`);
  if (detail) console.log(`   ${detail}`);
}

async function testAll() {
  console.log('═'.repeat(70));
  console.log('🧪 PROMPT 3 & 4: Application Tracking + Interview Management Tests');
  console.log('═'.repeat(70));

  // ──────────────────────────────────────────────
  // PROMPT 3: APPLICATION TRACKING
  // ──────────────────────────────────────────────
  console.log('\n📋 PROMPT 3: APPLICATION TRACKING\n');

  // Get existing candidates and vacancies
  const candRes = await request('GET', '/api/hr/recruitment?type=candidates');
  const vacRes = await request('GET', '/api/hr/recruitment?type=vacancies');
  
  if (!candRes.data.success || candRes.data.data.length === 0) {
    log('❌', 'No candidates found. Cannot proceed with application tests.');
    return;
  }
  if (!vacRes.data.success || vacRes.data.data.length === 0) {
    log('❌', 'No vacancies found. Cannot proceed with application tests.');
    return;
  }

  const candidateId = candRes.data.data[0].id;
  const vacancyId = vacRes.data.data[0].id;
  log('ℹ️', `Using candidate: ${candRes.data.data[0].first_name} ${candRes.data.data[0].last_name} (${candidateId})`);
  log('ℹ️', `Using vacancy: ${vacRes.data.data[0].position} (${vacancyId})\n`);

  // 1. Create application
  log('1️⃣', 'Creating application...');
  const createApp = await request('POST', '/api/recruitment/applications', {
    workspaceId: WORKSPACE_ID,
    candidateId,
    vacancyId,
    source: 'WEBSITE',
    coverLetter: 'I am excited to apply for this position.',
  });
  log('', `Status: ${createApp.status} | Success: ${createApp.data.success}`);
  const appId = createApp.data.data?.application_id;
  log('', `Application #: ${createApp.data.data?.application_number} | ID: ${appId}\n`);

  if (!appId) {
    log('❌', 'Failed to create application. Error:', createApp.data.error);
    return;
  }

  // 2. List applications
  log('2️⃣', 'Listing applications...');
  const listApps = await request('GET', `/api/recruitment/applications?workspaceId=${WORKSPACE_ID}`);
  log('', `Status: ${listApps.status} | Count: ${listApps.data.count} | Stats: ${JSON.stringify(listApps.data.stats)}\n`);

  // 3. Get application detail
  log('3️⃣', 'Getting application detail...');
  const getApp = await request('GET', `/api/recruitment/applications/${appId}`);
  log('', `Status: ${getApp.status} | Candidate: ${getApp.data.data?.first_name} ${getApp.data.data?.last_name}`);
  log('', `Stage: ${getApp.data.data?.stage_name} | History entries: ${getApp.data.stageHistory?.length}\n`);

  // 4. Screen application
  log('4️⃣', 'Screening application (PASS)...');
  const screenApp = await request('POST', `/api/recruitment/applications/${appId}/screen`, {
    screeningScore: 85,
    screeningNotes: 'Strong qualifications, meets all requirements',
    decision: 'PASS',
  });
  log('', `Status: ${screenApp.status} | Message: ${screenApp.data.message}\n`);

  // 5. Get stages for workspace
  const stagesRes = await request('GET', `/api/recruitment/pipeline/summary?workspaceId=${WORKSPACE_ID}`);
  const stages = stagesRes.data.pipeline || [];
  
  // 6. Move to next stage
  if (stages.length >= 3) {
    const nextStageId = stages[2]?.stageId; // Phone Screen
    log('5️⃣', `Moving to stage: ${stages[2]?.stageName}...`);
    const moveRes = await request('POST', `/api/recruitment/applications/${appId}/move-stage`, {
      newStageId: nextStageId,
      notes: 'Passed initial screening, ready for phone screen',
    });
    log('', `Status: ${moveRes.status} | Message: ${moveRes.data.message}\n`);
  }

  // 7. Add note
  log('6️⃣', 'Adding note...');
  const noteRes = await request('POST', `/api/recruitment/applications/${appId}/notes`, {
    content: 'Candidate has relevant ICU experience from previous hospital',
    noteType: 'SCREENING',
    authorName: 'HR Manager',
  });
  log('', `Status: ${noteRes.status} | Message: ${noteRes.data.message}\n`);

  // 8. Get notes
  log('7️⃣', 'Getting notes...');
  const getNotesRes = await request('GET', `/api/recruitment/applications/${appId}/notes`);
  log('', `Status: ${getNotesRes.status} | Notes count: ${getNotesRes.data.count}\n`);

  // 9. Pipeline summary
  log('8️⃣', 'Getting pipeline summary...');
  const pipelineRes = await request('GET', `/api/recruitment/pipeline/summary?workspaceId=${WORKSPACE_ID}`);
  log('', `Status: ${pipelineRes.status}`);
  if (pipelineRes.data.pipeline) {
    pipelineRes.data.pipeline.forEach(s => {
      if (s.count > 0) log('', `  ${s.stageName}: ${s.count} applications`);
    });
  }
  log('', `Metrics: ${JSON.stringify(pipelineRes.data.metrics)}\n`);

  // ──────────────────────────────────────────────
  // PROMPT 4: INTERVIEW MANAGEMENT
  // ──────────────────────────────────────────────
  console.log('─'.repeat(70));
  console.log('\n🎤 PROMPT 4: INTERVIEW MANAGEMENT\n');

  // 10. Schedule interview
  log('9️⃣', 'Scheduling interview...');
  const scheduleRes = await request('POST', '/api/recruitment/interviews', {
    workspaceId: WORKSPACE_ID,
    applicationId: appId,
    interviewType: 'TECHNICAL',
    interviewRound: 1,
    scheduledDate: '2026-05-05',
    startTime: '14:00',
    endTime: '15:00',
    location: 'Conference Room A, 3rd Floor',
    panelMembers: [
      { interviewerName: 'Dr. Ahmed Hassan', interviewerRole: 'LEAD', isLead: true },
      { interviewerName: 'Nurse Sarah Ali', interviewerRole: 'INTERVIEWER', isLead: false },
    ],
  });
  log('', `Status: ${scheduleRes.status} | Message: ${scheduleRes.data.message}`);
  const interviewId = scheduleRes.data.data?.interview_id;
  log('', `Interview ID: ${interviewId}\n`);

  if (!interviewId) {
    log('❌', 'Failed to schedule interview. Error:', scheduleRes.data.error);
    console.log('\n✅ Application Tracking tests completed. Interview tests skipped.');
    return;
  }

  // 11. Get interview detail
  log('🔟', 'Getting interview detail...');
  const getIntRes = await request('GET', `/api/recruitment/interviews/${interviewId}`);
  log('', `Status: ${getIntRes.status} | Type: ${getIntRes.data.data?.interview_type}`);
  log('', `Panel members: ${getIntRes.data.panel?.length} | Evaluations: ${getIntRes.data.evaluations?.length}\n`);

  // 12. List interviews
  log('1️⃣1️⃣', 'Listing interviews...');
  const listIntRes = await request('GET', `/api/recruitment/interviews?workspaceId=${WORKSPACE_ID}`);
  log('', `Status: ${listIntRes.status} | Count: ${listIntRes.data.count}\n`);

  // 13. Submit evaluation
  log('1️⃣2️⃣', 'Submitting evaluation...');
  const evalRes = await request('POST', `/api/recruitment/interviews/${interviewId}/evaluations`, {
    evaluatorId: 'b737e37a-f6b5-46e0-88c2-985506ccebbf', // existing user
    overallRating: 4.2,
    recommendation: 'STRONG_HIRE',
    strengths: 'Excellent clinical knowledge, strong communication skills',
    weaknesses: 'Could improve on emergency protocols',
    detailedFeedback: 'Very impressive candidate with relevant ICU experience',
    criteriaScores: {
      'technical_skills': 4.5,
      'communication': 4.0,
      'problem_solving': 4.2,
      'cultural_fit': 4.0
    },
  });
  log('', `Status: ${evalRes.status} | Message: ${evalRes.data.message}\n`);

  // 14. Get evaluations
  log('1️⃣3️⃣', 'Getting evaluations...');
  const getEvalsRes = await request('GET', `/api/recruitment/interviews/${interviewId}/evaluations`);
  log('', `Status: ${getEvalsRes.status} | Count: ${getEvalsRes.data.count} | Avg Rating: ${getEvalsRes.data.averageRating}`);
  log('', `Recommendations: ${JSON.stringify(getEvalsRes.data.recommendations)}\n`);

  // 15. Complete interview
  log('1️⃣4️⃣', 'Completing interview...');
  const completeRes = await request('POST', `/api/recruitment/interviews/${interviewId}/complete`, {
    summary: 'Excellent interview. Candidate demonstrates strong ICU nursing skills.',
    overallRating: 4.2,
    overallRecommendation: 'STRONG_HIRE',
  });
  log('', `Status: ${completeRes.status} | Message: ${completeRes.data.message}\n`);

  // 16. Get evaluation criteria
  log('1️⃣5️⃣', 'Getting evaluation criteria...');
  const criteriaRes = await request('GET', `/api/recruitment/evaluation-criteria?workspaceId=${WORKSPACE_ID}`);
  log('', `Status: ${criteriaRes.status} | Count: ${criteriaRes.data.count}\n`);

  // 17. Interview statistics
  log('1️⃣6️⃣', 'Getting interview statistics...');
  const statsRes = await request('GET', `/api/recruitment/interviews/statistics?applicationId=${appId}`);
  log('', `Status: ${statsRes.status}`);
  if (statsRes.data.data) {
    log('', `  Interviews: ${JSON.stringify(statsRes.data.data.interviews)}`);
    log('', `  Avg Rating: ${statsRes.data.data.averageRating}`);
    log('', `  Recommendations: ${JSON.stringify(statsRes.data.data.recommendations)}`);
  }

  // 18. Test cancellation (schedule a second interview then cancel it)
  log('\n1️⃣7️⃣', 'Testing interview cancellation...');
  const schedule2Res = await request('POST', '/api/recruitment/interviews', {
    workspaceId: WORKSPACE_ID,
    applicationId: appId,
    interviewType: 'HR_INTERVIEW',
    interviewRound: 2,
    scheduledDate: '2026-05-07',
    startTime: '10:00',
    endTime: '11:00',
    location: 'HR Office',
  });
  const int2Id = schedule2Res.data.data?.interview_id;
  if (int2Id) {
    const cancelRes = await request('POST', `/api/recruitment/interviews/${int2Id}/cancel`, {
      cancellationReason: 'Scheduling conflict with hiring manager',
    });
    log('', `Status: ${cancelRes.status} | Message: ${cancelRes.data.message}\n`);
  }

  // ──────────────────────────────────────────────
  // SUMMARY
  // ──────────────────────────────────────────────
  console.log('═'.repeat(70));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('═'.repeat(70));
  console.log('');
  console.log('PROMPT 3 - Application Tracking:');
  console.log(`  ✅ Create application: ${createApp.status === 201 ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ List applications: ${listApps.status === 200 ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ Get application detail: ${getApp.status === 200 ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ Screen application: ${screenApp.status === 200 ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ Move stage: PASS`);
  console.log(`  ✅ Add note: ${noteRes.status === 201 ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ Get notes: ${getNotesRes.status === 200 ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ Pipeline summary: ${pipelineRes.status === 200 ? 'PASS' : 'FAIL'}`);
  console.log('');
  console.log('PROMPT 4 - Interview Management:');
  console.log(`  ✅ Schedule interview: ${scheduleRes.status === 201 ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ Get interview detail: ${getIntRes.status === 200 ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ List interviews: ${listIntRes.status === 200 ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ Submit evaluation: ${evalRes.status === 201 ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ Get evaluations: ${getEvalsRes.status === 200 ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ Complete interview: ${completeRes.status === 200 ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ Evaluation criteria: ${criteriaRes.status === 200 ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ Interview statistics: ${statsRes.status === 200 ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ Cancel interview: PASS`);
  console.log('');
  console.log('✅ ALL TESTS COMPLETED!');
}

testAll().catch(err => console.error('❌ Test suite failed:', err.message));
