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

async function main() {
  // 1. ALL EHRs
  console.log('=== ALL EHRs (Patients) ===\n');
  const ehrs = await postAQL("SELECT e/ehr_id/value, e/ehr_status/subject/external_ref/id/value FROM EHR e");
  if (!ehrs.error) {
    const rows = ehrs.rows || [];
    console.log(`Total EHRs: ${rows.length}\n`);
    rows.forEach((row, i) => {
      console.log(`${i+1}. EHR ID: ${row[0]}`);
      console.log(`   Subject: ${row[1]}`);
    });
  } else {
    console.log('Error:', ehrs.message);
  }

  // 2. Compositions count by template
  console.log('\n\n=== COMPOSITIONS BY TEMPLATE ===\n');
  const counts = await postAQL(
    "SELECT c/archetype_details/template_id/value, COUNT(c) FROM EHR e CONTAINS COMPOSITION c GROUP BY c/archetype_details/template_id/value"
  );
  if (!counts.error) {
    const rows = counts.rows || [];
    let total = 0;
    rows.forEach(row => {
      total += row[1];
      console.log(`${row[0]}: ${row[1]} compositions`);
    });
    console.log(`\nTOTAL COMPOSITIONS: ${total}`);
  } else {
    console.log('Error:', counts.message);
  }
}

main().catch(console.error);
