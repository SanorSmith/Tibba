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
  console.log('=== Checking for Digital Ocean Template ===\n');

  const templates = await fetchAPI('/ehrbase/rest/openehr/v1/definition/template/adl1.4');
  
  if (Array.isArray(templates)) {
    const doTemplates = templates.filter(t => 
      t.template_id?.toLowerCase().includes('digital') ||
      t.concept?.toLowerCase().includes('digital') ||
      t.template_id?.toLowerCase().includes('ocean')
    );
    
    if (doTemplates.length > 0) {
      console.log('Found Digital Ocean related templates:');
      doTemplates.forEach(t => {
        console.log(`  - ${t.template_id} (${t.concept})`);
      });
    } else {
      console.log('No Digital Ocean templates found.\n');
      console.log('All templates:');
      templates.forEach(t => {
        console.log(`  - ${t.template_id}`);
      });
    }
  } else {
    console.log('Error fetching templates:', templates);
  }
}

main().catch(console.error);
