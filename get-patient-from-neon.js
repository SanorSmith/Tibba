const https = require('https');

const BASE_URL = 'localhost';
const PORT = 3000;

function fetchPatients(searchTerm) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: `/api/tibbna-openehr-patients?search=${encodeURIComponent(searchTerm)}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
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
          resolve({ error: res.statusCode, message: data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const nationalId = process.argv[2] || '199001010101';
  
  console.log(`Searching for patient with National ID: ${nationalId}\n`);
  
  const result = await fetchPatients(nationalId);
  
  if (result.error) {
    console.log('Error:', result.message);
    console.log('Make sure the dev server is running on http://localhost:3000');
  } else if (result.success && result.data && result.data.length > 0) {
    const patient = result.data[0];
    console.log('Patient Found:');
    console.log('================');
    console.log(`Name (AR): ${patient.first_name_ar} ${patient.middle_name || ''} ${patient.last_name_ar}`.trim());
    console.log(`Name (EN): ${patient.first_name_en} ${patient.middle_name || ''} ${patient.last_name_en}`.trim());
    console.log(`National ID: ${patient.national_id}`);
    console.log(`Patient Number: ${patient.patient_number}`);
    console.log(`Date of Birth: ${patient.date_of_birth}`);
    console.log(`Gender: ${patient.gender}`);
    console.log(`Phone: ${patient.phone}`);
    console.log(`Email: ${patient.email}`);
  } else {
    console.log('Patient not found');
  }
}

main().catch(console.error);
