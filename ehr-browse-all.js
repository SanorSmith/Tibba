const https = require('https');

const EHRBASE_URL = 'base.tibbna.com';
const EHRBASE_USER = 'auto-speed-ranting';
const EHRBASE_PASSWORD = 'KivLWsQgN4f8aiHAvwuq';
const EHRBASE_API_KEY = 'BgMxGMZk5isfCWezE5CF';

const auth = Buffer.from(`${EHRBASE_USER}:${EHRBASE_PASSWORD}`).toString('base64');

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
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          resolve({ error: res.statusCode, message: data.substring(0, 200) });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

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
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          resolve({ error: res.statusCode, message: data.substring(0, 500) });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('========================================');
  console.log('  OpenEHR Database Browser');
  console.log('  URL: https://base.tibbna.com');
  console.log('========================================\n');

  // 1. List all EHRs using AQL
  console.log('--- 1. ALL EHRs (Patients) ---\n');
  const ehrsResult = await postAQL("SELECT e/ehr_id/value, e/ehr_status/subject/external_ref/id/value FROM EHR e");
  
  if (ehrsResult.error) {
    console.log('Error fetching EHRs:', ehrsResult.message);
  } else {
    const rows = ehrsResult.rows || [];
    console.log(`Total EHRs (patients): ${rows.length}\n`);
    console.log('EHR ID'.padEnd(40) + 'Subject ID (Patient/National ID)');
    console.log('-'.repeat(80));
    rows.forEach(row => {
      console.log((row[0] || 'N/A').padEnd(40) + (row[1] || 'N/A'));
    });
  }

  // 2. Count compositions per template
  console.log('\n\n--- 2. COMPOSITIONS COUNT BY TEMPLATE ---\n');
  const compositionsCount = await postAQL(
    "SELECT c/archetype_details/template_id/value, COUNT(c) FROM EHR e CONTAINS COMPOSITION c GROUP BY c/archetype_details/template_id/value"
  );
  
  if (compositionsCount.error) {
    console.log('Error:', compositionsCount.message);
  } else {
    const rows = compositionsCount.rows || [];
    console.log('Template'.padEnd(50) + 'Count');
    console.log('-'.repeat(60));
    rows.forEach(row => {
      console.log((row[0] || 'Unknown').padEnd(50) + (row[1] || 0));
    });
  }

  // 3. List all compositions (latest 50)
  console.log('\n\n--- 3. ALL COMPOSITIONS (latest 50) ---\n');
  const allCompositions = await postAQL(
    "SELECT e/ehr_id/value, c/uid/value, c/archetype_details/template_id/value, c/context/start_time/value, c/composer/name FROM EHR e CONTAINS COMPOSITION c ORDER BY c/context/start_time/value DESC LIMIT 50"
  );
  
  if (allCompositions.error) {
    console.log('Error:', allCompositions.message);
  } else {
    const rows = allCompositions.rows || [];
    console.log(`Showing latest ${rows.length} compositions:\n`);
    console.log('#'.padEnd(4) + 'EHR ID'.padEnd(40) + 'Template'.padEnd(35) + 'Date'.padEnd(22) + 'Composer');
    console.log('-'.repeat(130));
    rows.forEach((row, i) => {
      const ehrId = (row[0] || '').substring(0, 36);
      const template = (row[2] || 'Unknown').substring(0, 33);
      const date = (row[3] || '').substring(0, 20);
      const composer = (row[4] || 'Unknown').substring(0, 20);
      console.log(`${(i+1).toString().padEnd(4)}${ehrId.padEnd(40)}${template.padEnd(35)}${date.padEnd(22)}${composer}`);
    });
  }

  // 4. Show procedure/operation compositions specifically
  console.log('\n\n--- 4. PROCEDURE/OPERATION DATA ---\n');
  const procedures = await postAQL(
    `SELECT e/ehr_id/value, c/uid/value, c/context/start_time/value, c/composer/name, 
     d/items[at0001]/value/value as service_name, 
     d/narrative/value as narrative
     FROM EHR e CONTAINS COMPOSITION c CONTAINS INSTRUCTION d[openEHR-EHR-INSTRUCTION.service_request.v1]
     ORDER BY c/context/start_time/value DESC LIMIT 30`
  );
  
  if (procedures.error) {
    console.log('Error fetching procedures:', procedures.message);
    
    // Try alternative query
    console.log('\nTrying alternative query...');
    const altProcedures = await postAQL(
      `SELECT e/ehr_id/value, c/uid/value, c/context/start_time/value, c/composer/name
       FROM EHR e CONTAINS COMPOSITION c[openEHR-EHR-COMPOSITION.encounter.v1]
       WHERE c/archetype_details/template_id/value = 'template_clinical_encounter_v1'
       ORDER BY c/context/start_time/value DESC LIMIT 30`
    );
    
    if (!altProcedures.error) {
      const rows = altProcedures.rows || [];
      console.log(`Found ${rows.length} clinical encounter compositions:\n`);
      rows.forEach((row, i) => {
        console.log(`${i+1}. EHR: ${row[0]} | UID: ${(row[1]||'').substring(0,40)} | Date: ${row[2]} | By: ${row[3]}`);
      });
    } else {
      console.log('Alt query error:', altProcedures.message);
    }
  } else {
    const rows = procedures.rows || [];
    console.log(`Found ${rows.length} service requests (operations/procedures):\n`);
    rows.forEach((row, i) => {
      console.log(`${i+1}. EHR: ${row[0]}`);
      console.log(`   UID: ${row[1]}`);
      console.log(`   Date: ${row[2]}`);
      console.log(`   Composer: ${row[3]}`);
      console.log(`   Service: ${row[4]}`);
      console.log(`   Narrative: ${row[5]}`);
      console.log('');
    });
  }

  // 5. Show all templates summary
  console.log('\n\n--- 5. TEMPLATES REGISTERED ---\n');
  const templates = await fetchAPI('/ehrbase/rest/openehr/v1/definition/template/adl1.4');
  if (Array.isArray(templates)) {
    console.log('Template ID'.padEnd(45) + 'Created');
    console.log('-'.repeat(75));
    templates.forEach(t => {
      console.log((t.template_id || '').padEnd(45) + (t.created_timestamp || ''));
    });
  }

  console.log('\n\n========================================');
  console.log('  Browse Complete');
  console.log('========================================');
}

main().catch(console.error);
