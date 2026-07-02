const https = require('https');

const EHRBASE_URL = 'https://base.tibbna.com';
const EHRBASE_USER = 'auto-speed-ranting';
const EHRBASE_PASSWORD = 'KivLWsQgN4f8aiHAvwuq';
const EHRBASE_API_KEY = 'BgMxGMZk5isfCWezE5CF';

const auth = Buffer.from(`${EHRBASE_USER}:${EHRBASE_PASSWORD}`).toString('base64');

const endpoint = process.argv[2] || '/ehrbase/rest/openehr/v1/definition/template/adl1.4';
const url = `${EHRBASE_URL}${endpoint}`;

console.log(`Fetching: ${url}\n`);

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
      try {
        const json = JSON.parse(data);
        console.log(JSON.stringify(json, null, 2));
      } catch (e) {
        console.log(data);
      }
    } else {
      console.error(`Error: ${res.statusCode} ${res.statusMessage}`);
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('Request failed:', error.message);
});

req.end();
