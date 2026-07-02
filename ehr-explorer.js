const https = require('https');

const EHRBASE_URL = 'base.tibbna.com';
const EHRBASE_USER = 'auto-speed-ranting';
const EHRBASE_PASSWORD = 'KivLWsQgN4f8aiHAvwuq';
const EHRBASE_API_KEY = 'BgMxGMZk5isfCWezE5CF';

const auth = Buffer.from(`${EHRBASE_USER}:${EHRBASE_PASSWORD}`).toString('base64');

function postAQL(query) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ q: query });
    const options = {
      hostname: EHRBASE_URL,
      port: 443,
      path: '/ehrbase/rest/openehr/v1/query/aql',
      method: 'POST',
      headers: {
        'X-API-Key': EHRBASE_API_KEY,
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
        } else {
          resolve({ error: res.statusCode, message: data.substring(0, 500) });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function fetchAPI(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: EHRBASE_URL,
      port: 443,
      path: endpoint,
      method: 'GET',
      headers: {
        'X-API-Key': EHRBASE_API_KEY,
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
        } else {
          resolve({ error: res.statusCode, message: data.substring(0, 200) });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('========================================');
  console.log('  EHRbase Database Explorer');
  console.log('========================================\n');

  const option = process.argv[2] || 'summary';

  switch(option) {
    case 'summary':
      await showSummary();
      break;
    case 'patients':
      await showPatients();
      break;
    case 'compositions':
      await showCompositions();
      break;
    case 'procedures':
      await showProcedures();
      break;
    case 'price':
      await showPriceData();
      break;
    case 'patient':
      await showPatientData(process.argv[3]);
      break;
    case 'composition':
      await showCompositionData(process.argv[3], process.argv[4]);
      break;
    default:
      console.log('Usage: node ehr-explorer.js [option]\n');
      console.log('Options:');
      console.log('  summary       - Show database summary (default)');
      console.log('  patients      - List all patients');
      console.log('  compositions  - List all compositions');
      console.log('  procedures    - Show procedure/operation data');
      console.log('  price         - Show compositions with price data');
      console.log('  patient [id]  - Show all data for a patient');
      console.log('  composition [ehrId] [uid] - Show specific composition');
  }
}

async function showSummary() {
  console.log('--- DATABASE SUMMARY ---\n');

  const ehrs = await postAQL("SELECT COUNT(e) FROM EHR e");
  const compositions = await postAQL("SELECT COUNT(c) FROM EHR e CONTAINS COMPOSITION c");
  const templates = await fetchAPI('/ehrbase/rest/openehr/v1/definition/template/adl1.4');

  console.log(`Total Patients (EHRs): ${ehrs.rows?.[0]?.[0] || 0}`);
  console.log(`Total Compositions: ${compositions.rows?.[0]?.[0] || 0}`);
  console.log(`Total Templates: ${Array.isArray(templates) ? templates.length : 0}\n`);

  if (Array.isArray(templates)) {
    console.log('Templates:');
    templates.forEach(t => {
      console.log(`  - ${t.template_id}`);
    });
  }
}

async function showPatients() {
  console.log('--- ALL PATIENTS ---\n');

  const ehrs = await postAQL(
    "SELECT e/ehr_id/value, e/ehr_status/subject/external_ref/id/value FROM EHR e ORDER BY e/ehr_id/value"
  );

  if (!ehrs.error) {
    const rows = ehrs.rows || [];
    console.log(`Total: ${rows.length}\n`);
    rows.forEach((row, i) => {
      console.log(`${i+1}. EHR: ${row[0]}`);
      console.log(`   Subject: ${row[1]}`);
    });
  } else {
    console.log('Error:', ehrs.message);
  }
}

async function showCompositions() {
  console.log('--- ALL COMPOSITIONS ---\n');

  const compositions = await postAQL(
    `SELECT c/archetype_details/template_id/value, c/uid/value, c/context/start_time/value, c/composer/name, e/ehr_id/value
     FROM EHR e CONTAINS COMPOSITION c
     ORDER BY c/context/start_time/value DESC
     LIMIT 100`
  );

  if (!compositions.error) {
    const rows = compositions.rows || [];
    console.log(`Total: ${rows.length}\n`);

    rows.forEach((row, i) => {
      console.log(`${i+1}. Template: ${row[0]}`);
      console.log(`   UID: ${row[1]}`);
      console.log(`   Date: ${row[2]}`);
      console.log(`   Composer: ${row[3]}`);
      console.log(`   EHR: ${row[4]}`);
      console.log('');
    });
  } else {
    console.log('Error:', compositions.message);
  }
}

async function showProcedures() {
  console.log('--- PROCEDURE/OPERATION DATA ---\n');

  const procedures = await postAQL(
    `SELECT e/ehr_id/value, c/uid/value, c/context/start_time/value, c/composer/name,
     d/items[at0001]/value/value as service_name,
     d/narrative/value as narrative
     FROM EHR e CONTAINS COMPOSITION c CONTAINS INSTRUCTION d[openEHR-EHR-INSTRUCTION.service_request.v1]
     ORDER BY c/context/start_time/value DESC LIMIT 50`
  );

  if (!procedures.error) {
    const rows = procedures.rows || [];
    console.log(`Found: ${rows.length} service requests\n`);

    rows.forEach((row, i) => {
      console.log(`${i+1}. EHR: ${row[0]}`);
      console.log(`   UID: ${row[1]}`);
      console.log(`   Date: ${row[2]}`);
      console.log(`   Composer: ${row[3]}`);
      console.log(`   Service: ${row[4]}`);
      console.log(`   Narrative: ${row[5]}`);
      console.log('');
    });
  } else {
    console.log('Error:', procedures.message);
    console.log('\nTrying alternative query...');
    
    const alt = await postAQL(
      `SELECT e/ehr_id/value, c/uid/value, c/context/start_time/value, c/composer/name
       FROM EHR e CONTAINS COMPOSITION c[openEHR-EHR-COMPOSITION.encounter.v1]
       WHERE c/archetype_details/template_id/value = 'template_clinical_encounter_v1'
       ORDER BY c/context/start_time/value DESC LIMIT 50`
    );
    
    if (!alt.error) {
      const rows = alt.rows || [];
      console.log(`Found ${rows.length} clinical encounters:\n`);
      rows.forEach((row, i) => {
        console.log(`${i+1}. EHR: ${row[0]} | UID: ${row[1]} | Date: ${row[2]} | By: ${row[3]}`);
      });
    }
  }
}

async function showPriceData() {
  console.log('--- COMPOSITIONS WITH PRICE DATA ---\n');

  // First get all service requests, then filter for price
  const compositions = await postAQL(
    `SELECT e/ehr_id/value, c/uid/value, c/context/start_time/value, c/composer/name,
     d/narrative/value as narrative
     FROM EHR e CONTAINS COMPOSITION c CONTAINS INSTRUCTION d[openEHR-EHR-INSTRUCTION.service_request.v1]
     ORDER BY c/context/start_time/value DESC LIMIT 100`
  );

  if (!compositions.error) {
    const rows = compositions.rows || [];
    const withPrice = rows.filter(row => row[4] && row[4].includes('Price'));
    console.log(`Found: ${withPrice.length} compositions with price data (out of ${rows.length} total)\n`);

    withPrice.forEach((row, i) => {
      console.log(`${i+1}. EHR: ${row[0]}`);
      console.log(`   UID: ${row[1]}`);
      console.log(`   Date: ${row[2]}`);
      console.log(`   Composer: ${row[3]}`);
      console.log(`   Narrative: ${row[4]}`);
      console.log('');
    });
  } else {
    console.log('Error:', compositions.message);
  }
}

async function showPatientData(ehrId) {
  if (!ehrId) {
    console.log('Please provide EHR ID: node ehr-explorer.js patient [ehrId]');
    return;
  }

  console.log(`--- PATIENT DATA: ${ehrId} ---\n`);

  const compositions = await postAQL(
    `SELECT c/archetype_details/template_id/value, c/uid/value, c/context/start_time/value, c/composer/name
     FROM EHR e[ehr_id/value='${ehrId}'] CONTAINS COMPOSITION c
     ORDER BY c/context/start_time/value DESC`
  );

  if (!compositions.error) {
    const rows = compositions.rows || [];
    console.log(`Total compositions: ${rows.length}\n`);

    rows.forEach((row, i) => {
      console.log(`${i+1}. Template: ${row[0]}`);
      console.log(`   UID: ${row[1]}`);
      console.log(`   Date: ${row[2]}`);
      console.log(`   Composer: ${row[3]}`);
      console.log('');
    });
  } else {
    console.log('Error:', compositions.message);
  }
}

async function showCompositionData(ehrId, compositionUid) {
  if (!ehrId || !compositionUid) {
    console.log('Please provide EHR ID and Composition UID:');
    console.log('node ehr-explorer.js composition [ehrId] [compositionUid]');
    return;
  }

  console.log(`--- COMPOSITION DATA ---\n`);
  console.log(`EHR: ${ehrId}`);
  console.log(`Composition: ${compositionUid}\n`);

  const composition = await fetchAPI(
    `/ehrbase/rest/openehr/v1/ehr/${ehrId}/composition/${compositionUid}?format=FLAT`
  );

  if (!composition.error) {
    console.log(JSON.stringify(composition, null, 2));
  } else {
    console.log('Error:', composition.message);
  }
}

main().catch(console.error);
