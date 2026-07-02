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
  // All compositions
  console.log('=== ALL COMPOSITIONS ===\n');
  const all = await postAQL(
    `SELECT c/archetype_details/template_id/value, c/uid/value, c/context/start_time/value, c/composer/name, e/ehr_id/value
     FROM EHR e CONTAINS COMPOSITION c
     ORDER BY c/context/start_time/value DESC
     LIMIT 200`
  );

  if (!all.error) {
    const rows = all.rows || [];
    console.log(`Total compositions found: ${rows.length}\n`);

    // Group by template
    const grouped = {};
    rows.forEach(row => {
      const template = row[0] || 'Unknown';
      if (!grouped[template]) grouped[template] = [];
      grouped[template].push({
        uid: row[1],
        date: row[2],
        composer: row[3],
        ehrId: row[4]
      });
    });

    // Summary
    console.log('--- SUMMARY BY TEMPLATE ---\n');
    Object.entries(grouped).forEach(([template, items]) => {
      console.log(`  ${template}: ${items.length} compositions`);
    });
    console.log(`\n  TOTAL: ${rows.length} compositions\n`);

    // Detail per template
    Object.entries(grouped).forEach(([template, items]) => {
      console.log(`\n--- ${template} (${items.length}) ---`);
      items.slice(0, 10).forEach((item, i) => {
        console.log(`  ${i+1}. Date: ${item.date} | By: ${item.composer} | EHR: ${item.ehrId}`);
      });
      if (items.length > 10) console.log(`  ... and ${items.length - 10} more`);
    });
  } else {
    console.log('Error:', all.message);
  }
}

main().catch(console.error);
