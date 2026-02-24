// Test EHRbase connection and fetch doctors
// Using native fetch (Node.js 18+)

const EHRBASE_URL = 'https://base.tibbna.com';
const EHRBASE_USER = 'auto-speed-ranting';
const EHRBASE_PASSWORD = 'KivLWsQgN4f8aiHAvwuq';
const EHRBASE_API_KEY = 'BgMxGMZk5isfCWezE5CF';

async function testEHRbaseConnection() {
  try {
    console.log('🔍 Testing EHRbase connection...');
    console.log(`URL: ${EHRBASE_URL}`);
    
    // Create Basic Auth header
    const authString = `${EHRBASE_USER}:${EHRBASE_PASSWORD}`;
    const base64Auth = Buffer.from(authString).toString('base64');

    // Test 1: Check if EHRbase is accessible
    console.log('\n📋 Test 1: Checking EHRbase availability...');
    const healthResponse = await fetch(`${EHRBASE_URL}/rest/openehr/v1/ehr`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${base64Auth}`,
        'Accept': 'application/json',
        'X-API-Key': EHRBASE_API_KEY,
      }
    });

    console.log(`Status: ${healthResponse.status} ${healthResponse.statusText}`);
    
    if (healthResponse.ok) {
      const data = await healthResponse.json();
      console.log('✅ EHRbase is accessible');
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await healthResponse.text();
      console.log('❌ EHRbase returned error:', errorText);
    }

    // Test 2: Try AQL query for doctors/staff
    console.log('\n📋 Test 2: Querying for doctors using AQL...');
    const aqlQuery = `
      SELECT 
        c/content[openEHR-EHR-ADMIN_ENTRY.person_data.v0]/data[at0001]/items[at0024]/value/value as name,
        c/content[openEHR-EHR-ADMIN_ENTRY.person_data.v0]/data[at0001]/items[at0025]/value/value as role,
        c/uid/value as uid
      FROM EHR e
      CONTAINS COMPOSITION c
      WHERE c/archetype_details/template_id/value = 'Staff Registration'
      AND c/content[openEHR-EHR-ADMIN_ENTRY.person_data.v0]/data[at0001]/items[at0025]/value/value = 'Doctor'
    `;

    const aqlResponse = await fetch(`${EHRBASE_URL}/rest/openehr/v1/query/aql`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${base64Auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Key': EHRBASE_API_KEY,
      },
      body: JSON.stringify({
        q: aqlQuery
      })
    });

    console.log(`AQL Query Status: ${aqlResponse.status} ${aqlResponse.statusText}`);
    
    if (aqlResponse.ok) {
      const aqlData = await aqlResponse.json();
      console.log('✅ AQL query successful');
      console.log('Doctors found:', aqlData.rows?.length || 0);
      console.log('Response:', JSON.stringify(aqlData, null, 2));
    } else {
      const errorText = await aqlResponse.text();
      console.log('❌ AQL query failed:', errorText);
    }

    // Test 3: List available templates
    console.log('\n📋 Test 3: Listing available templates...');
    const templatesResponse = await fetch(`${EHRBASE_URL}/rest/openehr/v1/definition/template/adl1.4`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${base64Auth}`,
        'Accept': 'application/json',
        'X-API-Key': EHRBASE_API_KEY,
      }
    });

    console.log(`Templates Status: ${templatesResponse.status} ${templatesResponse.statusText}`);
    
    if (templatesResponse.ok) {
      const templatesData = await templatesResponse.json();
      console.log('✅ Templates retrieved');
      console.log('Available templates:', templatesData.length || 0);
      if (templatesData.length > 0) {
        console.log('Template IDs:', templatesData.map(t => t.template_id).slice(0, 10));
      }
    } else {
      const errorText = await templatesResponse.text();
      console.log('❌ Templates query failed:', errorText);
    }

    console.log('\n✅ EHRbase connection test complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testEHRbaseConnection();
