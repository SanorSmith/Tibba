const https = require('https');

const EHRBASE_URL = 'https://base.tibbna.com';
const EHRBASE_USER = 'auto-speed-ranting';
const EHRBASE_PASSWORD = 'KivLWsQgN4f8aiHAvwuq';
const EHRBASE_API_KEY = 'BgMxGMZk5isfCWezE5CF';

const auth = Buffer.from(`${EHRBASE_USER}:${EHRBASE_PASSWORD}`).toString('base64');

const templates = [
  'template_clinical_encounter_v2',
  'template_radiology_report_v1',
  'template_care_plan_v1',
  'template_laboratory_report_v2',
  'template_referral_v1',
  'template_medication_dispense_v1.opt',
  'template_medication_summary_v1',
  'template_surgical_procedure_v1',
  'template_clinical_encounter_v1',
  'clinical_encounter_v1',
  'laboratory_report_v1',
  'Insurance_Clinical_Report.v1'
];

async function fetchTemplate(templateId) {
  return new Promise((resolve, reject) => {
    const endpoint = `/ehrbase/rest/openehr/v1/definition/template/adl1.4/${templateId}`;
    const options = {
      hostname: EHRBASE_URL.replace('https://', ''),
      port: 443,
      path: endpoint,
      method: 'GET',
      headers: {
        'X-API-Key': EHRBASE_API_KEY,
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          // Count lines and size
          const lines = data.split('\n').length;
          const size = Buffer.byteLength(data, 'utf8');
          resolve({ templateId, lines, size, status: 'success' });
        } else {
          resolve({ templateId, status: 'error', statusCode: res.statusCode });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ templateId, status: 'error', error: error.message });
    });

    req.end();
  });
}

async function main() {
  console.log('Fetching OpenEHR Templates Summary...\n');
  
  const results = await Promise.all(templates.map(fetchTemplate));
  
  console.log('Template Summary:');
  console.log('=================');
  console.log('Template ID'.padEnd(40) + 'Status'.padEnd(10) + 'Lines'.padEnd(10) + 'Size');
  console.log('-'.repeat(70));
  
  results.forEach(r => {
    if (r.status === 'success') {
      console.log(r.templateId.padEnd(40) + 'OK'.padEnd(10) + r.lines.toString().padEnd(10) + formatSize(r.size));
    } else {
      console.log(r.templateId.padEnd(40) + 'ERROR'.padEnd(10) + (r.statusCode || r.error || ''));
    }
  });
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

main();
