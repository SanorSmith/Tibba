const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: { rejectUnauthorized: false }
});

async function checkSpecificDrug() {
  const client = await pool.connect();
  
  try {
    const nationalCode = '15-AB0-004';
    
    console.log(`=== CHECKING DRUG: ${nationalCode} ===`);
    
    // Check national_drugs table
    const nationalDrug = await client.query(`
      SELECT * FROM national_drugs 
      WHERE national_code = $1
    `, [nationalCode]);
    
    if (nationalDrug.rows.length > 0) {
      console.log('\n📋 National Drug Record:');
      console.log(JSON.stringify(nationalDrug.rows[0], null, 2));
      
      // Check corresponding OpenEHR medication
      const openehrMed = await client.query(`
        SELECT * FROM openehr_medications 
        WHERE national_code = $1
      `, [nationalCode]);
      
      if (openehrMed.rows.length > 0) {
        console.log('\n🏥 OpenEHR Medication Record:');
        console.log(JSON.stringify(openehrMed.rows[0], null, 2));
        
        console.log(`\n🎯 OpenEHR Medication ID: ${openehrMed.rows[0].medication_id}`);
        console.log(`🎯 OpenEHR Archetype ID: ${openehrMed.rows[0].archetype_id}`);
        console.log(`🎯 OpenEHR Template ID: ${openehrMed.rows[0].template_id}`);
      } else {
        console.log('\n❌ No OpenEHR medication record found');
      }
    } else {
      console.log(`\n❌ No national drug found with code: ${nationalCode}`);
      
      // Search for similar codes
      const similar = await client.query(`
        SELECT national_code, drug_name, inn 
        FROM national_drugs 
        WHERE national_code LIKE '15-%'
        ORDER BY national_code
        LIMIT 10
      `);
      
      console.log('\n🔍 Similar drugs with 15- prefix:');
      similar.rows.forEach(drug => {
        console.log(`- ${drug.national_code}: ${drug.drug_name}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSpecificDrug();
